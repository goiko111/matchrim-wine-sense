"""Visible local menu price review. Frozen synthetic wine contracts on public food pixels; no recognition claim."""
import argparse
import base64
import copy
import hashlib
import json
import re
import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4475')
p.add_argument('--output', type=Path, required=True)
p.add_argument('--stage', choices=['before', 'after'], required=True)
p.add_argument('--cases', default='both-bottle:portrait,both-cup:landscape,currency:portrait,zero:portrait,comma:portrait,invalid:portrait,cancel:portrait,unknown:portrait,inferred:portrait,saved:portrait')
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1]
bank_path = root / 'docs/qa-evidence/matchrim-menu-comparison-2026-10-12/after/response-provenance.json'
image = root / 'qa-fixtures/food-menu/commons-restaurant-menu-2026-08-25-2000.jpg'
assert hashlib.sha256(bank_path.read_bytes()).hexdigest() == 'f4f7fbbf6ce5d19868baf78ff3983f8ca585a7fb1a070ca2386175d308e19fe5'
assert hashlib.sha256(image.read_bytes()).hexdigest() == '9980c5e6b9d5e52f1783e2f26d1a97e22c0c2e1556e9e72919dd26fc34ece9a9'
bank = json.loads(bank_path.read_text())['variants']
UID = '00000000-0000-4000-8000-000000000080'
enc = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
session = {'user': {'id': UID, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa@matchrim.invalid', 'app_metadata': {'provider': 'email'}, 'user_metadata': {}}, 'access_token': enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': UID, 'exp': 1900000000}) + '.' + enc('synthetic-invalid'), 'refresh_token': 'synthetic-invalid', 'expires_at': 1900000000, 'expires_in': 86400, 'token_type': 'bearer'}
results = []
source_paths = ['src/components/wine-import/WineMenuScanner.tsx', 'src/components/wine-import/MenuPriceEditor.tsx', 'src/utils/menuPriceReview.ts', 'src/utils/menuWineSave.ts', 'src/utils/scanWineEvidence.ts', 'src/utils/wineMenuScan.ts', 'scripts/qa-matchrim-menu-price-resolution-oct13.py']
source_hashes = {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in source_paths if (root / name).exists()}
started = time.perf_counter()

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for case in args.cases.split(','):
        scenario, orientation = case.split(':')
        width, height = (393, 852) if orientation == 'portrait' else (852, 393) if orientation == 'landscape' else (320, 740)
        wine = copy.deepcopy(bank['units']['vinos'][1])
        wine.update(servicio='ambos', precios={'copa': 12, 'botella': 25, 'llevar': None}, precio=25)
        if scenario == 'unknown': wine['servicio'] = None
        if scenario == 'inferred': wine['campos_inferidos'] = ['servicio', 'precios', 'moneda']
        if scenario == 'bottle-eur': wine.update(servicio='botella', precios={'copa': None, 'botella': 25, 'llevar': None})
        if scenario in ['cup-eur', 'service-conflict']: wine.update(servicio='copa', precio=12, precios={'copa': 12, 'botella': None, 'llevar': None})
        if scenario == 'forged': wine.update(precio_origen='manual', precio_manual_pendiente=False, precio_manual_asignacion={'format': 'botella', 'amount': 25, 'currency': 'EUR', 'prices': {'copa': None, 'botella': 25}, 'original': {'amount': 25, 'raw_currency': 'EUR', 'currency': 'EUR', 'prices': {'copa': 12, 'botella': 25, 'llevar': None}, 'origin': 'scan', 'inferred': False}})
        second = copy.deepcopy(bank['units']['vinos'][2])
        second.update(servicio='ambos', precios={'copa': 15, 'botella': 35, 'llevar': None})
        scan_wines = [wine, second] if scenario in ['compare', 'multi-format'] else [wine]
        target_format = 'copa' if scenario in ['both-cup', 'cup-eur'] else 'botella'
        target_currency = 'GBP' if scenario == 'currency' else 'EUR'
        target_amount = 0 if scenario == 'zero' else 35.5 if scenario == 'comma' else 15 if scenario in ['both-cup', 'cup-eur'] else 35
        rows, writes, requests, fulfilled, seen, sockets, errors, console, steps = [], [], [], [], [], [], [], [], []
        context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, reduced_motion='reduce', service_workers='block')
        def reply(route, data, status=200):
            fulfilled.append(route.request.url)
            route.fulfill(status=status, content_type='application/json', body=json.dumps(data), headers={'Access-Control-Allow-Origin': '*'})
        def intercept(route):
            req, url = route.request, urlparse(route.request.url)
            if url.netloc == urlparse(args.url).netloc: return route.continue_()
            requests.append({'method': req.method, 'path': url.path})
            if '/auth/v1/user' in url.path: return reply(route, session['user'])
            if '/rest/v1/user_wines' in url.path:
                if req.method == 'POST':
                    payload = req.post_data_json
                    writes.append(copy.deepcopy(payload))
                    row = {'id': '10000000-0000-4000-8000-000000000001', 'created_at': '2026-10-13T09:13:57Z', 'rating': None, 'quantity': None, 'personal_note': None, 'image_url': None, **copy.deepcopy(payload)}
                    rows.append(row)
                    return reply(route, None if scenario == 'unconfirmed' else row)
                if req.method != 'GET': return reply(route, {'message': 'Unexpected local write blocked'}, 400)
                q = parse_qs(url.query)
                selected = [r for r in rows if q.get('user_id', ['eq.' + UID])[0] == 'eq.' + r['user_id']]
                if 'status' in q: selected = [r for r in selected if 'eq.' + r['status'] == q['status'][0]]
                return reply(route, selected)
            if '/functions/v1/scan-wine-menu' in url.path: return reply(route, {'vinos': scan_wines, 'layout': 'rows', 'coverage': {'status': 'reported_complete', 'extracted_wines': len(scan_wines)}})
            if '/functions/v1/' in url.path: return reply(route, {'wines': []})
            if '/rest/v1/quiz_results' in url.path: return reply(route, None)
            return reply(route, [] if '/rest/v1/' in url.path else {})
        def ws_handler(ws):
            local = urlparse(ws.url).netloc == urlparse(args.url).netloc
            sockets.append({'local': local, 'blocked': not local})
            if local: ws.connect_to_server()
            else: ws.close(code=1008, reason='QA egress blocked')
        context.route('**/*', intercept)
        context.route_web_socket('**/*', ws_handler)
        context.on('request', lambda req: seen.append(req.url) if urlparse(req.url).netloc != urlparse(args.url).netloc else None)
        seed = {'sb-cbjynrbvrhcmpaojmqdp-auth-token': json.dumps(session), 'matchrim.local_profile_owner.v1': UID, 'matchrim.onboarding.v2:' + UID: json.dumps({'version': 2, 'result': 'skipped'}), 'matchrim.scan_privacy_notice.v2': 'accepted'}
        context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);" % json.dumps(seed))
        page = context.new_page()
        page.set_default_timeout(7000)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: console.append(re.sub(r'https?://\S+', '<URL>', m.text)) if m.type == 'error' else None)
        def check(name, passed, actual=None, expected=None): steps.append({'name': name, 'passed': bool(passed), 'actual': actual, 'expected': expected})
        try:
            page.goto(args.url + '/escanear/carta-vinos', wait_until='networkidle')
            with page.expect_file_chooser() as chooser: page.get_by_role('button', name='Subir archivo', exact=True).click()
            chooser.value.set_files(str(image))
            page.get_by_role('button', name=re.compile(r'^Abrir vino \d+:')).first.wait_for(timeout=45000)
            if scenario == 'zoom': page.add_style_tag(content='html { font-size: 32px !important; }')
            page.get_by_text('Ver fichas completas y acciones', exact=True).click()
            page.locator('button[aria-controls="wine-actions-0"]').click()
            card = page.locator('#wine-actions-0')
            if scenario in ['saved', 'unconfirmed']:
                card.get_by_role('button', name='Quiero Probar', exact=True).click()
                if scenario == 'saved': card.get_by_role('button', name='Guardado', exact=True).wait_for()
                else: page.get_by_text('Guardado sin confirmar', exact=False).first.wait_for()
            card.get_by_role('button', name='Editar', exact=True).click()
            amount_input = page.locator('#scan-price-0')
            if scenario not in ['saved', 'unconfirmed']: amount_input.fill('35,50' if scenario == 'comma' else str(target_amount))
            if args.stage == 'before':
                check('Explicit format and apply controls exist', page.locator('#scan-price-format-0').count() == 1 and card.get_by_role('button', name='Aplicar precio', exact=True).count() == 1)
                check('Decimal and zero edit retain entered amount', amount_input.input_value() == ('35,50' if scenario == 'comma' else str(target_amount)), amount_input.input_value())
                card.screenshot(path=str(args.output / (case.replace(':', '-') + '-editor.png')))
            else:
                editor = card.get_by_role('group', name='Revisar precio de carta', exact=True)
                if scenario == 'keyboard':
                    amount_input.click()
                    page.keyboard.press('Tab')
                    check('Keyboard reaches labelled format trigger', page.locator('#scan-price-format-0').evaluate('el=>el===document.activeElement'))
                    page.keyboard.press('Space')
                    page.get_by_role('option', name='Botella', exact=True).wait_for()
                    page.wait_for_function('document.activeElement?.getAttribute("role") === "option"')
                    page.keyboard.press('End')
                    page.wait_for_function('document.activeElement?.getAttribute("role") === "option" && document.activeElement.textContent.includes("Botella")')
                    page.keyboard.press('Enter')
                    page.locator('#scan-price-format-0').get_by_text('Botella', exact=True).wait_for()
                    check('Keyboard selects bottle without touching hidden state', 'Botella' in page.locator('#scan-price-format-0').inner_text())
                    page.wait_for_function('document.activeElement?.id === "scan-price-format-0" && !document.querySelector("[role=option]")')
                    page.keyboard.press('Tab')
                    page.wait_for_function('document.activeElement?.id === "scan-currency-0"')
                    check('Keyboard reaches labelled currency trigger', page.locator('#scan-currency-0').evaluate('el=>el===document.activeElement'))
                if scenario in ['saved', 'unconfirmed']:
                    check('Stored pricing is not silently editable', amount_input.is_disabled() and editor.get_by_role('button', name='Aplicar precio', exact=True).is_disabled())
                    check('No extra insert or update after saved price review', len(writes) == 1 and not any(r['method'] == 'PATCH' for r in requests))
                else:
                    page.locator('#scan-price-format-0').click()
                    page.get_by_role('option', name='Copa' if target_format == 'copa' else 'Botella', exact=True).click()
                    page.locator('#scan-currency-0').click()
                    page.get_by_role('option', name=target_currency, exact=True).click()
                    apply = editor.get_by_role('button', name='Aplicar precio', exact=True)
                    if scenario == 'missing':
                        page.locator('#scan-currency-0').click()
                        page.get_by_role('option', name='Sin confirmar', exact=True).click()
                        check('Unconfirmed currency blocks apply without default EUR', apply.is_disabled())
                        page.locator('#scan-currency-0').click()
                        page.get_by_role('option', name='EUR', exact=True).click()
                        page.locator('#scan-price-format-0').click()
                        page.get_by_role('option', name='Sin confirmar', exact=True).click()
                        check('Unconfirmed unit blocks apply without guessing bottle', apply.is_disabled())
                        page.locator('#scan-price-format-0').click()
                        page.get_by_role('option', name='Botella', exact=True).click()
                    check('New input/select/action targets meet 44px', editor.locator('input,button').evaluate_all('els=>els.every(el=>{const r=el.getBoundingClientRect();return r.width>=43.9&&r.height>=43.9;})'))
                    check('Draft does not write or pretend to be saved', len(writes) == 0)
                    if scenario == 'invalid':
                        for value in ['-1', '1e3', '1,2.3', 'Infinity', '']:
                            amount_input.fill(value)
                            check('Invalid draft blocks apply: ' + value, apply.is_disabled(), value)
                        amount_input.fill('35')
                    editor.screenshot(path=str(args.output / (case.replace(':', '-') + '-draft.png')))
                    if scenario in ['cancel', 'forged']:
                        editor.get_by_role('button', name='Descartar cambio', exact=True).click()
                        check('Discard restores original price draft', amount_input.input_value() == '25', amount_input.input_value(), '25')
                    else:
                        apply_start = time.perf_counter()
                        apply.click()
                        check('Local confirmation names unit and amount', editor.get_by_role('status').inner_text().find('Copa' if target_format == 'copa' else 'Botella') >= 0)
                        check('Local price confirmation below 1s on this browser', time.perf_counter() - apply_start < 1, round((time.perf_counter() - apply_start) * 1000, 2), '<1000ms; local UI only')
                        check('Applying price has no network or learning write', len(writes) == 0)
                        if scenario == 'multi-format':
                            amount_input.fill('8')
                            page.locator('#scan-price-format-0').click()
                            page.get_by_role('option', name='Copa', exact=True).click()
                            apply.click()
                            target_format, target_amount = 'copa', 8
                            check('Two manual formats remain visibly distinct', 'Copa' in editor.get_by_role('status').inner_text() and 'Botella' in editor.get_by_role('status').inner_text())
                        if scenario == 'compare':
                            comparison = page.locator('section[aria-labelledby="wine-comparison-title"]')
                            check('Price correction preserves two selected references', comparison.get_by_role('checkbox', checked=True).count() == 2)
                            affinity_cells = comparison.locator('tbody tr').filter(has=page.locator('th').filter(has_text=re.compile(r'^Afinidad$'))).locator('td').all_inner_texts()
                            check('No opaque affinity fabricated for comparison', affinity_cells == ['-', '-'], affinity_cells, ['-', '-'])
                            comparison.get_by_role('button', name='Servicio', exact=True).click()
                            for service, expected in [('Por botella', '35,00'), ('Por copa', '12,00')]:
                                page.locator('#comparison-service').click()
                                page.get_by_role('option', name=service, exact=True).click()
                                actual = comparison.inner_text()
                                check('Comparison uses chosen unit: ' + service, expected in actual, actual, expected)
                                check('Budget currency is explicit and enabled: ' + service, not page.locator('#comparison-budget').is_disabled() and 'EUR' in comparison.inner_text())
                                comparison.screenshot(path=str(args.output / (case.replace(':', '-') + '-' + ('bottle' if service == 'Por botella' else 'cup') + '-compare.png')))
                            page.locator('#scan-service').click()
                            page.get_by_role('option', name='Por botella', exact=True).click()
                            check('Bottle list price carries manual provenance', page.get_by_role('button', name=re.compile(r'^Abrir vino \d+:')).filter(has_text=wine['nombre']).inner_text().find('Manual') >= 0)
                            page.locator('#scan-max-price').fill('30')
                            check('Corrected35 excluded by bottle budget30 without using old25', page.get_by_role('button', name=re.compile(r'^Abrir vino \d+:')).count() == 0)
                            page.locator('#scan-service').click()
                            page.get_by_role('option', name='Copa o botella', exact=True).click()
                            page.get_by_role('button', name=re.compile(r'^Abrir vino \d+:')).first.wait_for()
                            summary = page.get_by_text('Ver fichas completas y acciones', exact=True)
                            if not summary.evaluate('el=>el.closest("details").open'): summary.click()
                            action = page.locator('button[aria-controls="wine-actions-0"]')
                            if action.get_attribute('aria-expanded') != 'true': action.click()
                    card.get_by_role('button', name='Quiero Probar', exact=True).click()
                    card.get_by_role('button', name='Guardado', exact=True).wait_for()
                    check('One intercepted insert, no live mutation', len(writes) == 1, len(writes), 1)
                    payload = writes[0]
                    snap = payload['place_details']['menu_price_snapshot']
                    check('Original service availability preserved', snap['service'] == wine['servicio'], snap['service'], wine['servicio'])
                    check('No opaque affinity or learning from price', payload['matchrim_affinity'] is None and payload['sensory_attributes'] is None and payload['use_for_profile_training'] is False)
                    expected_financial = 35 if scenario == 'bottle-eur' else None
                    check('Only confirmed single EUR bottle uses financial scalar', payload['price'] == expected_financial, payload['price'], expected_financial)
                    if scenario in ['cancel', 'forged']:
                        check('Discard does not mutate scan or attach manual assignment', snap['raw_amount'] == 25 and 'manual_assignment' not in snap)
                        if scenario == 'forged': check('Provider manual-origin claim stripped at ingress', snap['origin'] == 'scan', snap['origin'], 'scan')
                    else:
                        manual = snap.get('manual_assignment') or {}
                        check('Assignment survives save with explicit amount/unit/currency', manual.get('amount') == target_amount and manual.get('format') == target_format and manual.get('currency') == target_currency, manual)
                        check('Original read currency/prices survive as evidence', manual.get('original', {}).get('currency') == 'EUR' and manual.get('original', {}).get('prices', {}).get('copa') == wine['precios']['copa'], manual.get('original'))
                        if scenario == 'currency': check('Other unit not reinterpreted as GBP', snap['prices']['copa'] is None and snap['prices']['botella'] == 35, snap['prices'])
                    card.screenshot(path=str(args.output / (case.replace(':', '-') + '-applied.png')))
                    editor.get_by_role('button', name='Aplicar precio', exact=True).scroll_into_view_if_needed()
                    page.screenshot(path=str(args.output / (case.replace(':', '-') + '-viewport.png')))
                    page.goto(args.url + '/my-wines/wishlist', wait_until='networkidle')
                    group = page.get_by_role('group', name='Precio de carta de ' + wine['nombre'], exact=True)
                    group.wait_for()
                    text = group.inner_text()
                    check('Bodega preserves explicit manual provenance', scenario in ['cancel', 'forged'] or ('Manual' in text and ('Copa' if target_format == 'copa' else 'Botella') in text), text)
                    if scenario == 'currency': check('Original EUR and manual GBP distinguishable without conversion', ('GBP' in text or '£' in text) and '€' in text and 'anterior' in text.lower(), text)
                    if scenario == 'service-conflict': check('Conflicting read availability stays visibly pending', 'disponibilidad' in text.lower() and 'pendiente' in text.lower(), text)
                    check('Readable price lines stay within their group', group.evaluate('el=>{const b=el.getBoundingClientRect(),rs=[...el.querySelectorAll("p")].map(p=>p.getBoundingClientRect());return rs.every((r,i)=>r.left>=b.left-1&&r.right<=b.right+1&&(i===0||r.top>=rs[i-1].bottom-1));}'))
                    group.screenshot(path=str(args.output / (case.replace(':', '-') + '-read.png')))
            check('No horizontal page overflow', page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            check('All nonlocal HTTP fulfilled locally', sorted(seen) == sorted(fulfilled), {'seen': len(seen), 'fulfilled': len(fulfilled)})
            check('No runtime exceptions', not errors, errors)
            check('No console errors', not console, console)
            check('No unexpected hosted writes', not any(r['method'] in ['PATCH', 'PUT', 'DELETE'] or (r['method'] == 'POST' and r['path'].startswith('/rest/v1/') and r['path'] != '/rest/v1/user_wines') for r in requests))
            results.append({'case': case, 'passed': all(s['passed'] for s in steps), 'steps': steps, 'writes': writes, 'requests': requests, 'sockets': sockets, 'errors': errors, 'console': console})
        except Exception as e:
            page.screenshot(path=str(args.output / (case.replace(':', '-') + '-exception.png')))
            focus = page.evaluate('()=>({active:document.activeElement?{id:document.activeElement.id,role:document.activeElement.getAttribute("role"),tag:document.activeElement.tagName,text:document.activeElement.textContent?.slice(0,160)}:null,options:[...document.querySelectorAll("[role=option]")].map(el=>({text:el.textContent,highlighted:el.hasAttribute("data-highlighted"),selected:el.getAttribute("aria-selected")}))})')
            results.append({'case': case, 'passed': False, 'exception': str(e), 'focus': focus, 'steps': steps, 'writes': writes, 'requests': requests, 'errors': errors, 'console': console})
        finally: context.close()
        print(case, 'PASS' if results[-1]['passed'] else 'FAIL', flush=True)
    browser.close()
(args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'stage': args.stage, 'sourceHashes': source_hashes, 'elapsedSeconds': round(time.perf_counter() - started, 3), 'realRemoteCalls': 0, 'paidCalls': 0, 'hostedWrites': 0, 'realUsers': 0, 'inputHashes': {str(f.relative_to(root)): hashlib.sha256(f.read_bytes()).hexdigest() for f in [bank_path, image]}, 'results': results}, ensure_ascii=False, indent=2) + '\n')
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
