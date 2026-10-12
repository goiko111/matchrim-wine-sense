"""Local authenticated carta-save -> Bodega price provenance; fail-closed egress, no real account/write."""
import argparse
import base64
import copy
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4452')
p.add_argument('--output', type=Path, required=True)
p.add_argument('--cases', default=','.join(f'{case}:{orientation}' for case in ['both-wishlist', 'both-favorite', 'both-tasted', 'cup-eur', 'bottle-eur', 'bottle-gbp', 'currency-null', 'unknown', 'inferred', 'denied', 'empty', 'corrupt', 'legacy'] for orientation in ['portrait', 'landscape']))
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1]
bank_path = root / 'docs/qa-evidence/matchrim-menu-comparison-2026-10-12/after/response-provenance.json'
both_path = root / 'docs/qa-evidence/matchrim-menu-list-2026-10-12/before-complete/input-provenance.json'
fixture_path = root / 'qa/fixtures/menu-food-evidence-oct8.json'
image = root / 'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/fixtures/IMG_7547 2.jpg'
assert hashlib.sha256(bank_path.read_bytes()).hexdigest() == 'f4f7fbbf6ce5d19868baf78ff3983f8ca585a7fb1a070ca2386175d308e19fe5'
assert hashlib.sha256(fixture_path.read_bytes()).hexdigest() == 'c5cc2a486254a38155ff88b6d5dad08b2328ba053034a28e8e0ea89f244ea6e3'
assert hashlib.sha256(image.read_bytes()).hexdigest() == '2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194'
bank = json.loads(bank_path.read_text())['variants']
both = json.loads(both_path.read_text())['bothContract']
recorded = json.loads(fixture_path.read_text())['cases'][0]
tiles = {call['scan_region']['id']: call['payload'] for call in recorded['calls']}
UID = '00000000-0000-4000-8000-000000000080'
enc = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
session = {'user': {'id': UID, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa@matchrim.invalid', 'app_metadata': {'provider': 'email'}, 'user_metadata': {}}, 'access_token': enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': UID, 'exp': 1900000000}) + '.' + enc('synthetic-invalid'), 'refresh_token': 'synthetic-invalid', 'expires_at': 1900000000, 'expires_in': 86400, 'token_type': 'bearer'}
defaults = {'id': '10000000-0000-4000-8000-000000000001', 'user_id': UID, 'created_at': '2026-10-12T00:00:00Z', 'image_url': None, 'rating': None, 'personal_note': None, 'quantity': None, 'alcohol_content': None, 'consumption_date': None}
results = []
(args.output / 'input-provenance.json').write_text(json.dumps({'scope': 'One existing image/recorded and03/04 synthetic contract data. EUR/GBP/BOTH are synthetic as before, never fresh extraction. Fake local auth signature invalid, no signup/real profile/catalog-positive fixture. MemoryPOST/GET is not hosted persistence.', 'inputHashes': {str(file.relative_to(root)): hashlib.sha256(file.read_bytes()).hexdigest() for file in [bank_path, both_path, fixture_path, image]}, 'fixtureOwner': UID, 'remoteCalls': 0}, indent=2) + '\n')

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for case in args.cases.split(','):
            scenario, orientation = case.split(':')
            width, height = (393, 852) if orientation == 'portrait' else (852, 393)
            if scenario.startswith('both') or scenario in ['corrupt', 'legacy']:
                wine = copy.deepcopy(both['vinos'][1]); edit = 35
            elif scenario in ['bottle-eur', 'bottle-manual', 'denied', 'empty']:
                wine = copy.deepcopy(bank['units']['vinos'][1]); edit = 35 if scenario == 'bottle-manual' else None
            elif scenario in ['cup-eur', 'cup-manual']:
                wine = copy.deepcopy(bank['units']['vinos'][0]); edit = 15 if scenario == 'cup-manual' else None
            elif scenario == 'bottle-gbp':
                wine = copy.deepcopy(bank['currencies']['vinos'][2]); edit = None
            elif scenario == 'currency-null':
                wine = copy.deepcopy(tiles['full']['vinos'][5]); edit = None
            elif scenario == 'unknown':
                wine = copy.deepcopy(bank['units']['vinos'][3]); edit = 25
            else:
                wine = copy.deepcopy(tiles['full']['vinos'][11]); edit = 25
                wine['servicio'] = tiles['right-focus']['vinos'][1]['servicio']
                wine['precios'] = copy.deepcopy(tiles['right-focus']['vinos'][1]['precios'])
                wine['campos_inferidos'] = list(set(wine.get('campos_inferidos', []) + ['servicio']))
            action = 'favorite' if scenario == 'both-favorite' else 'tasted' if scenario == 'both-tasted' else 'wishlist'
            expected_financial = 35 if scenario == 'bottle-manual' else 25 if scenario in ['bottle-eur', 'denied', 'empty'] else None
            amount = edit if edit is not None else wine.get('precio')
            pending = edit is not None and (wine.get('servicio') not in ['copa', 'botella'] or 'servicio' in (wine.get('campos_inferidos') or []))
            expected_prices = copy.deepcopy(wine.get('precios') or {})
            if edit is not None and not pending:
                expected_prices[wine['servicio']] = edit
            memory, writes, requests, nonlocal_seen, http_fulfilled, sockets, errors, console, steps, failures = [], [], [], [], [], [], [], [], [], []
            if scenario == 'legacy':
                memory.append({**defaults, 'name': wine['nombre'], 'producer': wine.get('productor'), 'vintage': None, 'region': wine.get('region'), 'country': wine.get('pais'), 'grape_varieties': wine.get('uvas'), 'tasting_notes': None, 'status': 'wishlist', 'is_favorite': False, 'matchrim_affinity': None, 'sensory_attributes': None, 'use_for_profile_training': False, 'price': 35, 'place_details': {'source': 'menu_scanner', 'scanned_price': 35, 'scanned_currency': 'EUR'}})
            context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, reduced_motion='reduce', service_workers='block')

            def reply(route, payload, status=200):
                http_fulfilled.append(route.request.url)
                route.fulfill(status=status, content_type='application/json', body='' if status == 204 else json.dumps(payload), headers={'Access-Control-Allow-Origin': '*'})

            def intercept(route):
                req = route.request
                url = urlparse(req.url)
                if url.netloc == urlparse(args.url).netloc:
                    return route.continue_()
                requests.append({'method': req.method, 'host': url.hostname, 'path': url.path})
                if '/auth/v1/user' in url.path:
                    return reply(route, session['user'])
                if '/rest/v1/user_wines' in url.path:
                    q = parse_qs(url.query)
                    if req.method == 'POST':
                        payload = req.post_data_json
                        writes.append({'payload': payload, 'query': q, 'prefer': req.headers.get('prefer'), 'accept': req.headers.get('accept')})
                        if scenario == 'denied':
                            return reply(route, {'code': '23514', 'message': 'Synthetic check rejection'}, 400)
                        row = {**defaults, **copy.deepcopy(payload)}
                        if scenario == 'corrupt':
                            row['price'] = 35
                        memory.append(row)
                        return reply(route, None if scenario == 'empty' else row)
                    selected = [row for row in memory if q.get('user_id', ['eq.' + UID])[0] == 'eq.' + row['user_id']]
                    for field in ['status', 'is_favorite', 'rating']:
                        if field in q:
                            value = q[field][0]
                            if value == 'not.is.null': selected = [r for r in selected if r.get(field) is not None]
                            elif value.startswith('eq.'):
                                wanted = value[3:]
                                selected = [r for r in selected if str(r.get(field)).lower() == wanted.lower()]
                    if 'or' in q:
                        selected = [r for r in selected if r.get('status') == 'tasted' or r.get('rating') is not None]
                    return reply(route, selected)
                if '/functions/v1/scan-wine-menu' in url.path:
                    return reply(route, {'vinos': [wine], 'layout': 'rows', 'coverage': {'status': 'reported_complete', 'extracted_wines': 1}})
                if '/functions/v1/' in url.path:
                    return reply(route, {'wines': []})
                if '/rest/v1/quiz_results' in url.path:
                    return reply(route, None)
                return reply(route, [] if '/rest/v1/' in url.path else {})

            def ws_handler(ws):
                local = urlparse(ws.url).netloc == urlparse(args.url).netloc
                sockets.append({'host': urlparse(ws.url).hostname, 'local': local, 'blocked': not local})
                if local:
                    ws.connect_to_server()
                else:
                    ws.close(code=1008, reason='Local QA egress blocked')

            context.route('**/*', intercept)
            context.route_web_socket('**/*', ws_handler)
            context.on('request', lambda req: nonlocal_seen.append(req.url) if urlparse(req.url).netloc != urlparse(args.url).netloc else None)
            seed = {'sb-cbjynrbvrhcmpaojmqdp-auth-token': json.dumps(session), 'matchrim.local_profile_owner.v1': UID, 'matchrim.onboarding.v2:' + UID: json.dumps({'version': 2, 'result': 'skipped'}), 'matchrim.scan_privacy_notice.v2': 'accepted'}
            context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);" % json.dumps(seed))
            page = context.new_page()
            page.set_default_timeout(6000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: console.append(re.sub(r'https?://\S+', '<URL>', m.text)) if m.type == 'error' else None)

            def check(name, passed, detail=None):
                steps.append({'name': name, 'passed': bool(passed), 'detail': detail})
                if not passed: failures.append(name)

            try:
                if scenario != 'legacy':
                    page.goto(args.url + '/escanear/carta-vinos', wait_until='networkidle')
                    page.locator('input[type=file]').first.set_input_files(str(image))
                    page.get_by_role('button', name=re.compile(r'^Abrir vino \d+:')).first.wait_for(timeout=45000)
                    page.get_by_text('Ver fichas completas y acciones', exact=True).click()
                    page.locator('button[aria-controls="wine-actions-0"]').click()
                    card = page.locator('#wine-actions-0')
                    if edit is not None:
                        card.get_by_role('button', name='Editar', exact=True).click()
                        page.locator('#scan-price-0').fill(str(edit))
                    button = card.get_by_role('button', name='Añadir favorito' if action == 'favorite' else 'Lo he probado' if action == 'tasted' else 'Quiero Probar', exact=True)
                    with page.expect_response(lambda response: '/rest/v1/user_wines' in response.url and response.request.method == 'POST'):
                        button.click()
                    page.wait_for_timeout(100)
                    check('One isolated SDK insert intention', len(writes) == 1, len(writes))
                    payload = writes[0]['payload']
                    check('No ambiguous/cop/foreign/unknown amount promoted to financial scalar', payload.get('price') == expected_financial, {'actual': payload.get('price'), 'expected': expected_financial})
                    metadata = (payload.get('place_details') or {}).get('menu_price_snapshot')
                    check('Price snapshot carries origin/unit/pending and per-service raw readings', bool(metadata) and metadata.get('raw_amount') == amount and metadata.get('currency') == wine.get('moneda') and metadata.get('service') == wine.get('servicio') and metadata.get('manual_pending') == pending and metadata.get('origin') == ('manual' if edit is not None else 'scan') and metadata.get('prices', {}).get('copa') == expected_prices.get('copa') and metadata.get('prices', {}).get('botella') == expected_prices.get('botella'), metadata)
                    check('No inferred ficha/affinity/training from save intent', payload.get('sensory_attributes') is None and payload.get('matchrim_affinity') is None and payload.get('use_for_profile_training') is False, {k: payload.get(k) for k in ['sensory_attributes', 'matchrim_affinity', 'use_for_profile_training']})
                    success = card.get_by_role('button', name='Favorito' if action == 'favorite' else 'Guardado', exact=True).count()
                    if scenario in ['empty', 'corrupt', 'denied']:
                        check('Unconfirmed/rejected representation not labelled saved', success == 0)
                    else:
                        check('Confirmed representation labelled saved', success == 1)
                    if scenario in ['empty', 'corrupt']:
                        check('Ambiguous representation exposes abstention', page.get_by_text('Guardado sin confirmar', exact=False).count() > 0)
                        check('Ambiguous save blocks all immediate repeat intents', all(card.get_by_role('button', name=name, exact=True).is_disabled() for name in ['Quiero Probar', 'Lo he probado', 'Añadir favorito']))
                    card.screenshot(path=str(args.output / (case.replace(':', '-') + '-save.png')))
                section = 'favorites' if action == 'favorite' else 'tasted' if action == 'tasted' else 'wishlist'
                page.goto(args.url + '/my-wines/' + section, wait_until='networkidle')
                page.get_by_role('heading', name=re.compile('Quiero Probar|Ya Probados|Favoritos')).first.wait_for(timeout=15000)
                own_row = page.get_by_role('button', name='Eliminar ' + wine['nombre'], exact=True)
                if scenario == 'denied':
                    check('Rejected intention creates no mock row', not memory and own_row.count() == 0)
                else:
                    check('Saved intent visible in actual Bodega section without invented rating', own_row.count() == 1)
                    price_group = page.get_by_role('group', name='Precio de carta de ' + wine['nombre'], exact=True)
                    check('Bodega exposes price provenance', price_group.count() == 1)
                    if price_group.count():
                        text = price_group.inner_text()
                        check('Pending or legacy amount remains visibly unconfirmed', ('pendiente' in text.lower() or 'sin confirmar' in text.lower()) if pending or scenario == 'legacy' else True, text)
                        if wine.get('moneda') == 'GBP': check('Foreign amount retained without EUR conversion', ('GBP' in text or '£' in text) and '€' not in text, text)
                        if wine.get('moneda') is None: check('Missing currency stays pending, not EUR', 'moneda pendiente' in text and '€' not in text, text)
                        check('Price lines fit group without overlaps', price_group.evaluate('el=>{const box=el.getBoundingClientRect();const lines=[...el.querySelectorAll("p")].map(p=>p.getBoundingClientRect());return lines.every((r,i)=>r.left>=box.left&&r.right<=box.right+1&&(i===0||r.top>=lines[i-1].bottom));}'))
                        price_group.screenshot(path=str(args.output / (case.replace(':', '-') + '-read.png')))
                    if action == 'tasted':
                        check('Declared tasted is not positive feedback or profile learning', memory[0].get('rating') is None and memory[0].get('use_for_profile_training') is False and page.get_by_text('Pendiente de valoración', exact=True).count() == 1)
                    if own_row.count():
                        wine_card = own_row.locator('xpath=ancestor::div[contains(@class,"group")][1]')
                        wine_card.screenshot(path=str(args.output / (case.replace(':', '-') + '-card.png')))
                        last_action = wine_card.get_by_role('button', name='No va', exact=True)
                        last_action.scroll_into_view_if_needed()
                        last_action.evaluate('el=>el.scrollIntoView({block:"center"})')
                        check('Bottom card action reachable above native tab bar', last_action.evaluate('el=>{const r=el.getBoundingClientRect();const bar=document.querySelector(".matchrim-native-tab-bar");const top=bar?bar.getBoundingClientRect().top:innerHeight;return r.top>=0&&r.bottom<=top;}'))
                        page.screenshot(path=str(args.output / (case.replace(':', '-') + '-bottom-viewport.png')))
                check('No hosted egress: every nonlocal HTTP request intercepted', sorted(nonlocal_seen) == sorted(http_fulfilled), {'seen': len(nonlocal_seen), 'fulfilled': len(http_fulfilled), 'blockedSockets': sum(s['blocked'] for s in sockets)})
                check('No additional writes/training/events outside requested insert', not any(r['method'] in ['PATCH', 'DELETE', 'PUT'] or (r['method'] == 'POST' and r['path'].startswith('/rest/v1/') and r['path'] != '/rest/v1/user_wines') for r in requests))
                check('No app runtime error', not errors, errors)
                check('No mobile page-width overflow', page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                results.append({'case': case, 'passed': not failures, 'steps': steps, 'failures': failures, 'writes': writes, 'mockRows': memory, 'requests': requests, 'socketAudit': sockets, 'errors': errors, 'console': console})
            except Exception as error:
                page.screenshot(path=str(args.output / (case.replace(':', '-') + '-exception.png')))
                results.append({'case': case, 'passed': False, 'error': str(error), 'steps': steps, 'failures': failures, 'writes': writes, 'mockRows': memory, 'requests': requests, 'socketAudit': sockets, 'errors': errors, 'console': console})
            finally:
                context.close()
            print(case, 'PASS' if results[-1]['passed'] else 'FAIL', flush=True)
    finally:
        browser.close()
(args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'auth': 'synthetic-invalid-signature; no real signup/user', 'storage': 'discarded in-memory SDK intentions, not hosted persistence', 'realRemoteCalls': 0, 'paidCalls': 0, 'results': results}, ensure_ascii=False, indent=2) + '\n')
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
