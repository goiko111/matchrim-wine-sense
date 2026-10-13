"""Menu similarity abstention on public pixel canary and frozen synthetic responses. No catalog-positive UI fixture."""
import argparse
import base64
import copy
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4476')
p.add_argument('--output', type=Path, required=True)
p.add_argument('--cases', default='vision:portrait,vision:landscape,missing:portrait,missing:landscape,forged:portrait,forged:landscape,manual:portrait,manual:landscape')
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1]
bank_path = root / 'docs/qa-evidence/matchrim-menu-comparison-2026-10-12/after/response-provenance.json'
image = root / 'qa-fixtures/food-menu/commons-restaurant-menu-2026-08-25-2000.jpg'
assert hashlib.sha256(bank_path.read_bytes()).hexdigest() == 'f4f7fbbf6ce5d19868baf78ff3983f8ca585a7fb1a070ca2386175d308e19fe5'
assert hashlib.sha256(image.read_bytes()).hexdigest() == '9980c5e6b9d5e52f1783e2f26d1a97e22c0c2e1556e9e72919dd26fc34ece9a9'
bank = json.loads(bank_path.read_text())['variants']
uid = '00000000-0000-4000-8000-000000000080'
encode = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
session = {'user': {'id': uid, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa@matchrim.invalid', 'app_metadata': {'provider': 'email'}, 'user_metadata': {}}, 'access_token': encode({'alg': 'HS256', 'typ': 'JWT'}) + '.' + encode({'sub': uid, 'exp': 1900000000}) + '.' + encode('synthetic-invalid'), 'refresh_token': 'synthetic-invalid', 'expires_at': 1900000000, 'expires_in': 86400, 'token_type': 'bearer'}
results = []
source_hashes = {str(file.relative_to(root)): hashlib.sha256(file.read_bytes()).hexdigest() for file in [root / 'src/components/wine-import/WineMenuScanner.tsx', root / 'src/utils/menuWineSave.ts', root / 'src/utils/menuPriceReview.ts', root / 'scripts/qa-matchrim-menu-style-evidence-oct13.py']}
for name in ['src/utils/menuWineSimilarity.ts', 'src/components/wine-import/MenuPriceEditor.tsx']:
    if (root / name).exists(): source_hashes[name] = hashlib.sha256((root / name).read_bytes()).hexdigest()
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for case in args.cases.split(','):
        scenario, orientation = case.split(':')
        width, height = (393, 852) if orientation == 'portrait' else (852, 393) if orientation == 'landscape' else (320, 740)
        wines = copy.deepcopy(bank['units']['vinos'][1:3])
        if scenario in ['missing', 'missing-type']:
            for wine in wines: wine.update(atributos=None, uvas=[])
        if scenario == 'missing-type':
            for wine in wines: wine['tipo'] = ''
        if scenario == 'forged':
            for index, wine in enumerate(wines): wine.update(canonicalId='provider-claim-' + str(index), sensorySource='catalog', affinity_calibrated=True, compatibilidad=99)
        if scenario == 'single': wines = wines[:1]
        if scenario == 'long':
            original = copy.deepcopy(wines[0])
            wines = [{**copy.deepcopy(original), 'nombre': 'Vino QA-A%03d' % index, 'productor': 'Productor QA-A%03d' % index, 'texto_fuente': 'Vino QA-A%03d' % index, 'anada': 2020 + index % 5, 'posicion': None} for index in range(30)]
        seen, fulfilled, requests, sockets, errors, console, checks = [], [], [], [], [], [], []
        context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, reduced_motion='reduce', service_workers='block')
        def reply(route, data):
            fulfilled.append(route.request.url)
            route.fulfill(status=200, content_type='application/json', body=json.dumps(data), headers={'Access-Control-Allow-Origin': '*'})
        def intercept(route):
            req, url = route.request, urlparse(route.request.url)
            if url.netloc == urlparse(args.url).netloc: return route.continue_()
            requests.append({'method': req.method, 'path': url.path})
            if '/auth/v1/user' in url.path: return reply(route, session['user'])
            if '/rest/v1/quiz_results' in url.path: return reply(route, None)
            if '/functions/v1/scan-wine-menu' in url.path: return reply(route, {'vinos': wines, 'layout': 'rows', 'coverage': {'status': 'reported_complete', 'extracted_wines': len(wines)}})
            if '/functions/v1/' in url.path: return reply(route, {'wines': []})
            return reply(route, [] if '/rest/v1/' in url.path else {})
        def websocket(ws):
            local = urlparse(ws.url).netloc == urlparse(args.url).netloc
            sockets.append({'local': local, 'blocked': not local})
            if local: ws.connect_to_server()
            else: ws.close(code=1008, reason='QA egress blocked')
        context.route('**/*', intercept)
        context.route_web_socket('**/*', websocket)
        context.on('request', lambda req: seen.append(req.url) if urlparse(req.url).netloc != urlparse(args.url).netloc else None)
        seed = {'sb-cbjynrbvrhcmpaojmqdp-auth-token': json.dumps(session), 'matchrim.local_profile_owner.v1': uid, 'matchrim.onboarding.v2:' + uid: json.dumps({'version': 2, 'result': 'skipped'}), 'matchrim.scan_privacy_notice.v2': 'accepted'}
        context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);" % json.dumps(seed))
        page = context.new_page()
        page.set_default_timeout(7000)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda message: console.append(re.sub(r'https?://\S+', '<URL>', message.text)) if message.type == 'error' else None)
        def check(name, passed, actual=None, expected=None): checks.append({'name': name, 'passed': bool(passed), 'actual': actual, 'expected': expected})
        try:
            page.goto(args.url + '/escanear/carta-vinos', wait_until='networkidle')
            with page.expect_file_chooser() as chooser: page.get_by_role('button', name='Subir archivo', exact=True).click()
            chooser.value.set_files(str(image))
            page.get_by_role('button', name=re.compile(r'^Abrir vino \d+:')).first.wait_for(timeout=45000)
            if scenario in ['zoom', 'price-zoom']: page.add_style_tag(content='html { font-size: 32px !important; }')
            page.get_by_text('Ver fichas completas y acciones', exact=True).click()
            page.locator('button[aria-controls="wine-actions-0"]').click()
            card = page.locator('#wine-actions-0')
            if scenario in ['manual', 'typing', 'price-zoom']:
                card.get_by_role('button', name='Editar', exact=True).click()
                if scenario == 'typing':
                    name_input = page.locator('#scan-name-0')
                    name_input.click()
                    page.keyboard.press('ControlOrMeta+ArrowRight')
                    page.wait_for_function('(()=>{const el=document.querySelector("#scan-name-0");return el?.selectionStart===el?.value.length;})()')
                    name_input.press_sequentially(' Revisado', delay=30)
                    check('Sequential identity typing retains every character', page.locator('#scan-name-0').input_value() == wines[0]['nombre'] + ' Revisado', page.locator('#scan-name-0').input_value(), wines[0]['nombre'] + ' Revisado')
                    check('Identity input retains keyboard focus', page.locator('#scan-name-0').evaluate('el=>el===document.activeElement'))
                elif scenario == 'manual': page.locator('#scan-name-0').fill('Identidad manual pendiente')
            text = card.inner_text()
            check('No numerical similarity from photo or unknown type', not re.search(r'Parecido\s+\d+%|Similitud[^\n]*\d+/100', text), re.findall(r'Parecido\s+\d+%', text), [])
            check('Missing sensory origin explicitly explained', 'Parecidos pendientes:' in text, text)
            check('No ungrounded similar-wine navigation', card.get_by_role('button', name='Ver parecidos', exact=True).is_disabled())
            check('No provider self-certified affinity99', '99%' not in text)
            check('Scan references stay individually available', page.get_by_role('button', name=re.compile(r'^Abrir vino \d+:')).count() == len(wines), page.get_by_role('button', name=re.compile(r'^Abrir vino \d+:')).count(), len(wines))
            check('No page width overflow', page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            text_fit = card.locator('h4, button, p, label').evaluate_all('els=>els.map(el=>{const b=el.getBoundingClientRect(),walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),outside=[],limits=[b];let parent=el.parentElement;while(parent&&!parent.id.startsWith("wine-actions-")){const s=getComputedStyle(parent);if(["hidden","clip"].includes(s.overflowX))limits.push(parent.getBoundingClientRect());parent=parent.parentElement;}let text;while(text=walker.nextNode()){if(!text.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(text);for(const r of range.getClientRects())if(r.width>0&&limits.some(limit=>r.left<limit.left-1||r.right>limit.right+1))outside.push({text:text.textContent.trim(),bounds:{left:r.left,right:r.right,top:r.top,bottom:r.bottom}});}return{tag:el.tagName,text:el.textContent.trim(),width:b.width,height:b.height,outside};})')
            check('Headings and action text fit their own controls, not just page width', all(not row['outside'] for row in text_fit), text_fit)
            targets = card.locator('button').evaluate_all('els=>els.map(el=>{const r=el.getBoundingClientRect();return{name:el.textContent.trim(),width:r.width,height:r.height};})')
            check('Expanded card controls meet 44px targets', all(row['width'] >= 43.9 and row['height'] >= 43.9 for row in targets), targets)
            card.screenshot(path=str(args.output / (case.replace(':', '-') + '-detail.png')))
            if scenario == 'price-zoom': card.get_by_role('group', name='Revisar precio de carta', exact=True).screenshot(path=str(args.output / (case.replace(':', '-') + '-price-editor.png')))
            last_action = card.get_by_role('button', name='Consultar afinidad', exact=True)
            last_action.scroll_into_view_if_needed()
            bounds = last_action.bounding_box()
            bar = page.locator('.matchrim-native-tab-bar').bounding_box()
            bar_top = bar['y'] if bar else height
            if bounds['y'] + bounds['height'] > bar_top: page.mouse.wheel(0, bounds['y'] + bounds['height'] - bar_top + 24)
            check('Last card action reachable above native-styled tab bar', last_action.evaluate('el=>{const r=el.getBoundingClientRect(),bar=document.querySelector(".matchrim-native-tab-bar");return r.top>=0&&r.bottom<=(bar?bar.getBoundingClientRect().top:innerHeight)+1;}'))
            page.screenshot(path=str(args.output / (case.replace(':', '-') + '-viewport.png')))
            check('Every external HTTP request is locally fulfilled', sorted(seen) == sorted(fulfilled), {'seen': len(seen), 'fulfilled': len(fulfilled)})
            check('No SDK REST write or training', not any(r['method'] in ['PATCH', 'POST', 'DELETE', 'PUT'] and r['path'].startswith('/rest/v1/') for r in requests))
            check('No runtime errors', not errors, errors)
            check('No console errors', not console, console)
            results.append({'case': case, 'passed': all(c['passed'] for c in checks), 'checks': checks, 'requests': requests, 'sockets': sockets, 'errors': errors, 'console': console})
        except Exception as error:
            page.screenshot(path=str(args.output / (case.replace(':', '-') + '-exception.png')))
            results.append({'case': case, 'passed': False, 'exception': str(error), 'checks': checks, 'requests': requests, 'errors': errors, 'console': console})
        finally: context.close()
        print(case, 'PASS' if results[-1]['passed'] else 'FAIL', flush=True)
    browser.close()
(args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'sourceHashes': source_hashes, 'inputHashes': {str(f.relative_to(root)): hashlib.sha256(f.read_bytes()).hexdigest() for f in [bank_path, image]}, 'paidCalls': 0, 'realRemoteAppCalls': 0, 'realUsers': 0, 'realWrites': 0, 'results': results}, ensure_ascii=False, indent=2) + '\n')
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
