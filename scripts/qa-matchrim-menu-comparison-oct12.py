"""Active wine-list comparison; recorded responses plus explicit synthetic money contracts."""
import argparse
import copy
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://127.0.0.1:4450')
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--cases', default='recorded-portrait,recorded-landscape,units-portrait,units-landscape,currencies-portrait,currencies-landscape,prices-portrait,prices-landscape')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
fixture_path = root / 'qa/fixtures/menu-food-evidence-oct8.json'
image = root / 'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/fixtures/IMG_7547 2.jpg'
fixture_hash = hashlib.sha256(fixture_path.read_bytes()).hexdigest()
image_hash = hashlib.sha256(image.read_bytes()).hexdigest()
assert fixture_hash == 'c5cc2a486254a38155ff88b6d5dad08b2328ba053034a28e8e0ea89f244ea6e3'
assert image_hash == '2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194'
recorded = json.loads(fixture_path.read_text())['cases'][0]
by_tile = {call['scan_region']['id']: call['payload'] for call in recorded['calls']}
full, bottom = by_tile['full']['vinos'], by_tile['bottom']['vinos']
rows = copy.deepcopy([full[0], bottom[1], bottom[2], full[11]])
for wine in rows:
    wine['moneda'] = 'EUR' if wine['precio'] is not None else None
units = {'vinos': rows, 'layout': 'rows', 'coverage': {'status': 'reported_complete', 'extracted_wines': 4, 'estimated_visible_wines': 4}}
currencies = copy.deepcopy(units)
currencies['vinos'][2]['moneda'] = 'GBP'
prices = copy.deepcopy(units)
for wine in prices['vinos'][1:3]:
    wine['precio'] = None
args.output.mkdir(parents=True, exist_ok=True)
(args.output / 'response-provenance.json').write_text(json.dumps({
    'scope': 'One existing image. Recorded replay is not fresh OCR. EUR/GBP assignments are synthetic contract values, never claimed extracted. No invented prices, vintages, sensory sheets or profile.',
    'imageSha256': image_hash, 'fixtureSha256': fixture_hash, 'traceSha256': recorded['trace_sha256'],
    'recordedVersion': by_tile['full'].get('scan_version'),
    'recordedReadingInstances': sum(len(call['payload']['vinos']) for call in recorded['calls']),
    'contractRowSources': ['full:0', 'bottom:1', 'bottom:2', 'full:11'],
    'variants': {'units': units, 'currencies': currencies, 'prices': prices},
}, ensure_ascii=False, indent=2) + '\n')
results = []
names = ['Lugana Allegrini', 'Barbaresco Marchesi di Barolo', 'Barolo Marchesi di Barolo', 'Laurent Perriere Ultra']

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for case in args.cases.split(','):
            variant, orientation = case.split('-')
            width, height = (393, 852) if orientation == 'portrait' else (852, 393)
            context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, reduced_motion='reduce', service_workers='block')
            context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};localStorage.setItem('matchrim.local_profile_owner.v1','anonymous');localStorage.setItem('matchrim.onboarding.v2:anonymous',JSON.stringify({version:2,result:'skipped'}));localStorage.setItem('matchrim.scan_privacy_notice.v2','accepted');")
            requests, errors, console, steps, failures = [], [], [], [], []

            def intercept(route):
                req = route.request
                parsed = urlparse(req.url)
                if parsed.netloc == urlparse(args.url).netloc:
                    return route.continue_()
                body = req.post_data_json if req.method == 'POST' else {}
                tile = body.get('scan_region', {}).get('id', 'full') if isinstance(body, dict) else None
                requests.append({'method': req.method, 'path': parsed.path, 'tile': tile})
                payload = [] if '/rest/v1/' in parsed.path else {}
                if '/functions/v1/scan-wine-menu' in parsed.path:
                    payload = by_tile.get(tile, {'vinos': []}) if variant == 'recorded' else {'units': units, 'currencies': currencies, 'prices': prices}[variant]
                elif '/functions/v1/' in parsed.path:
                    payload = {'wines': []}
                route.fulfill(status=200, content_type='application/json', body=json.dumps(payload), headers={'Access-Control-Allow-Origin': '*'})

            context.route('**/*', intercept)
            page = context.new_page()
            page.set_default_timeout(6000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: console.append(re.sub(r'https?://\S+', '<URL>', m.text)) if m.type == 'error' else None)

            def check(name, passed, detail=None):
                steps.append({'name': name, 'passed': bool(passed), 'detail': detail})
                if not passed:
                    failures.append(name)

            def storage():
                values = page.evaluate('Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))')
                return {'keys': list(values), 'sha256': hashlib.sha256(json.dumps(values, sort_keys=True).encode()).hexdigest()}

            try:
                page.goto(args.url + '/escanear/carta-vinos', wait_until='networkidle')
                page.locator('input[type=file]').first.set_input_files(str(image))
                section = page.locator('section[aria-labelledby="wine-comparison-title"]')
                section.wait_for(timeout=45000)
                page.get_by_role('button', name=re.compile(r'^Abrir vino \d+:')).first.wait_for()
                check('Actual active route', page.url.endswith('/escanear/carta-vinos'))
                check('Merged row/reference choices, not physical bottles', section.get_by_role('checkbox').count() == (16 if variant == 'recorded' else 4), section.get_by_role('checkbox').count())
                check('Literal partial/full duplicate is one Ultra reference', section.get_by_role('checkbox', name='Comparar Laurent Perriere Ultra', exact=True).count() == 1)
                initial_requests, initial_storage = len(requests), storage()

                def selected():
                    return [c.get_attribute('aria-label') for c in section.get_by_role('checkbox').all() if c.get_attribute('aria-checked') == 'true']

                def select(wanted):
                    targets = {'Comparar ' + n for n in wanted}
                    for c in section.get_by_role('checkbox').all():
                        if c.get_attribute('aria-checked') == 'true' and c.get_attribute('aria-label') not in targets:
                            c.click()
                    for name in wanted:
                        c = section.get_by_role('checkbox', name='Comparar ' + name, exact=True)
                        if c.get_attribute('aria-checked') != 'true':
                            c.click()

                def money_rows():
                    headers = section.locator('thead th').all_inner_texts()[1:]
                    def cells(title):
                        row = section.locator('tr').filter(has=page.get_by_text(title, exact=True))
                        return row.locator('td').all_inner_texts() if row.count() else []
                    return {'names': headers, 'prices': cells('Precio'), 'service': cells('Servicio'), 'affinity': cells('Afinidad'), 'confidence': cells('Confianza de identidad')}

                select(names[:2])
                check('Select two menu references', len(selected()) == 2, selected())
                check('No unverified affinity', money_rows()['affinity'] == ['-', '-'])
                check('No inferred numeric sensory sheet in comparator', not section.get_by_text('Cuerpo', exact=True).count())
                section.scroll_into_view_if_needed()
                page.screenshot(path=str(args.output / (case + '-viewport.png')), animations='disabled')
                select(names)
                check('Select four complete/partial references', len(selected()) == 4, selected())
                select(names[1:3])
                check('Removal and reselection', len(selected()) == 2, selected())
                select(names)
                section.get_by_role('button', name='Servicio', exact=True).click()
                section.get_by_role('button', name='Para mí', exact=True).click()
                check('Real mode transition preserves selected rows', len(selected()) == 4)
                section.get_by_role('button', name='Servicio', exact=True).click()
                budget = section.locator('#comparison-budget')
                if variant == 'recorded':
                    check('No implicit currency inferred from Spanish menu', not budget.is_enabled())
                    check('Source numbers remain currency-pending', all('moneda pendiente' in x or x == 'Sin precio' for x in money_rows()['prices']), money_rows())
                    data = money_rows()
                    check('Inferred service does not become confirmed availability', data['service'][data['names'].index(names[3])] == 'Sin confirmar', data)
                if variant in ['units', 'prices']:
                    check('Mixed/unknown units cannot verify one generic budget', not budget.is_enabled(), money_rows())
                    if budget.is_enabled():
                        budget.fill('15')
                    section.locator('#comparison-priority').click()
                    check('Value cannot be claimed without affinity and common unit', page.get_by_role('option', name='Mejor valor', exact=True).get_attribute('aria-disabled') == 'true')
                    page.keyboard.press('Escape')
                if variant in ['units', 'currencies', 'prices']:
                    section.locator('#comparison-service').click()
                    page.get_by_role('option', name='Por botella', exact=True).click()
                    if variant == 'currencies':
                        select(names[1:3])
                        check('Distinct currencies disable budget, no conversion', not budget.is_enabled(), money_rows())
                        section.locator('#comparison-priority').click()
                        check('Distinct currencies disable value ordering', page.get_by_role('option', name='Mejor valor', exact=True).get_attribute('aria-disabled') == 'true')
                        page.keyboard.press('Escape')
                        check('Both currency literals retained', any('€' in x for x in money_rows()['prices']) and any('GBP' in x or '£' in x for x in money_rows()['prices']), money_rows())
                    else:
                        if variant == 'prices':
                            select(names[1:3])
                            check('Per-bottle prices survive absent generic price', budget.is_enabled(), money_rows())
                            select(names)
                        check('Explicit bottle budget uses bottle prices only', budget.is_enabled())
                        budget.fill('30')
                        bottle = money_rows()
                        check('Glass price not relabelled as bottle', bottle['prices'][bottle['names'].index(names[0])] == 'Sin precio', bottle)
                        section.locator('#comparison-service').click()
                        page.get_by_role('option', name='Por copa', exact=True).click()
                        glass = money_rows()
                        check('Bottle price not relabelled as glass', glass['prices'][glass['names'].index(names[1])] == 'Sin precio', glass)
                        check('Unknown service/price remains unknown', glass['prices'][glass['names'].index(names[3])] == 'Sin precio' and glass['service'][glass['names'].index(names[3])] == 'Sin confirmar', glass)
                select(names)
                section.screenshot(path=str(args.output / (case + '-money.png')))
                summary = page.get_by_text('Ver fichas completas y acciones', exact=True)
                summary.click()
                action = page.locator('button[aria-controls^="wine-actions-"]').filter(has_text=names[2])
                index = action.get_attribute('aria-controls').split('-')[-1]
                action.click()
                page.locator('#wine-actions-' + index).get_by_role('button', name='Editar', exact=True).click()
                page.locator('#scan-name-' + index).fill('Barolo')
                check('Edited identity stays selected', len(selected()) == 4 and 'Comparar Barolo' in selected(), selected())
                corrected = section.get_by_role('checkbox', name='Comparar Barolo', exact=True)
                check('Edited identity no longer borrows old confirmation', bool(corrected.get_attribute('aria-describedby')))
                corrected_data = money_rows()
                corrected_index = corrected_data['names'].index('Barolo') if 'Barolo' in corrected_data['names'] else None
                check('Edited identity does not inherit model confidence', corrected_index is not None and corrected_data['confidence'][corrected_index] == '-', corrected_data)
                check('Edited identity has no affinity', all(v == '-' for v in corrected_data['affinity']))
                summary.click()
                check('Editor/list return keeps selection', len(selected()) == 4)
                check('Comparison/edit sends no new requests', len(requests) == initial_requests)
                check('Comparison/edit changes no storage or learning keys', storage() == initial_storage)
                check('No database mutations', not any('/rest/v1/' in r['path'] and r['method'] in ['POST', 'PUT', 'PATCH', 'DELETE'] for r in requests))
                geometry = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
                check('No mobile horizontal expansion', geometry['width'] == width and geometry['scroll'] <= width, geometry)
                check('No console or runtime errors', not errors and not console, {'errors': errors, 'console': console})
                section.screenshot(path=str(args.output / (case + '-corrected.png')))
                results.append({'case': case, 'passed': not failures, 'steps': steps, 'failures': failures, 'requests': requests, 'comparisonNewRequests': len(requests) - initial_requests, 'storageBefore': initial_storage, 'storageAfter': storage(), 'errors': errors, 'console': console})
            except Exception as error:
                page.screenshot(path=str(args.output / (case + '-exception.png')))
                results.append({'case': case, 'passed': False, 'error': str(error), 'steps': steps, 'failures': failures, 'requests': requests, 'errors': errors, 'console': console})
            finally:
                context.close()
            print(case, 'PASS' if results[-1]['passed'] else 'FAIL', flush=True)
    finally:
        browser.close()
(args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'realPhotographedScenes': 1, 'recordedReplayVariants': 1, 'syntheticContractVariants': 3, 'paidCalls': 0, 'realAppRemoteCalls': 0, 'results': results}, ensure_ascii=False, indent=2) + '\n')
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
