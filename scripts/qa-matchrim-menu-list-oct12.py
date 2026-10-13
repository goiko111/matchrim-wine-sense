"""Active menu-list price/service delta; one frozen image, no remote calls or new recognition."""
import argparse
import copy
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4451')
p.add_argument('--output', type=Path, required=True)
p.add_argument('--cases', default=','.join(f'{case}-{orientation}' for case in ['recorded', 'prices', 'currencies', 'both', 'unknown', 'inferred'] for orientation in ['portrait', 'landscape']))
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1]
fixture_file = root / 'qa/fixtures/menu-food-evidence-oct8.json'
bank_file = root / 'docs/qa-evidence/matchrim-menu-comparison-2026-10-12/after/response-provenance.json'
image = root / 'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/fixtures/IMG_7547 2.jpg'
hashes = {name: hashlib.sha256(file.read_bytes()).hexdigest() for name, file in [('fixture', fixture_file), ('bank', bank_file), ('image', image)]}
assert hashes == {'fixture': 'c5cc2a486254a38155ff88b6d5dad08b2328ba053034a28e8e0ea89f244ea6e3', 'bank': 'f4f7fbbf6ce5d19868baf78ff3983f8ca585a7fb1a070ca2386175d308e19fe5', 'image': '2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194'}
recorded = json.loads(fixture_file.read_text())['cases'][0]
tiles = {call['scan_region']['id']: call['payload'] for call in recorded['calls']}
bank = json.loads(bank_file.read_text())['variants']
both = copy.deepcopy(bank['units'])
both['vinos'][1]['servicio'] = 'ambos'
both['vinos'][1]['precios'] = {'copa': tiles['full']['vinos'][5]['precios']['copa'], 'botella': tiles['bottom']['vinos'][1]['precios']['botella']}
(args.output / 'input-provenance.json').write_text(json.dumps({'scope': 'Reuse03 contracts and original recorded responses. EUR/GBP in bank are synthetic, not extracted. Amounts25/35 for manual edits already exist in recorded rows. Both contract explicitly combines recorded full:5 copa25 and bottom:1 botella25 for the same named row; this is not the actual merged replay or verified availability. No new source or model output.', 'sha256': hashes, 'recordedVersion': tiles['full'].get('scan_version'), 'caseSources': {'recorded': 'recorded full/bottom/top/right-focus', 'prices': '03:prices', 'currencies': '03:currencies', 'both': 'synthetic both contract combining recorded full:5/bottom:1 within03:units', 'unknown': '03:units Laurent Perriere Ultra', 'inferred': 'recorded merged Laurent Perriere Ultra'}, 'bothContract': both}, ensure_ascii=False, indent=2) + '\n')
results = []
lugana, barbaresco, barolo, ultra = 'Lugana Allegrini', 'Barbaresco Marchesi di Barolo', 'Barolo Marchesi di Barolo', 'Laurent Perriere Ultra'

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for case in args.cases.split(','):
            scenario, orientation = case.split('-')
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
                    payload = tiles.get(tile, {'vinos': []}) if scenario in ['recorded', 'inferred'] else both if scenario == 'both' else bank['units' if scenario == 'unknown' else scenario]
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
                data = page.evaluate('Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))')
                return {'keys': list(data), 'sha256': hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()}

            try:
                page.goto(args.url + '/escanear/carta-vinos', wait_until='networkidle')
                page.locator('input[type=file]').first.set_input_files(str(image))
                rows = page.get_by_role('button', name=re.compile(r'^Abrir vino \d+:'))
                rows.first.wait_for(timeout=45000)
                cmp = page.locator('section[aria-labelledby="wine-comparison-title"]')
                panel = page.locator('#scan-sort').locator('xpath=ancestor::div[contains(@class,"matchrim-surface")][1]')
                price_max = page.locator('#scan-max-price')
                initial_requests, initial_storage = len(requests), storage()
                original_order = cmp.get_by_role('checkbox').all_inner_texts()
                original_labels = [c.get_attribute('aria-label') for c in cmp.get_by_role('checkbox').all()]
                original_selected = [c.get_attribute('aria-label') for c in cmp.get_by_role('checkbox').all() if c.get_attribute('aria-checked') == 'true']
                base_indexes = {r.get_attribute('aria-label').split(': ', 1)[1]: r.get_attribute('aria-label').split(': ', 1)[0] for r in rows.all()}

                def choose(control, option):
                    page.locator('#' + control).click()
                    page.get_by_role('option', name=option, exact=True).click()

                def names():
                    return [r.get_attribute('aria-label').split(': ', 1)[1] for r in rows.all()]

                def enabled_order(option):
                    page.locator('#scan-sort').click()
                    enabled = page.get_by_role('option', name=option, exact=True).get_attribute('aria-disabled') != 'true'
                    page.keyboard.press('Escape')
                    return enabled

                def capture(suffix):
                    panel.scroll_into_view_if_needed()
                    page.screenshot(path=str(args.output / f'{case}-{suffix}-viewport.png'), animations='disabled')
                    heading = page.get_by_role('heading', name='Lista de la carta', exact=True)
                    if heading.count():
                        heading.locator('..').locator('..').screenshot(path=str(args.output / f'{case}-{suffix}-list.png'))

                check('Actual list route and reference count', page.url.endswith('/escanear/carta-vinos') and rows.count() == (16 if scenario in ['recorded', 'inferred'] else 4), rows.count())
                if scenario == 'recorded':
                    check('Literal duplicate/partial Ultra remains one list row', names().count(ultra) == 1)
                    check('Recorded currency stays unknown', not price_max.is_enabled() and not enabled_order('Precio menor') and not enabled_order('Precio mayor'))
                    choose('scan-service', 'Por copa')
                    check('Inferred copa availability is not admitted', ultra not in names(), names())
                    check('Copa filter does not infer EUR', not price_max.is_enabled() and not enabled_order('Precio menor'))
                    capture('copa-null')
                    choose('scan-service', 'Por botella')
                    check('Bottle filter also leaves currency unknown', not price_max.is_enabled() and not enabled_order('Precio mayor'))
                    capture('bottle-null')
                elif scenario == 'prices':
                    check('All mixed/unknown units disable monetary decisions', not price_max.is_enabled() and not enabled_order('Precio menor') and not enabled_order('Precio mayor'))
                    choose('scan-service', 'Por botella')
                    check('Bottle rows selected by actual service', set(names()) == {barbaresco, barolo}, names())
                    check('Known format prices displayed despite absent generic price', all(any(amount in r.inner_text() for r in rows.all()) for amount in ['25,00', '35,00']), rows.all_inner_texts())
                    asc = enabled_order('Precio menor')
                    desc = enabled_order('Precio mayor')
                    check('Explicit bottle price sorting enabled', asc and desc)
                    if asc:
                        choose('scan-sort', 'Precio menor')
                    check('Bottle ascending order uses25 then35', names() == [barbaresco, barolo], names())
                    if desc:
                        choose('scan-sort', 'Precio mayor')
                    check('Bottle descending order uses35 then25', names() == [barolo, barbaresco], names())
                    if price_max.is_enabled():
                        price_max.fill('30')
                    check('Bottle maximum30 retains known25 only', names() == [barbaresco], names())
                    capture('bottle-max')
                    if price_max.is_enabled():
                        price_max.fill('')
                    choose('scan-service', 'Por copa')
                    check('Copa filter does not borrow bottle price', names() == [lugana], names())
                    if price_max.is_enabled():
                        price_max.fill('12')
                    choose('scan-service', 'Copa o botella')
                    check('All resets unsupported cap rather than hiding unknown rows', rows.count() == 4 and price_max.input_value() == '' and not price_max.is_enabled(), names())
                    check('All no longer claims price sorting', page.locator('#scan-sort').inner_text() not in ['Precio menor', 'Precio mayor'])
                    capture('all-pending')
                elif scenario == 'currencies':
                    choose('scan-service', 'Por copa')
                    check('Eligible EUR copa subset can use its own currency', price_max.is_enabled() and enabled_order('Precio menor'), names())
                    if price_max.is_enabled():
                        price_max.fill('12')
                    check('Eligible copa price cap keeps12', names() == [lugana], names())
                    choose('scan-service', 'Por botella')
                    check('EUR and GBP bottle prices cannot be ordered or capped together', not price_max.is_enabled() and not enabled_order('Precio menor') and not enabled_order('Precio mayor'))
                    check('Currency change clears previous cap and restores both rows', price_max.input_value() == '' and set(names()) == {barbaresco, barolo}, names())
                    check('Both currency literals retained without conversion', any('€' in text for text in rows.all_inner_texts()) and any('GBP' in text or '£' in text for text in rows.all_inner_texts()), rows.all_inner_texts())
                    capture('bottle-currencies')
                else:
                    target = barbaresco if scenario == 'both' else ultra
                    cb = cmp.get_by_role('checkbox', name='Comparar ' + target, exact=True)
                    if cb.get_attribute('aria-checked') != 'true':
                        cb.click()
                    selected_before_price = [c.get_attribute('aria-label') for c in cmp.get_by_role('checkbox').all() if c.get_attribute('aria-checked') == 'true']
                    page.get_by_text('Ver fichas completas y acciones', exact=True).click()
                    action = page.locator('button[aria-controls^="wine-actions-"]').filter(has_text=target)
                    index = action.get_attribute('aria-controls').split('-')[-1]
                    action.click()
                    page.locator('#wine-actions-' + index).get_by_role('button', name='Editar', exact=True).click()
                    page.locator('#scan-price-' + index).fill('35' if scenario == 'both' else '25')
                    editor = page.locator('#wine-actions-' + index)
                    check('Ambiguous manual amount visibly pending format', bool(editor.get_by_text(re.compile('Precio manual pendiente de formato')).count()))
                    target_row = rows.filter(has_text=target)
                    check('List distinguishes pending manual amount from read unit price', 'Precio manual' in target_row.inner_text() and 'formato pendiente' in target_row.inner_text(), target_row.inner_text())
                    cmp.get_by_role('button', name='Servicio', exact=True).click()
                    cmp.locator('#comparison-service').click()
                    page.get_by_role('option', name='Por botella', exact=True).click()
                    headers = cmp.locator('thead th').all_inner_texts()[1:]
                    table_price = cmp.locator('tr').filter(has=page.get_by_text('Precio', exact=True)).locator('td').all_inner_texts()
                    check('Pending manual edit cannot silently use old bottle amount', table_price[headers.index(target)] == 'Sin precio', table_price)
                    check('Price edit preserves selected rows', selected_before_price == [c.get_attribute('aria-label') for c in cmp.get_by_role('checkbox').all() if c.get_attribute('aria-checked') == 'true'])
                    editor.scroll_into_view_if_needed()
                    page.screenshot(path=str(args.output / f'{case}-editor.png'), animations='disabled')
                    page.get_by_text('Ver fichas completas y acciones', exact=True).click()
                    choose('scan-service', 'Copa o botella')
                    capture('manual-pending')
                    original_labels = [c.get_attribute('aria-label') for c in cmp.get_by_role('checkbox').all()]
                    original_selected = selected_before_price
                check('Display filter/sort leaves base comparison order unchanged', original_labels == [c.get_attribute('aria-label') for c in cmp.get_by_role('checkbox').all()])
                check('Display filter/sort leaves selected references unchanged', original_selected == [c.get_attribute('aria-label') for c in cmp.get_by_role('checkbox').all() if c.get_attribute('aria-checked') == 'true'])
                check('Remaining rows preserve original indexes', all(base_indexes[r.get_attribute('aria-label').split(': ', 1)[1]] == r.get_attribute('aria-label').split(': ', 1)[0] for r in rows.all()))
                check('No fabricated list affinity or value winner', not any('≈' in r.inner_text() for r in rows.all()) and not page.get_by_role('button', name=re.compile('encaje')).filter(has_text='calidad/precio').count())
                check('No extra requests, storage/learning or database write', len(requests) == initial_requests and storage() == initial_storage and not any('/rest/v1/' in r['path'] and r['method'] in ['POST', 'PUT', 'PATCH', 'DELETE'] for r in requests))
                check('No console/runtime error', not errors and not console, {'errors': errors, 'console': console})
                geometry = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
                check('No horizontal mobile overflow', geometry['width'] == width and geometry['scroll'] <= width, geometry)
                results.append({'case': case, 'passed': not failures, 'steps': steps, 'failures': failures, 'requests': requests, 'newRequests': len(requests) - initial_requests, 'storageBefore': initial_storage, 'storageAfter': storage(), 'errors': errors, 'console': console})
            except Exception as error:
                page.screenshot(path=str(args.output / f'{case}-exception.png'))
                results.append({'case': case, 'passed': False, 'error': str(error), 'steps': steps, 'failures': failures, 'requests': requests, 'errors': errors, 'console': console})
            finally:
                context.close()
            print(case, 'PASS' if results[-1]['passed'] else 'FAIL', flush=True)
    finally:
        browser.close()
(args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'sceneCount': 1, 'newScenes': 0, 'newProviderOutputs': 0, 'paidCalls': 0, 'realAppRemoteCalls': 0, 'results': results}, ensure_ascii=False, indent=2) + '\n')
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
