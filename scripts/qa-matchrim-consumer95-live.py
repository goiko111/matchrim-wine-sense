"""Bounded real recognition from a local candidate; no accounts, stored sessions or mocked responses."""
import argparse
import fcntl
import hashlib
import json
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

HOST = 'cbjynrbvrhcmpaojmqdp.supabase.co'
FUNCTIONS = {'detect-wine-regions-v72', 'analyze-wine-region-v72', 'scan-wine-menu-v72', 'search-wines-v75'}
PROFILE = {'potente': 5, 'acidez': 4, 'dulce': 4, 'tanico': 5, 'afrutado': 3}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def persist(path, value):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', required=True)
    parser.add_argument('--cases', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--budget', type=int, required=True)
    parser.add_argument('--limit', type=int, default=1)
    parser.add_argument('--injected-initial-error', type=Path, help='Replay a retained initial failure, then exercise the real explicit regional retry; not a fresh full-image recognition run')
    parser.add_argument('--recovery-layout', choices=['auto', 'columns', 'rows', 'quadrants'], default='auto')
    parser.add_argument('--column-split', type=int, default=50, help='Explicit user-selected separation for unequal pages, never an automatic annotation-derived crop')
    parser.add_argument('--replay-regional-attempt', type=Path, help='Existing regional run directory: replay exactly hashed crops, then make one fresh explicit failed-region retry')
    args = parser.parse_args()
    assert urlparse(args.url).hostname in {'127.0.0.1', 'localhost'}
    assert 1 <= args.budget <= 64 and 1 <= args.limit <= 20
    assert 20 <= args.column_split <= 80
    args.output.mkdir(parents=True, exist_ok=True)
    lock = (args.output / 'run.lock').open('a')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    selection = json.loads(args.cases.read_text())
    assert selection['authorization'] == 'owner-eight-hours-2026-10-17'
    injected_error = None
    if args.injected_initial_error:
        assert args.limit == 1 and selection['cases'][0]['mode'] == 'carta-vinos'
        prior = json.loads(args.injected_initial_error.read_text())
        assert len(prior) == 1 and prior[0]['status'] == 500 and prior[0]['function'] == 'scan-wine-menu-v72'
        assert prior[0]['payload'].get('error') == 'Signal timed out.'
        injected_error = prior[0]['payload']
    regional_replay = None
    if args.replay_regional_attempt:
        assert injected_error and args.budget == 1 and args.limit == 1
        assert args.recovery_layout == 'quadrants' and args.column_split == 75
        replay_ledger_path = args.replay_regional_attempt / 'request-ledger.json'
        replay_ledger = json.loads(replay_ledger_path.read_text())
        assert replay_ledger['column_split'] == args.column_split
        assert replay_ledger['recovery_layout'] == args.recovery_layout
        replay_results = json.loads((args.replay_regional_attempt / 'run.json').read_text())['results']
        assert len(replay_results) == 1 and replay_results[0]['source_sha256'] == selection['cases'][0]['sha256']
        replay_trace_path = args.replay_regional_attempt / replay_results[0]['case'] / 'backend-trace.json'
        replay_trace = json.loads(replay_trace_path.read_text())
        assert len(replay_ledger['requests']) == len(replay_trace) == 4
        by_index = {row['index']: row for row in replay_trace}
        regional_replay = {'ledger_sha256': digest(replay_ledger_path), 'trace_sha256': digest(replay_trace_path),
                           'requests': [{**row, 'response': by_index[row['index']]} for row in replay_ledger['requests']]}
        assert sum(row['status'] == 500 for row in regional_replay['requests']) == 1
        assert sum(row['status'] == 200 for row in regional_replay['requests']) == 3
        assert all(row['function'] == 'scan-wine-menu-v72' and row['scan_region'] for row in regional_replay['requests'])
    ledger_path = args.output / 'request-ledger.json'
    ledger = json.loads(ledger_path.read_text()) if ledger_path.exists() else {
        'authorization': selection['authorization'], 'budget': args.budget,
        'selection_sha256': digest(args.cases), 'recovery_layout': args.recovery_layout, 'column_split': args.column_split, 'requests': [], 'blocked': None,
        'counting': 'Hosted Edge POST attempts, including failed requests. Internal provider fanout is not observable.',
    }
    assert ledger['budget'] == args.budget and ledger['selection_sha256'] == digest(args.cases)
    assert ledger.get('recovery_layout', 'auto') == args.recovery_layout
    assert ledger.get('column_split', 50) == args.column_split
    replay_fingerprint = {key: regional_replay[key] for key in ['ledger_sha256', 'trace_sha256']} if regional_replay else None
    assert ledger.get('regional_replay', replay_fingerprint) == replay_fingerprint
    ledger['regional_replay'] = replay_fingerprint
    assert not ledger['blocked'], 'Do not retry a provider/quota/auth stop without resolving it first'
    persist(ledger_path, ledger)
    summary = {'kind': 'captured initial and four regional responses replayed, then one fresh explicit failed-region retry' if regional_replay else 'retained initial failure replay plus real hosted regional retry' if injected_error else 'real hosted responses, no mocks', 'profile': 'synthetic anonymous profile; not a human taste study',
               'paid_edge_attempts': 0, 'public_catalog_gets': 0, 'results': []}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
        try:
            for case in selection['cases'][:args.limit]:
                if ledger['blocked'] or len(ledger['requests']) >= args.budget:
                    break
                output = args.output / case['id']
                result_path = output / 'result.json'
                if result_path.exists():
                    summary['results'].append(json.loads(result_path.read_text()))
                    continue
                output.mkdir(exist_ok=True)
                source = Path(case['path'])
                assert digest(source) == case['sha256'], 'Input changed after selection freeze'
                selected_image = source
                if source.suffix.lower() in {'.heic', '.heif'}:
                    selected_image = output / 'input-converted.jpg'
                    assert not selected_image.exists(), 'Preserve existing conversion; use a new attempt directory'
                    subprocess.run(['sips', '-s', 'format', 'jpeg', str(source), '--out', str(selected_image)], check=True, capture_output=True)
                context = browser.new_context(viewport={'width': 393, 'height': 852}, is_mobile=True,
                                              has_touch=True, reduced_motion='reduce', service_workers='block')
                context.add_init_script("""
                  window.CapacitorCustomPlatform={name:'ios'};
                  localStorage.setItem('matchrim.local_profile_owner.v1','anonymous');
                  localStorage.setItem('matchrim.onboarding.v2:anonymous',JSON.stringify({version:2,result:'skipped'}));
                  localStorage.setItem('matchrim.scan_privacy_notice.v2','accepted');
                  localStorage.setItem('matchrim_quiz_result',JSON.stringify(%s));
                """ % json.dumps(PROFILE))
                context.route_web_socket('**', lambda socket: socket.close())
                attempts, responses, catalog_reads, errors, blocked = {}, [], [], [], []
                injected = {'used': False, 'retry_clicked': False}
                replayed = []
                failed_retry = {'clicked': False}
                pending = set()
                last_response = [time.monotonic()]

                def route_request(route):
                    request, url = route.request, urlparse(route.request.url)
                    if url.netloc == urlparse(args.url).netloc:
                        return route.continue_()
                    endpoint = url.path.rsplit('/', 1)[-1]
                    if url.hostname == HOST and url.path.startswith('/functions/v1/') and endpoint in FUNCTIONS:
                        if request.method == 'OPTIONS':
                            return route.continue_()
                        if request.method == 'POST' and injected_error and not injected['used']:
                            assert endpoint == 'scan-wine-menu-v72'
                            injected['used'] = True
                            return route.fulfill(status=500, content_type='application/json', body=json.dumps(injected_error), headers={'Access-Control-Allow-Origin': '*'})
                        if request.method == 'POST' and regional_replay:
                            body = request.post_data_json or {}
                            fingerprint = hashlib.sha256(str(body.get('image', '')).encode()).hexdigest()
                            matching = [row for row in regional_replay['requests'] if row['scan_region'] == body.get('scan_region')
                                        and row['image_sha256'] == fingerprint and row['function'] == endpoint]
                            assert len(matching) == 1, 'Crop differs from the captured regional run; do not spend a call'
                            captured = matching[0]
                            if captured['index'] not in replayed:
                                replayed.append(captured['index'])
                                response = captured['response']
                                return route.fulfill(status=response['status'], content_type='application/json', body=json.dumps(response['payload']), headers={'Access-Control-Allow-Origin': '*'})
                            assert failed_retry['clicked'] and len(replayed) == 4 and captured['status'] == 500, 'Only the explicitly selected failed crop may reach the hosted backend'
                        if request.method == 'POST' and not ledger['blocked'] and len(ledger['requests']) < args.budget:
                            body = request.post_data_json or {}
                            entry = {'index': len(ledger['requests']) + 1, 'case': case['id'], 'function': endpoint,
                                     'scan_region': body.get('scan_region'),
                                     'image_sha256': hashlib.sha256(str(body.get('image', '')).encode()).hexdigest(),
                                     'started_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
                            ledger['requests'].append(entry)
                            attempts[request] = entry
                            pending.add(request)
                            persist(ledger_path, ledger)
                            return route.continue_()
                    if request.method in {'GET', 'OPTIONS'} and (
                        (url.hostname == HOST and url.path.startswith('/rest/v1/'))
                        or url.hostname == 'app.winerim.com'
                    ):
                        return route.continue_()
                    blocked.append({'method': request.method, 'host': url.hostname, 'path': url.path})
                    return route.abort()

                context.route('**/*', route_request)
                page = context.new_page()
                page.set_default_timeout(15000)
                page.on('pageerror', lambda error: errors.append(str(error)))

                def received(response):
                    request = response.request
                    url = urlparse(response.url)
                    if request in attempts:
                        try:
                            payload = response.json()
                        except Exception:
                            payload = {'non_json': True}
                        entry = attempts[request]
                        entry['status'] = response.status
                        entry['duration_ms'] = round(request.timing.get('responseEnd', -1))
                        responses.append({'index': entry['index'], 'function': entry['function'], 'status': response.status,
                                          'payload': payload, 'timing': request.timing})
                        if response.status in {401, 402, 403, 429} or re.search(r'insufficient_quota|quota_exceeded|credits? exhausted', json.dumps(payload), re.I):
                            ledger['blocked'] = {'case': case['id'], 'function': entry['function'], 'status': response.status}
                        persist(output / 'backend-trace.json', responses)
                        persist(ledger_path, ledger)
                        last_response[0] = time.monotonic()
                    elif url.hostname == 'app.winerim.com' and '/api/' in url.path:
                        try:
                            payload = response.json()
                        except Exception:
                            payload = {'non_json': True}
                        catalog_reads.append({'path': url.path, 'query': url.query, 'status': response.status, 'payload': payload})

                page.on('response', received)
                page.on('requestfinished', lambda request: pending.discard(request))
                page.on('requestfailed', lambda request: pending.discard(request))
                result = {'case': case['id'], 'mode': case['mode'], 'source_sha256': case['sha256'],
                          'selected_image_sha256': digest(selected_image), 'pre_result_scope': case['scope'],
                          'runner_sha256': digest(Path(__file__)), 'candidate_origin': args.url,
                          'runtime': 'Chrome mobile viewport with native presentation flag; actual iOS is a separate gate',
                          'injected_initial_failure': {'source_sha256': digest(args.injected_initial_error), 'real_full_image_request': False} if injected_error else None,
                          'recovery_layout': args.recovery_layout,
                          'column_split': args.column_split,
                          'regional_replay': replay_fingerprint,
                          'terminal': 'timeout', 'errors': errors}
                began = time.monotonic()
                print('RUN', case['id'], 'attempts', len(ledger['requests']), '/', args.budget, flush=True)
                try:
                    page.goto(args.url + '/escanear/' + case['mode'], wait_until='networkidle')
                    result['entry_scripts'] = page.locator('script[src]').evaluate_all('(els)=>els.map(el=>el.getAttribute("src"))')
                    page.locator('input[type=file]').nth(1 if case['mode'] == 'etiqueta' else 0).set_input_files(str(selected_image))
                    deadline = time.monotonic() + 240
                    while time.monotonic() < deadline:
                        body = page.locator('body').inner_text()
                        finished = 'Lote listo para revisar' in body or 'Lista de la carta' in body
                        failed = bool(page.get_by_test_id('scan-input-error').count()) or 'Análisis incompleto' in body or 'No ha salido un escaneo útil' in body
                        if regional_replay and len(replayed) == 4 and not failed_retry['clicked']:
                            retry_failed = page.get_by_role('button', name='Reintentar la zona pendiente', exact=True)
                            if retry_failed.is_visible():
                                page.screenshot(path=str(output / 'captured-partial-before-one-fresh-retry.png'), full_page=True)
                                result['captured_partial_body'] = body
                                failed_retry['clicked'] = True
                                retry_failed.click()
                                last_response[0] = time.monotonic()
                                continue
                        if injected['used'] and failed and not injected['retry_clicked']:
                            page.screenshot(path=str(output / 'retained-failure-before-regional-retry.png'))
                            assert 'Signal timed out' not in body and 'tardó demasiado' in body
                            if args.recovery_layout != 'auto':
                                page.get_by_label('Dividir imagen', exact=True).click()
                                page.get_by_role('option', name={'columns': 'Izquierda y derecha · dos páginas', 'rows': 'Arriba y abajo · carta larga', 'quadrants': 'Cuatro zonas · carta muy densa'}[args.recovery_layout], exact=True).click()
                            if args.column_split != 50:
                                divider = page.get_by_label('Separación entre páginas', exact=True)
                                divider.press('Home' if args.column_split <= 50 else 'End')
                                for _ in range(args.column_split - 20 if args.column_split <= 50 else 80 - args.column_split):
                                    divider.press('ArrowRight' if args.column_split <= 50 else 'ArrowLeft')
                                assert divider.input_value() == str(args.column_split)
                                page.screenshot(path=str(output / 'explicit-page-separation-before-regional-retry.png'))
                            page.get_by_role('button', name='Analizar por zonas', exact=True).click()
                            injected['retry_clicked'] = True
                            last_response[0] = time.monotonic()
                            continue
                        if ledger['blocked']:
                            result['terminal'] = 'provider_stop'
                            break
                        if responses and not pending and time.monotonic() - last_response[0] > 6 and (finished or failed):
                            result['terminal'] = 'completed' if finished else 'abstained_or_error'
                            break
                        page.wait_for_timeout(250)
                    result['latency_ms'] = round((time.monotonic() - began) * 1000)
                    result['body'] = page.locator('body').inner_text()
                    result['horizontal_overflow'] = page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
                    result['regions'] = page.locator('[data-testid^="region-outline-"]').count()
                    result['overlay_pins_or_clusters'] = page.locator('[data-testid^="region-pin-"]').count()
                    page.screenshot(path=str(output / 'scene.png'), full_page=True)
                    if case['mode'] == 'etiqueta':
                        wines = page.get_by_role('tab', name=re.compile(r'^Vinos \('))
                        if wines.count():
                            wines.click()
                        rows = page.locator('button[aria-label^="Abrir detalle de "]')
                    else:
                        rows = page.locator('button[aria-label^="Abrir vino "],button[aria-label^="Abrir estilo "]')
                    result['rows'] = rows.all_inner_texts()
                    result['row_labels'] = rows.evaluate_all('(els)=>els.map(el=>el.getAttribute("aria-label"))')
                    page.screenshot(path=str(output / 'list.png'), full_page=True)
                    if rows.count():
                        rows.first.click()
                        page.get_by_role('dialog').wait_for()
                        page.wait_for_timeout(500)
                        result['first_detail'] = page.get_by_role('dialog').inner_text()
                        page.screenshot(path=str(output / 'detail.png'))
                except Exception as error:
                    result['harness_error'] = str(error)
                    page.screenshot(path=str(output / 'failure.png'))
                finally:
                    result['edge_attempts'] = len(attempts)
                    result['injected_initial_failure_used'] = injected['used']
                    result['explicit_regional_retry_clicked'] = injected['retry_clicked']
                    result['captured_regional_indices_replayed'] = sorted(replayed)
                    result['explicit_failed_region_retry_clicked'] = failed_retry['clicked']
                    result['public_catalog_gets'] = len(catalog_reads)
                    result['blocked_outbound'] = blocked
                    persist(output / 'backend-trace.json', responses)
                    persist(output / 'public-catalog.json', catalog_reads)
                    persist(result_path, result)
                    summary['results'].append(result)
                    summary['paid_edge_attempts'] = len(ledger['requests'])
                    summary['public_catalog_gets'] = sum(row.get('public_catalog_gets', 0) for row in summary['results'])
                    persist(args.output / 'run.json', summary)
                    context.close()
                print('DONE', case['id'], result['terminal'], result['latency_ms'] if 'latency_ms' in result else 'harness error', flush=True)
                if result.get('harness_error') or ledger['blocked']:
                    break
        finally:
            browser.close()
    assert not any(row.get('harness_error') for row in summary['results']), 'Inspect retained harness error before continuing'


if __name__ == '__main__':
    main()
