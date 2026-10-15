"""Bounded fresh staging vision through the client, reusing authorized images, never production."""
import argparse
import base64
import hashlib
import json
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from qa_matchrim_runtime import add_browser_options, launch_browser, upload_scan_file

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', required=True)
p.add_argument('--manifest', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--cases', required=True)
p.add_argument('--limit', type=int, default=100)
p.add_argument('--continue-batches', type=int, default=0)
add_browser_options(p)
a = p.parse_args()
assert 1 <= a.limit <= 100 and 0 <= a.continue_batches <= 4
assert urlparse(a.url).hostname in {'127.0.0.1', 'localhost'}
a.output.mkdir(mode=0o700, parents=True, exist_ok=False)
manifest = json.loads(a.manifest.read_text())
selected = a.cases.split(',')
cases = [next(c for c in manifest['cases'] if c['case_id'] == sid) for sid in selected]
host = 'qpbmqvfnunkylvtvnyyx.supabase.co'
allowed = {'detect-wine-regions-qa89', 'analyze-wine-region-qa89', 'scan-food-pairing-qa89',
           'search-wines-qa84', 'search-wines-qa89', 'scan-wine-menu', 'scan-wine-menu-qa89'}
ledger, results, stopped = [], [], []


def save():
    (a.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'remote_project': host,
        'limit': a.limit, 'requests': ledger, 'stop': stopped, 'results': results,
        'canonical_precision': None, 'canonical_recall': None,
        'not_human_outcomes': True, 'production_mutated': False}, ensure_ascii=False, indent=2))


with sync_playwright() as pw:
    browser = launch_browser(pw, a)
    try:
        for case in cases:
            if stopped or len(ledger) >= a.limit:
                break
            target = a.output / case['case_id']
            target.mkdir(mode=0o700)
            source = Path(case['path'])
            sha = hashlib.sha256(source.read_bytes()).hexdigest()
            assert sha == case['sha256']
            if source.suffix.lower() in {'.heic', '.heif'}:
                converted = target / 'authorized-source.jpg'
                subprocess.run(['sips', '-s', 'format', 'jpeg', str(source), '--out', str(converted)], capture_output=True, check=True)
                source = converted
            context = browser.new_context(viewport={'width': 393, 'height': 852}, is_mobile=True, has_touch=True, service_workers='block')
            context.add_init_script("""
                window.CapacitorCustomPlatform={name:'ios'};
                localStorage.setItem('matchrim.scan_privacy_notice.v2','accepted');
                localStorage.setItem('matchrim.local_profile_owner.v1','anonymous');
                localStorage.setItem('matchrim_quiz_result',JSON.stringify({potente:4,acidez:4,dulce:1,tanico:3,afrutado:4}));
                localStorage.setItem('matchrim.onboarding.v1',JSON.stringify({version:2,result:'completed'}));
            """)
            trace, errors, seen = [], [], set()

            def intercept(route):
                req, url = route.request, urlparse(route.request.url)
                if url.netloc == urlparse(a.url).netloc:
                    return route.continue_()
                if req.method == 'OPTIONS':
                    return route.fulfill(status=200, headers={'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*'}, body='')
                endpoint = url.path.rsplit('/', 1)[-1]
                if url.hostname != host or req.method != 'POST' or endpoint not in allowed:
                    return route.abort('blockedbyclient')
                auth = req.headers.get('apikey', '')
                claims = json.loads(base64.urlsafe_b64decode(auth.split('.')[1] + '==='))
                assert claims['role'] == 'anon' and claims['ref'] == host.split('.')[0] and not claims.get('sub')
                body = req.post_data_json or {}
                key = (endpoint, body.get('region_id'), body.get('detection_tile'),
                       json.dumps(body.get('scan_region')), body.get('query'))
                if (key in seen and not endpoint.startswith('search-wines')) or stopped or len(ledger) >= a.limit:
                    return route.fulfill(status=429, json={'error': 'QA bounded stop; no remote call'})
                seen.add(key)
                entry = {'case': case['case_id'], 'function': endpoint, 'request_index': len(ledger) + 1}
                ledger.append(entry)
                save()
                start = time.monotonic()
                try:
                    response = route.fetch(timeout=130000, max_redirects=0, max_retries=0)
                except Exception as error:
                    entry.update({'status': 0, 'elapsed_ms': round((time.monotonic() - start) * 1000), 'transport_error': type(error).__name__})
                    trace.append({**entry, 'payload': {}, 'outcome': 'unknown; never counted as successful recognition'})
                    (target / 'backend-trace.json').write_text(json.dumps(trace, ensure_ascii=False, indent=2))
                    stopped.append({'case': case['case_id'], 'function': endpoint, 'cause': 'transport; outcome unknown; no retry'})
                    save()
                    return route.fulfill(status=504, json={'error': 'QA transport stop; no retry'})
                try:
                    payload = response.json()
                except Exception:
                    payload = {'error': 'non_json_upstream'}
                entry.update({'status': response.status, 'elapsed_ms': round((time.monotonic() - start) * 1000)})
                trace.append({**entry, 'request': {k: v for k, v in body.items() if k != 'image'}, 'payload': payload})
                (target / 'backend-trace.json').write_text(json.dumps(trace, ensure_ascii=False, indent=2))
                if response.status in {401, 402, 403, 429} or re.search(r'quota|credits?.*(exhaust|insufficient)|creditos.*agotados|provider_not_configured', json.dumps(payload), re.I):
                    stopped.append({'case': case['case_id'], 'status': response.status, 'function': endpoint, 'cause': 'auth/quota/provider configuration'})
                save()
                return route.fulfill(response=response)

            context.route('**/*', intercept)
            context.route_web_socket('**/*', lambda ws: ws.close(code=1008, reason='No realtime in anonymous staging benchmark'))
            page = context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            start = time.monotonic()
            row = {'case': case['case_id'], 'source_sha256': sha, 'expected_wines': case.get('expected_wines'),
                   'expected_food_terms': case.get('expected_food_terms'), 'scope': case.get('annotation_scope'), 'fresh': True}
            try:
                mode = 'label' if case['mode'] == 'etiqueta' else 'menu'
                page.goto(a.url + '/escanear/' + case['mode'], wait_until='networkidle')
                upload_scan_file(page, mode, str(source))
                deadline, batches = time.monotonic() + 300, 0
                while time.monotonic() < deadline:
                    text = page.locator('body').inner_text()
                    if stopped:
                        break
                    ready = ('Lote listo para revisar' in text or 'Vinos Detectados' in text
                             or 'Platos detectados' in text or 'platos encontrados' in text.lower()
                             or (case['mode'] == 'menu-comida' and page.get_by_role('heading', name='Resultado', exact=True).count() > 0))
                    if ready:
                        continuation = page.get_by_test_id('scan-continue-batch').get_by_role('button')
                        if mode == 'label' and continuation.count() and batches < a.continue_batches:
                            batches += 1
                            continuation.click()
                        else:
                            break
                    elif page.get_by_role('alert').count() and trace:
                        break
                    page.wait_for_timeout(350)
                row.update({'body': page.locator('body').inner_text(), 'elapsed_ms': round((time.monotonic() - start) * 1000),
                    'batches': batches, 'errors': errors, 'requests': len(trace),
                    'overflow': page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')})
                page.screenshot(path=str(target / 'portrait.png'), full_page=True)
                page.set_viewport_size({'width': 852, 'height': 393})
                page.screenshot(path=str(target / 'landscape.png'), full_page=True)
            except Exception as error:
                row['harness_error'] = str(error)
            finally:
                context.close()
            results.append(row)
            save()
            print(json.dumps({'case': row['case'], 'requests': row.get('requests'), 'elapsed_ms': row.get('elapsed_ms'), 'stop': stopped, 'harness_error': row.get('harness_error')}), flush=True)
    finally:
        browser.close()
save()
