"""Focused real value-panel abstention DOM check; synthetic03 prices, no positive catalog/profile."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4451')
p.add_argument('--output', type=Path, required=True)
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1]
bank = root / 'docs/qa-evidence/matchrim-menu-comparison-2026-10-12/after/response-provenance.json'
image = root / 'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/fixtures/IMG_7547 2.jpg'
assert hashlib.sha256(bank.read_bytes()).hexdigest() == 'f4f7fbbf6ce5d19868baf78ff3983f8ca585a7fb1a070ca2386175d308e19fe5'
assert hashlib.sha256(image.read_bytes()).hexdigest() == '2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194'
response = json.loads(bank.read_text())['variants']['prices']
results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for orientation, width, height in [('portrait', 393, 852), ('landscape', 852, 393)]:
        context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, service_workers='block', reduced_motion='reduce')
        context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};localStorage.setItem('matchrim.local_profile_owner.v1','anonymous');localStorage.setItem('matchrim.onboarding.v2:anonymous',JSON.stringify({version:2,result:'skipped'}));localStorage.setItem('matchrim.scan_privacy_notice.v2','accepted');")
        requests, errors = [], []
        def intercept(route):
            req = route.request
            path = urlparse(req.url).path
            if urlparse(req.url).netloc == urlparse(args.url).netloc:
                return route.continue_()
            requests.append({'method': req.method, 'path': path})
            payload = response if '/functions/v1/scan-wine-menu' in path else {'wines': []} if '/functions/v1/' in path else [] if '/rest/v1/' in path else {}
            route.fulfill(status=200, content_type='application/json', body=json.dumps(payload), headers={'Access-Control-Allow-Origin': '*'})
        context.route('**/*', intercept)
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(re.sub(r'https?://\S+', '<URL>', m.text)) if m.type == 'error' else None)
        page.goto(args.url + '/escanear/carta-vinos', wait_until='networkidle')
        page.locator('input[type=file]').first.set_input_files(str(image))
        page.get_by_role('button', name=re.compile(r'^Abrir vino \d+:')).first.wait_for(timeout=45000)
        page.locator('#scan-service').click()
        page.get_by_role('option', name='Por botella', exact=True).click()
        panel = page.get_by_text('Mejor calidad/precio para ti', exact=True).locator('..')
        panel.wait_for()
        steps = [
            {'name': 'Real value panel contains no winner button', 'passed': panel.get_by_role('button').count() == 0},
            {'name': 'Real value panel names missing affinity or comparable price', 'passed': panel.get_by_text('Falta afinidad acreditada o precio comparable por formato y moneda.', exact=True).count() == 1},
            {'name': 'No runtime/console error or database mutation', 'passed': not errors and not any('/rest/v1/' in r['path'] and r['method'] in ['POST', 'PATCH', 'PUT', 'DELETE'] for r in requests)},
        ]
        panel.screenshot(path=str(args.output / (orientation + '.png')))
        results.append({'orientation': orientation, 'passed': all(s['passed'] for s in steps), 'steps': steps, 'requests': requests, 'errors': errors})
        print(orientation, 'PASS' if results[-1]['passed'] else 'FAIL', flush=True)
        context.close()
    browser.close()
(args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'paidCalls': 0, 'realAppRemoteCalls': 0, 'results': results}, indent=2) + '\n')
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
