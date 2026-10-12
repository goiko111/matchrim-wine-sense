"""Task06 only: successive menu-card intents, isolated invalid auth and SDK memory, no hosted persistence."""
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
p.add_argument('--output', type=Path, required=True)
p.add_argument('--url', default='http://127.0.0.1:4453')
p.add_argument('--cases', default='sequence:portrait')
p.add_argument('--readback-fixture', type=Path, help='Optional actual06 receipt: read-only visual proof, no scanner/write rerun')
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1]
both_path = root / 'docs/qa-evidence/matchrim-menu-list-2026-10-12/before-complete/input-provenance.json'
image = root / 'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/fixtures/IMG_7547 2.jpg'
wine = json.loads(both_path.read_text())['bothContract']['vinos'][1]
assert hashlib.sha256(image.read_bytes()).hexdigest() == '2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194'
UID = '00000000-0000-4000-8000-000000000080'
AUTH = 'sb-cbjynrbvrhcmpaojmqdp-auth-token'
enc = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
def fake_session(uid):
    return {'user': {'id': uid, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa@matchrim.invalid', 'app_metadata': {'provider': 'email'}, 'user_metadata': {}}, 'access_token': enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': uid, 'exp': 1900000000}) + '.' + enc('synthetic-invalid'), 'refresh_token': 'synthetic-invalid', 'expires_at': 1900000000, 'expires_in': 86400, 'token_type': 'bearer'}
session = fake_session(UID)
results = []
hashes = {str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest() for path in [both_path, image, root / 'src/components/wine-import/WineMenuScanner.tsx']}
if args.readback_fixture: hashes[str(args.readback_fixture)] = hashlib.sha256(args.readback_fixture.read_bytes()).hexdigest()
(args.output / 'input-provenance.json').write_text(json.dumps({'scope': __doc__, 'sourceHashes': hashes, 'data': 'Existing04 synthetic BOTH contract, one recorded image; not fresh extraction/catalog/profile/user', 'invalidSignature': True, 'remoteAppCalls': 0, 'paidCalls': 0}, indent=2) + '\n')

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for case in args.cases.split(','):
            scenario, orientation = case.split(':')
            width, height = (393, 852) if orientation == 'portrait' else (852, 393)
            memory, mutations, requests, seen, fulfilled, sockets, errors, console, checks, failures, pending = [], [], [], [], [], [], [], [], [], [], []
            if args.readback_fixture: memory.append(copy.deepcopy(json.loads(args.readback_fixture.read_text())['results'][0]['rows'][0]))
            context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, reduced_motion='reduce', service_workers='block')
            def reply(route, data, status=200):
                fulfilled.append(route.request.url)
                route.fulfill(status=status, content_type='application/json', body=json.dumps(data), headers={'Access-Control-Allow-Origin': '*'})
            def intercept(route):
                req = route.request; url = urlparse(req.url)
                if url.netloc == urlparse(args.url).netloc: return route.continue_()
                requests.append({'method': req.method, 'host': url.hostname, 'path': url.path})
                if '/auth/v1/user' in url.path: return reply(route, session['user'])
                if '/rest/v1/user_wines' in url.path:
                    query = parse_qs(url.query)
                    if req.method in ['POST', 'PATCH']:
                        payload = copy.deepcopy(req.post_data_json)
                        mutation = {'method': req.method, 'query': query, 'payload': payload}
                        mutations.append(mutation)
                        if req.method == 'POST':
                            row = {'id': '10000000-0000-4000-8000-' + str(len(memory) + 1).zfill(12), 'created_at': '2026-10-12T00:00:00Z', 'rating': None, 'quantity': None, 'image_url': None, 'personal_note': None, **payload}
                            memory.append(row)
                        else:
                            matches = [r for r in memory if query.get('id') == ['eq.' + r['id']] and query.get('user_id') == ['eq.' + r['user_id']]]
                            if len(matches) != 1: return reply(route, {'code': '23514', 'message': 'Missing exact local owner/ID filter'}, 400)
                            row = matches[0]; mutation['before'] = copy.deepcopy(row); row.update(payload)
                        mutation['stored'] = copy.deepcopy(row)
                        returned = copy.deepcopy(row)
                        if len(mutations) == 2:
                            if scenario == 'empty': returned = None
                            if scenario == 'wrong-id': returned['id'] = '10000000-0000-4000-8000-999999999999'
                            if scenario == 'wrong-owner': returned['user_id'] = '00000000-0000-4000-8000-000000000081'
                            if scenario == 'metadata': returned['place_details']['menu_price_snapshot']['manual_pending'] = False
                        hold = (scenario in ['overlap', 'doubleclick', 'identity-pending'] and len(mutations) == 1) or (scenario in ['owner', 'unmount', 'batch'] and len(mutations) == 2)
                        if hold:
                            pending.append((route, returned)); return
                        return reply(route, returned)
                    selected = [r for r in memory if query.get('user_id', ['eq.' + UID]) == ['eq.' + r['user_id']]]
                    for field in ['status', 'is_favorite', 'rating']:
                        if field in query:
                            value = query[field][0]
                            selected = [r for r in selected if r.get(field) is not None] if value == 'not.is.null' else [r for r in selected if str(r.get(field)).lower() == value.removeprefix('eq.').lower()]
                    if 'or' in query: selected = [r for r in selected if r.get('status') == 'tasted' or r.get('rating') is not None]
                    return reply(route, selected)
                if '/functions/v1/scan-wine-menu' in url.path: return reply(route, {'vinos': [wine], 'layout': 'rows', 'coverage': {'status': 'reported_complete', 'extracted_wines': 1}})
                if '/functions/v1/' in url.path: return reply(route, {'wines': []})
                if '/rest/v1/quiz_results' in url.path: return reply(route, None)
                return reply(route, [] if '/rest/v1/' in url.path else {})
            def ws_handler(ws):
                local = urlparse(ws.url).netloc == urlparse(args.url).netloc
                sockets.append({'host': urlparse(ws.url).hostname, 'local': local, 'blocked': not local})
                if local: ws.connect_to_server()
                else: ws.close(code=1008, reason='Task06 no hosted egress')
            context.route('**/*', intercept)
            context.route_web_socket('**/*', ws_handler)
            context.on('request', lambda req: seen.append(req.url) if urlparse(req.url).netloc != urlparse(args.url).netloc else None)
            seed = {AUTH: json.dumps(session), 'matchrim.local_profile_owner.v1': UID, 'matchrim.onboarding.v2:' + UID: json.dumps({'version': 2, 'result': 'skipped'}), 'matchrim.scan_privacy_notice.v2': 'accepted'}
            context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);" % json.dumps(seed))
            page = context.new_page(); page.set_default_timeout(6000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: console.append(re.sub(r'https?://\S+', '<URL>', m.text)) if m.type == 'error' else None)
            def check(name, passed, detail=None):
                checks.append({'name': name, 'passed': bool(passed), 'detail': detail})
                if not passed: failures.append(name)
            def release():
                for route, returned in pending: reply(route, returned)
                pending.clear(); page.wait_for_timeout(150)
            def action(card, name):
                with page.expect_response(lambda response: '/rest/v1/user_wines' in response.url and response.request.method in ['POST', 'PATCH']):
                    card.get_by_role('button', name=name, exact=True).click()
                page.wait_for_timeout(150)
            try:
                if args.readback_fixture:
                    for section in ['favorites', 'tasted']:
                        page.goto(args.url + '/my-wines/' + section, wait_until='networkidle')
                        row = page.get_by_role('button', name='Eliminar ' + wine['nombre'], exact=True)
                        check(section + ' has the exact single recorded06 row', row.count() == 1 and memory[0]['status'] == 'tasted' and memory[0]['is_favorite'] is True and memory[0]['rating'] is None)
                        wine_card = row.locator('xpath=ancestor::div[contains(@class,"group")][1]')
                        wine_card.screenshot(path=str(args.output / (case.replace(':', '-') + '-' + section + '-card.png')))
                        last = wine_card.get_by_role('button', name='No va', exact=True)
                        last.evaluate('el=>el.scrollIntoView({block:"center"})')
                        check(section + ' controls reachable above bar', last.evaluate('el=>{const r=el.getBoundingClientRect();const bar=document.querySelector(".matchrim-native-tab-bar");return r.top>=0&&r.bottom<=(bar?bar.getBoundingClientRect().top:innerHeight);}'))
                        check(section + ' has one pending rating declaration', page.get_by_text('Pendiente de valoración', exact=True).count() == 1)
                        page.screenshot(path=str(args.output / (case.replace(':', '-') + '-' + section + '-viewport.png')))
                    check('Readback proof makes no mutation', not mutations and not any(r['method'] in ['POST', 'PATCH', 'DELETE', 'PUT'] for r in requests))
                    check('Readback proof has no egress', sorted(seen) == sorted(fulfilled))
                    check('Readback proof has no exceptions/overflow', not errors and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                    print('readback-' + case, 'PASS' if not failures else 'FAIL', flush=True)
                    continue
                page.goto(args.url + '/escanear/carta-vinos', wait_until='networkidle')
                page.locator('input[type=file]').first.set_input_files(str(image))
                page.get_by_role('button', name=re.compile(r'^Abrir vino \d+:')).first.wait_for(timeout=45000)
                page.get_by_text('Ver fichas completas y acciones', exact=True).click()
                page.locator('button[aria-controls="wine-actions-0"]').click()
                card = page.locator('#wine-actions-0')
                card.get_by_role('button', name='Editar', exact=True).click()
                page.locator('#scan-price-0').fill('35')
                if scenario in ['overlap', 'doubleclick', 'identity-pending']:
                    first = card.get_by_role('button', name='Quiero Probar', exact=True)
                    if scenario == 'doubleclick': first.dblclick()
                    else: first.click()
                    page.wait_for_timeout(100)
                    check('One first insert while pending', len(mutations) == 1)
                    check('All same-card intents disabled while pending', all(card.get_by_role('button', name=n, exact=True).is_disabled() for n in ['Quiero Probar', 'Añadir favorito', 'Lo he probado']))
                    card.get_by_role('button', name='Añadir favorito', exact=True).evaluate('el=>el.click()')
                    check('Overlapping intent cannot post another row', len(mutations) == 1)
                    if scenario == 'identity-pending': page.locator('#scan-name-0').fill(wine['nombre'] + ' editado')
                    release()
                else:
                    action(card, 'Lo he probado' if scenario == 'tasted-first' else 'Quiero Probar')
                first_id = memory[0]['id']
                check('Initial confirmed insert has one exact row', len(memory) == 1 and mutations[0]['method'] == 'POST', first_id)
                card.screenshot(path=str(args.output / (case.replace(':', '-') + '-first.png')))
                if scenario in ['identity', 'identity-pending']:
                    if scenario == 'identity': page.locator('#scan-name-0').fill(wine['nombre'] + ' editado')
                    button = card.get_by_role('button', name='Añadir favorito', exact=True)
                    if button.is_enabled(): button.click(); page.wait_for_timeout(150)
                    check('Edited identity holds without alias or new insert', len(mutations) == 1)
                    check('Identity change visibly requires review', card.get_by_text(re.compile('Identidad editada|Identidad cambiada')).count() > 0)
                elif scenario in ['owner', 'unmount', 'batch']:
                    card.get_by_role('button', name='Añadir favorito', exact=True).click(); page.wait_for_timeout(100)
                    check('Second intent is pending', len(pending) == 1)
                    if scenario == 'owner':
                        other = fake_session('00000000-0000-4000-8000-000000000081')
                        page.evaluate('([key,session])=>{localStorage.setItem(key,JSON.stringify(session));const channel=new BroadcastChannel(key);channel.postMessage({event:"SIGNED_IN",session});setTimeout(()=>channel.close(),100);}', [AUTH, other])
                    elif scenario == 'unmount': page.get_by_role('link', name='Inicio', exact=True).click()
                    else:
                        # Same image bytes, different File name: same-path reselection did not emit onChange.
                        with page.expect_response(lambda response: '/functions/v1/scan-wine-menu' in response.url):
                            page.locator('input[type=file]').first.set_input_files({'name': 'same-scene-repeat.jpg', 'mimeType': 'image/jpeg', 'buffer': image.read_bytes()})
                    page.wait_for_timeout(300); release()
                    check('Late response does not show previous-owner/batch success', page.get_by_text(wine['nombre'] + ' guardado en Quiero Probar y Favoritos', exact=False).count() == 0)
                    if scenario == 'owner':
                        check('Owner change cleared original card', card.count() == 0)
                        check('SDK auth event changed local owner, not a real account', page.evaluate('localStorage.getItem("matchrim.local_profile_owner.v1")') == other['user']['id'])
                    if scenario == 'batch':
                        summary = page.get_by_text('Ver fichas completas y acciones', exact=True)
                        if summary.locator('xpath=parent::details').get_attribute('open') is None: summary.click()
                        control = page.locator('button[aria-controls="wine-actions-0"]')
                        if control.get_attribute('aria-expanded') != 'true': control.click()
                        page.locator('#wine-actions-0').wait_for(state='visible')
                        check('New batch has no stale favorite marker', page.locator('#wine-actions-0').get_by_role('button', name='Favorito', exact=True).count() == 0)
                        check('New batch has fresh first-save intent', page.locator('#wine-actions-0').get_by_role('button', name='Quiero Probar', exact=True).is_enabled())
                else:
                    action(card, 'Añadir favorito')
                    if scenario in ['empty', 'wrong-id', 'wrong-owner', 'metadata']:
                        check('Unconfirmed update is not favourite success', card.get_by_role('button', name='Favorito', exact=True).count() == 0)
                        check('Unconfirmed mutation is held, not reinserted', card.get_by_text('Guardado sin confirmar', exact=False).count() > 0 and len(mutations) == 2)
                        check('Uncertain update blocks next intent', card.get_by_role('button', name='Lo he probado', exact=True).is_disabled())
                    elif scenario != 'tasted-first': action(card, 'Lo he probado')
                card = page.locator('#wine-actions-0')
                if card.count(): card.screenshot(path=str(args.output / (case.replace(':', '-') + '-last.png')))
                check('No insert per follow-up action', len([m for m in mutations if m['method'] == 'POST']) == 1, [m['method'] for m in mutations])
                check('Follow-up mutations target exact initial owner and ID', all(m['query'].get('id') == ['eq.' + first_id] and m['query'].get('user_id') == ['eq.' + UID] for m in mutations[1:]), [m['query'] for m in mutations[1:]])
                check('Follow-up patch contains only the requested intention, no history/rating rewrite', all(set(m['payload']).issubset({'status', 'is_favorite'}) for m in mutations[1:]), [m['payload'] for m in mutations[1:]])
                check('Single-card ledger stays one row', len(memory) == 1, [{'id': r['id'], 'status': r['status'], 'favorite': r['is_favorite']} for r in memory])
                if scenario not in ['identity', 'identity-pending', 'owner', 'unmount', 'batch', 'empty', 'wrong-id', 'wrong-owner', 'metadata']:
                    check('Final intention is tasted AND favorite without a rating', memory[0]['status'] == 'tasted' and memory[0]['is_favorite'] is True and memory[0]['rating'] is None, memory)
                    for section in ['favorites', 'tasted']:
                        page.goto(args.url + '/my-wines/' + section, wait_until='networkidle')
                        row = page.get_by_role('button', name='Eliminar ' + wine['nombre'], exact=True)
                        check('Bodega ' + section + ' has exactly same one row', row.count() == 1)
                        check('Bodega tasted declaration remains unrated', page.get_by_text('Pendiente de valoración', exact=True).count() == 1)
                        page.screenshot(path=str(args.output / (case.replace(':', '-') + '-' + section + '.png')))
                check('No metadata/history/ficha/score/training loss on follow-up', all(r['price'] is None and r['place_details']['menu_price_snapshot']['raw_amount'] == 35 and r['place_details']['menu_price_snapshot']['manual_pending'] is True and r['place_details']['menu_price_snapshot']['prices']['copa'] == 25 and r['place_details']['menu_price_snapshot']['prices']['botella'] == 25 and r['sensory_attributes'] is None and r['matchrim_affinity'] is None and r['use_for_profile_training'] is False for r in memory))
                check('Every nonlocal HTTP request intercepted', sorted(seen) == sorted(fulfilled), {'seen': len(seen), 'fulfilled': len(fulfilled)})
                check('No other app writes', not any(r['method'] in ['DELETE', 'PUT'] or (r['method'] in ['POST', 'PATCH'] and r['path'].startswith('/rest/v1/') and r['path'] != '/rest/v1/user_wines') for r in requests))
                check('No runtime exceptions', not errors, errors)
                check('No mobile horizontal overflow', page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            except Exception as error:
                failures.append(str(error)); page.screenshot(path=str(args.output / (case.replace(':', '-') + '-exception.png')))
            finally:
                for route, returned in pending: reply(route, returned)
                results.append({'case': case, 'passed': not failures, 'checks': checks, 'failures': failures, 'mutations': mutations, 'rows': memory, 'requests': requests, 'socketAudit': sockets, 'errors': errors, 'console': console})
                context.close()
            print(case, 'PASS' if results[-1]['passed'] else 'FAIL', flush=True)
    finally: browser.close()
(args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'realAccounts': 0, 'realRemoteAppCalls': 0, 'paidCalls': 0, 'results': results}, ensure_ascii=False, indent=2) + '\n')
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
