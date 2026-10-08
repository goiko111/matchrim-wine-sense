"""Bounded, resumable production recognition through the local candidate UI."""
import argparse
import fcntl
import hashlib
import importlib.util
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
HOST = 'cbjynrbvrhcmpaojmqdp.supabase.co'
FUNCTIONS = {'detect-wine-regions-v72', 'analyze-wine-region-v72', 'scan-wine-menu-v72',
             'calculate-wine-affinity-v73', 'search-wines-v75', 'scan-food-pairing'}


def load_legacy():
    spec = importlib.util.spec_from_file_location('real_e2e', ROOT / 'scripts/qa-matchrim-real-e2e.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def atomic_json(path, value):
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')
    temp.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pack', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--url', default='http://127.0.0.1:4428')
    parser.add_argument('--canary', action='store_true')
    parser.add_argument('--prioritize-originals', action='store_true')
    parser.add_argument('--authorize-300-additional', action='store_true')
    args = parser.parse_args()
    assert urlparse(args.url).hostname in {'127.0.0.1', 'localhost'}
    args.output.mkdir(parents=True, exist_ok=True)
    lock = (args.output / 'run.lock').open('a')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    ledger_path = args.output / 'request-ledger.json'
    if not ledger_path.exists():
        if not args.authorize_300_additional:
            raise SystemExit('Explicit additional-budget authorization is required')
        atomic_json(ledger_path, {'authorized_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'authorization': 'Owner: adelante, hazlo, approving up to300 additional calls',
            'prior_requests': 289, 'prior_budget': 300, 'additional_limit': 300,
            'requests': [], 'blocked': None, 'counting': 'Edge POST requests including catalog/retries; internal provider fanout is not observable'})
    ledger = json.loads(ledger_path.read_text())
    if ledger['blocked']:
        raise SystemExit('Provider stop gate: ' + str(ledger['blocked']))
    pack = json.loads(args.pack.read_text())
    scenes = pack['scenes']
    legacy = load_legacy()
    cases = []
    canary_ids = ['commons-131626296', 'commons-171025734', 'commons-7478133']
    ordered = sorted(scenes, key=lambda s: (canary_ids.index(s['id']) if s['id'] in canary_ids else 10, s['id']))
    for scene in ordered:
        if args.canary and scene['id'] not in canary_ids:
            continue
        for mode in scene['modes']:
            if args.canary and mode != scene['modes'][0]:
                continue
            cases.append({**scene, 'mode': mode, 'case_id': scene['id'] + '-' + mode})
    if not args.canary:
        for fixture in legacy.FIXTURES:
            cases.append({**fixture, 'path': str(fixture['source']), 'case_id': fixture['id'] + '-' + fixture['mode'],
                          'annotation_scope': 'legacy_reference_names' if fixture['mode'] == 'carta-vinos' else 'structural'})
    if args.prioritize_originals:
        cases.sort(key=lambda c: (0 if c['case_id'].startswith('img_') else 1 if c['case_id'].startswith('multibottle-fridge') else 2))
    # Preserve historical results, but prevent new provider processing of the
    # attribution exception discovered during the first authorized batch.
    if any(c['id'] == 'commons-355816' and
           not (args.output / c['case_id'] / 'result.json').exists() for c in cases):
        raise SystemExit('Exclude commons-355816 from remote packs pending attribution review')
    results = []
    summary_path = args.output / 'run.json'

    def save():
        atomic_json(summary_path, {'candidate': 77, 'recognition': 'real production responses; no mocks',
            'profile': 'synthetic anonymous palate, not human feedback', 'selected': len(cases),
            'completed': len(results), 'requests': len(ledger['requests']), 'limit': 300,
            'provider_blocked': ledger['blocked'], 'results': results})

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
        try:
            for case in cases:
                target = args.output / case['case_id']
                result_path = target / 'result.json'
                if result_path.exists():
                    results.append(json.loads(result_path.read_text()))
                    save()
                    continue
                if len(ledger['requests']) >= 300 or ledger['blocked']:
                    break
                target.mkdir(exist_ok=True)
                source = Path(case['path'])
                digest = hashlib.sha256(source.read_bytes()).hexdigest()
                if case.get('sha256') and digest != case['sha256']:
                    raise ValueError('Source checksum changed: ' + case['id'])
                if source.suffix.lower() in {'.heic', '.heif'}:
                    legacy.ARTIFACTS = target
                    source = legacy.materialize_fixture({**case, 'source': source})
                context = browser.new_context(viewport={'width': 393, 'height': 852}, is_mobile=True, has_touch=True)
                calls, errors, failures, pending = [], [], [], set()
                last_response = [time.monotonic()]

                def route_request(route):
                    request = route.request
                    url = urlparse(request.url)
                    if url.netloc == urlparse(args.url).netloc:
                        return route.continue_()
                    endpoint = url.path.split('/functions/v1/')[-1]
                    if url.hostname == HOST and endpoint in FUNCTIONS:
                        if request.method == 'OPTIONS':
                            return route.continue_()
                        if request.method != 'POST' or ledger['blocked'] or len(ledger['requests']) >= 300:
                            return route.abort()
                        ledger['requests'].append({'index': len(ledger['requests']) + 1, 'case': case['case_id'],
                            'function': endpoint, 'started_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())})
                        atomic_json(ledger_path, ledger)
                        pending.add(request)
                        return route.continue_()
                    if url.hostname == HOST and request.method == 'GET' and url.path.startswith('/rest/v1/'):
                        return route.continue_()
                    return route.abort()

                context.route('**/*', route_request)
                page = context.new_page()

                def capture(response):
                    request = response.request
                    if request not in pending:
                        return
                    try:
                        payload = response.json()
                    except Exception as error:
                        payload = {'parse_error': str(error)}
                    body = request.post_data_json or {}
                    raw_image = body.get('image')
                    body = {k: v for k, v in body.items() if k != 'image'}
                    if isinstance(raw_image, str):
                        body['image_sha256'] = hashlib.sha256(raw_image.encode()).hexdigest()
                        body['image_bytes'] = len(raw_image)
                    deployed = urlparse(response.url).path.rsplit('/', 1)[-1]
                    calls.append({'function': re.sub(r'-v\d+$', '', deployed), 'deployed_function': deployed,
                        'status': response.status, 'region_id': body.get('region_id'),
                        'request_payload': body, 'payload': payload, 'timing': request.timing})
                    atomic_json(target / 'backend-trace.json', calls)
                    last_response[0] = time.monotonic()
                    if response.status in {401, 402, 403, 429}:
                        ledger['blocked'] = {'status': response.status, 'function': deployed, 'case': case['case_id']}
                        atomic_json(ledger_path, ledger)

                page.on('response', capture)
                page.on('requestfinished', lambda request: pending.discard(request))
                def failed(request):
                    pending.discard(request)
                    failures.append({'url': request.url.split('?')[0], 'failure': request.failure})
                page.on('requestfailed', failed)
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
                context.add_init_script("""
                  window.CapacitorCustomPlatform={name:'ios'};
                  localStorage.setItem('matchrim.onboarding.v1',JSON.stringify({version:2,result:'completed'}));
                  localStorage.setItem('matchrim.local_profile_owner.v1','anonymous');
                  localStorage.setItem('matchrim_quiz_result',JSON.stringify({potente:4,acidez:4,dulce:1,tanico:3,afrutado:4}));
                  localStorage.setItem('matchrim.scan_privacy_notice.v2','accepted');
                """)
                started = time.monotonic()
                result = {'case': case['case_id'], 'source_sha256': digest, 'mode': case['mode'],
                    'annotation_scope': case.get('annotation_scope', 'structural_or_negative'),
                    'expectation': case.get('expectation', 'legacy'), 'expected_wines': case.get('expected_wines'),
                    'expected_food_terms': case.get('expected_food_terms'), 'terminal': 'timeout', 'status': 'REVIEW'}
                print('RUN', case['case_id'], 'budget', len(ledger['requests']), flush=True)
                try:
                    page.goto(args.url + '/escanear/' + case['mode'], wait_until='networkidle')
                    page.locator('input[type=file]').nth(1 if case['mode'] == 'etiqueta' else 0).set_input_files(str(source))
                    deadline = time.monotonic() + 240
                    while time.monotonic() < deadline:
                        text = page.locator('body').inner_text()
                        completed = ('Lote listo para revisar' in text or 'Lista de la carta' in text or
                            (case['mode'] in {'menu-comida', 'plato'} and page.get_by_role('heading', name='Resultado', exact=True).count()))
                        folded = legacy.normalize_name(text)
                        abstained = 'no ha salido un escaneo' in folded or 'analisis incompleto' in folded
                        if ledger['blocked']:
                            result['terminal'] = 'provider_blocked'
                            break
                        if calls and not pending and time.monotonic() - last_response[0] > 4:
                            if completed or abstained or any(c['status'] >= 400 for c in calls) or page.get_by_role('alert').count():
                                result['terminal'] = 'completed' if completed else 'abstained' if abstained else 'error'
                                break
                        page.wait_for_timeout(500)
                    result['latency_ms'] = round((time.monotonic() - started) * 1000)
                    result['body'] = page.locator('body').inner_text()
                    result['horizontal_overflow'] = page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2')
                    page.screenshot(path=str(target / 'scene.png'), full_page=True)
                    if case['mode'] == 'etiqueta':
                        result['regions'] = page.locator('[data-testid^="region-outline-"]').count()
                        tab = page.get_by_role('tab', name=re.compile(r'^Vinos \('))
                        if tab.count():
                            tab.click()
                        rows = page.locator('button[aria-label^="Abrir detalle de "]')
                    else:
                        rows = page.locator('button[aria-label^="Abrir vino "]')
                    result['ui_rows'] = rows.all_inner_texts()
                    result['ui_labels'] = rows.evaluate_all('rows=>rows.map(row=>row.getAttribute("aria-label"))')
                    page.screenshot(path=str(target / 'results.png'), full_page=True)
                    if rows.count():
                        rows.first.click()
                        page.wait_for_timeout(300)
                        result['first_detail'] = page.locator('body').inner_text()
                        page.screenshot(path=str(target / 'detail.png'))
                    result['backend'] = legacy.compact_backend_observation(calls) if case['mode'] in {'etiqueta', 'carta-vinos'} else None
                    result['function_calls'] = len(calls)
                except Exception as error:
                    result['harness_error'] = str(error)
                    result['status'] = 'HARNESS_ERROR'
                finally:
                    result['errors'] = errors
                    result['network_failures'] = failures
                    atomic_json(target / 'backend-trace.json', calls)
                    atomic_json(result_path, result)
                    context.close()
                results.append(result)
                save()
                print('DONE', case['case_id'], result['terminal'], 'calls', len(ledger['requests']), flush=True)
                if result.get('harness_error'):
                    break
        finally:
            browser.close()
            save()


if __name__ == '__main__':
    main()
