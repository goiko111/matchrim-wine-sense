"""Food95 actual native-style UI, controlled network/PDF/save faults. Not recognition, native-device or production persistence evidence."""
import argparse
import base64
import copy
import hashlib
import io
import json
import mimetypes
import re
import shutil
import time
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from playwright.sync_api import Error as PlaywrightError, sync_playwright
from pypdf import PdfReader, PdfWriter


ROOT = Path(__file__).resolve().parents[1]
A95 = Path('/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim95-eight-hours-20261017')
OWNER = '00000000-0000-4000-8000-000000000095'
FOREIGN = '00000000-0000-4000-8000-000000000096'
ROW_ID = '00000000-0000-4000-8000-000000009501'
AUTH_STORAGE = 'sb-cbjynrbvrhcmpaojmqdp-auth-token'
STYLE = 'Tinto de control para maridaje'
VIEWPORTS = {'portrait': (393, 852), 'landscape': (852, 393), 'text200': (320, 700)}
FAULTS = ['http500', 'timeout', 'network', 'invalid-model', 'malformed', 'quota402', 'quota429']
PDF_CASES = ['pdf-valid', 'pdf-invalid', 'pdf-password', 'pdf-cancel', 'pdf-back', 'pdf-oversize']
BAD_RECEIPTS = ['receipt-missing', 'receipt-foreign', 'receipt-network']
EXTRA_RECEIPTS = ['receipt-partial', 'receipt-name', 'receipt-status', 'receipt-favorite',
                  'receipt-training', 'receipt-sensory', 'receipt-affinity', 'receipt-update-id']
SOURCES = ['src/components/wine-import/FoodPairingScanner.tsx', 'src/utils/foodScanRecovery95.ts',
           'src/utils/imageAnalysis.ts', 'src/utils/restaurantDocuments91.ts', 'src/utils/foodMenuScan89.ts',
           'src/utils/foodScanResponse.ts', 'src/utils/foodRowPolicy90.ts', 'src/index.css', 'src/pages/Scan.tsx']
RECEIPT_FIELDS = {'id', 'user_id', 'name', 'status', 'is_favorite', 'use_for_profile_training',
                  'sensory_attributes', 'matchrim_affinity'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def fake_session():
    encode = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
    user = {'id': OWNER, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa-food95@matchrim.invalid',
            'app_metadata': {'provider': 'email'}, 'user_metadata': {}}
    return {'user': user, 'access_token': encode({'alg': 'HS256', 'typ': 'JWT'}) + '.'
            + encode({'sub': OWNER, 'exp': 1900000000}) + '.synthetic-invalid-signature',
            'refresh_token': 'synthetic-invalid-refresh', 'expires_at': 1900000000,
            'expires_in': 86400, 'token_type': 'bearer'}


def response_for(body, stale=False):
    tile = body.get('scan_region', {}).get('id', 'dish')
    label = 'RESULTADO OBSOLETO QA' if stale else 'Plato de control ' + tile
    recommendation = {'nombre': STYLE, 'tipo': 'Tinto', 'uvas': ['Tempranillo'], 'match': 92,
                      'razon': 'Idea de estilo no verificada; comprobar con la carta.',
                      'atributos': {'potencia': 4, 'acidez': 3, 'dulzura': 1, 'taninos': 4, 'afrutado': 3}}
    rows = []
    for index, (name, text) in enumerate([
        (label, label), ('Control agotado ' + tile, 'Control agotado SOLD OUT'),
        ('Control futuro ' + tile, 'Control futuro COMING SOON'),
        ('Control domingo ' + tile, 'Control domingo SOLO DOMINGOS'),
    ]):
        rows.append({'nombre': name, 'categoria': 'Plato de control', 'match': 89, 'razon': 'RAW_QA_DISH_REASON',
                     'recomendaciones': [copy.deepcopy(recommendation)], 'source_text': text,
                     'source_order': index, 'confidence': .84, 'segmentation': 'direct',
                     'source_box': {'x': 5, 'y': 5 + 20 * index, 'width': 85, 'height': 15},
                     'region_id': 'control-' + str(index)})
    result = {'mode': body.get('mode', 'dish'), 'summary': 'RAW_QA_MODEL_SUMMARY', 'dishes': rows,
              'has_profile': False, 'profile_source': 'none', 'scan_version': 'local-food95-ui-contract',
              'coverage': {'estimated_visible_dishes': 4, 'returned_dishes': 4, 'unreadable_dishes': 0,
                           'truncated': False, 'partial': False, 'model_counts_reported': True}}
    if body.get('scan_region'):
        result['scan_region'] = copy.deepcopy(body['scan_region'])
    return result


def matrix(orientations):
    cases = []
    for mode in ['menu', 'dish']:
        for scenario in FAULTS + ['cancel-read', 'back-read', 'oversize', 'save-success', 'favorite-success'] + BAD_RECEIPTS:
            cases.extend((mode, scenario, view) for view in orientations)
    for scenario in PDF_CASES + ['partial']:
        cases.extend(('menu', scenario, view) for view in orientations)
    cases.extend(('dish', scenario, 'portrait') for scenario in EXTRA_RECEIPTS if 'portrait' in orientations)
    return cases


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:4599')
    parser.add_argument('--dist', type=Path, default=Path('/private/tmp/matchrim95-ui-iteration11'))
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--pdf-fixture', type=Path, default=A95 / 'ui-menu-resilience-iteration7/synthetic-two-page-control.pdf')
    parser.add_argument('--image', type=Path, default=ROOT / 'qa-fixtures/food-menu/commons-restaurant-menu-2026-08-25-2000.jpg')
    parser.add_argument('--orientations', nargs='+', choices=list(VIEWPORTS), default=list(VIEWPORTS))
    parser.add_argument('--cases', nargs='+', help='Scenario names only, for bounded smoke/failure reruns')
    parser.add_argument('--back-navigation', choices=['visible-button', 'history'], default='visible-button',
                        help='Keep visible back-button failures; history is a separate native-back control')
    args = parser.parse_args()
    origin = urlparse(args.url)
    assert origin.scheme == 'http' and origin.hostname in ['127.0.0.1', 'localhost']
    assert (A95 / 'food95-ui').resolve() in args.output.resolve().parents, 'Evidence must remain under A95/food95-ui'
    args.output.mkdir(parents=True, exist_ok=False, mode=0o700)
    shutil.copyfile(__file__, args.output / 'executed-script.py')
    dist = args.dist.resolve()
    assert (dist / 'index.html').is_file()
    original_pdf = args.pdf_fixture.read_bytes()
    reader = PdfReader(io.BytesIO(original_pdf))
    assert len(reader.pages) == 2, 'Reuse the exact two-page control, not a regenerated corpus'
    encrypted = PdfWriter()
    for page in reader.pages:
        encrypted.add_page(page)
    encrypted.encrypt('qa-food95-control-password')
    protected = io.BytesIO()
    encrypted.write(protected)
    protected_bytes = protected.getvalue()
    (args.output / 'password-control.pdf').write_bytes(protected_bytes)
    password_check = PdfReader(io.BytesIO(protected_bytes))
    assert password_check.is_encrypted and password_check.decrypt('qa-food95-control-password')
    assert len(password_check.pages) == 2
    source_hashes = {name: sha((ROOT / name).read_bytes()) for name in SOURCES}
    asset_hashes = {str(path.relative_to(dist)): sha(path.read_bytes()) for path in sorted(dist.rglob('*')) if path.is_file()}
    cases = matrix(args.orientations)
    if args.cases:
        cases = [case for case in cases if case[1] in args.cases]
    assert cases, 'No selected UI cases'
    report = {'scope': __doc__, 'qualification': 'Chromium native-style emulation, not iOS. Public menu pixels are transport/crop input only; all dish/style responses and save receipts are synthetic. Timeout uses virtual time; no speed/recognition claim.',
              'dist': str(dist), 'url': args.url, 'backNavigation': args.back_navigation,
              'scriptHash': sha(Path(__file__).read_bytes()),
              'sourceHashes': source_hashes, 'assetHashes': asset_hashes,
              'imageHash': sha(args.image.read_bytes()), 'pdfHash': sha(original_pdf),
              'passwordPdfHash': sha(protected_bytes), 'owner': OWNER, 'email': 'qa-food95@matchrim.invalid',
              'credentials': 'No credentials read. Fresh localStorage only, invalid JWT signature and refresh token.',
              'networkPolicy': 'Every request routed before navigation; exact loopback assets fulfilled from frozen dist; remote fixtures fulfilled/aborted, no route.continue or fetch. All WS closed, service workers blocked. Dead loopback proxy and DNS denial as fail-closed transport.',
              'visualCriteria': 'Food/main buttons >=44px in both dimensions, no horizontal page overflow, and no action-label word fragmented across rendered lines. Browser range geometry supplements preserved viewport screenshots; clicks use actual hit testing.',
              'realOutboundCalls': 0, 'realProviderCalls': 0, 'realAccountWrites': 0, 'results': []}

    def persist():
        report['passed'] = sum(row['passed'] for row in report['results'])
        report['total'] = len(report['results'])
        (args.output / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')

    persist()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True,
            executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            proxy={'server': 'http://127.0.0.1:9', 'bypass': '127.0.0.1,localhost'},
            args=['--disable-background-networking', '--disable-component-update', '--disable-sync',
                  '--no-first-run', '--disable-domain-reliability',
                  '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'])
        try:
            for mode, scenario, orientation in cases:
                name = mode + '-' + scenario + '-' + orientation
                output = args.output / name
                output.mkdir(mode=0o700)
                width, height = VIEWPORTS[orientation]
                context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True,
                    has_touch=True, reduced_motion='reduce', service_workers='block')
                context.tracing.start(screenshots=True, snapshots=True, sources=False)
                checks, calls, writes, sockets, errors, console, held, assets = [], [], [], [], [], [], [], []
                state = {'attempt': 'fault' if scenario in FAULTS else 'hold' if scenario in ['cancel-read', 'back-read'] else 'success',
                         'hold_worker': scenario in ['pdf-cancel', 'pdf-back'], 'saved': None, 'phase': 'setup'}

                def check(label, ok, detail=None):
                    checks.append({'name': label, 'passed': bool(ok), 'detail': detail})

                def reply(route, payload, status=200):
                    route.fulfill(status=status, content_type='application/json', body=json.dumps(payload),
                        headers={'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*',
                                 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS', 'Cache-Control': 'no-store'})

                def local_asset(route):
                    url = urlparse(route.request.url)
                    assets.append(url.path)
                    asset = (dist / unquote(url.path).lstrip('/')).resolve()
                    if not asset.is_relative_to(dist):
                        return route.abort()
                    if not asset.is_file():
                        asset = dist / 'index.html'
                    route.fulfill(status=200, content_type=mimetypes.guess_type(asset.name)[0] or 'application/octet-stream', body=asset.read_bytes())

                def intercept(route):
                    request, url = route.request, urlparse(route.request.url)
                    if (url.scheme, url.netloc) == (origin.scheme, origin.netloc) and request.method in ['GET', 'HEAD']:
                        if state['hold_worker'] and 'pdf.worker' in url.path and url.path.endswith('.mjs'):
                            held.append({'route': route, 'kind': 'worker', 'path': url.path})
                            return
                        return local_asset(route)
                    event = {'method': request.method, 'host': url.hostname, 'path': url.path}
                    calls.append(event)
                    if request.method == 'OPTIONS':
                        event['disposition'] = 'mock-cors'
                        return reply(route, {})
                    if url.path == '/auth/v1/user' and request.method == 'GET':
                        event['disposition'] = 'mock-auth'
                        return reply(route, fake_session()['user'])
                    if '/functions/v1/' in url.path and re.search(r'/scan-food-pairing(?:-v\d+)?$', url.path) and request.method == 'POST':
                        body = request.post_data_json or {}
                        event.update({'disposition': 'mock-food', 'mode': body.get('mode'),
                                      'tile': body.get('scan_region'), 'imageHash': sha(str(body.get('image', '')).encode()),
                                      'attempt': state['attempt']})
                        if state['attempt'] == 'hold' or state['attempt'] == 'fault' and scenario == 'timeout':
                            event['held'] = True
                            held.append({'route': route, 'kind': 'food', 'body': body})
                            return
                        if state['attempt'] == 'fault':
                            event['fault'] = scenario
                            if scenario == 'network':
                                return route.abort('internetdisconnected')
                            if scenario == 'malformed':
                                return reply(route, {'mode': mode, 'dishes': 'INVALID_QA_SCHEMA'})
                            if scenario == 'invalid-model':
                                return reply(route, {'error': 'invalid_model_response', 'retryable': False,
                                                     'message': 'RAW_QA_MODEL_FAILURE'}, 502)
                            status = 402 if scenario == 'quota402' else 429 if scenario == 'quota429' else 500
                            return reply(route, {'error': 'RAW_QA_PROVIDER_FAILURE'}, status)
                        if scenario == 'partial' and body.get('scan_region', {}).get('id') in ['right', 'bottom']:
                            event['fault'] = 'partial-crop'
                            return reply(route, {'error': 'RAW_QA_PARTIAL_FAILURE'}, 500)
                        return reply(route, response_for(body))
                    if url.path == '/rest/v1/user_wines' and request.method in ['POST', 'PATCH']:
                        event['disposition'] = 'mock-save'
                        body = request.post_data_json or {}
                        query = parse_qs(url.query)
                        writes.append({'method': request.method, 'body': body, 'filters': {k: query.get(k) for k in ['id', 'user_id']}})
                        selected = set(query.get('select', [''])[0].split(','))
                        check('Save requests the complete confirmation receipt', RECEIPT_FIELDS <= selected, sorted(selected))
                        if request.method == 'POST':
                            check('Idea insert is exact-owner wishlist, unscored and non-trainable',
                                body.get('user_id') == OWNER and body.get('name') == STYLE and body.get('status') == 'wishlist'
                                and body.get('use_for_profile_training') is False and body.get('sensory_attributes') is None
                                and body.get('matchrim_affinity') is None, body)
                            state['saved'] = {key: body.get(key) for key in RECEIPT_FIELDS - {'id'}}
                            state['saved']['id'] = ROW_ID
                        else:
                            check('Favorite update targets only the saved owner and exact row',
                                body == {'is_favorite': True} and query.get('id') == ['eq.' + ROW_ID]
                                and query.get('user_id') == ['eq.' + OWNER], writes[-1])
                            state['saved'] = {**(state['saved'] or {}), 'is_favorite': True}
                        receipt = copy.deepcopy(state['saved'])
                        if scenario == 'receipt-network':
                            return route.abort('internetdisconnected')
                        if scenario == 'receipt-missing':
                            receipt = None
                        elif scenario == 'receipt-partial':
                            receipt = {'id': ROW_ID}
                        elif scenario == 'receipt-foreign':
                            receipt['user_id'] = FOREIGN
                        elif scenario == 'receipt-name':
                            receipt['name'] = 'Otra idea de control'
                        elif scenario == 'receipt-status':
                            receipt['status'] = 'cellar'
                        elif scenario == 'receipt-favorite':
                            receipt['is_favorite'] = not receipt['is_favorite']
                        elif scenario == 'receipt-training':
                            receipt['use_for_profile_training'] = True
                        elif scenario == 'receipt-sensory':
                            receipt['sensory_attributes'] = {'potencia': 4}
                        elif scenario == 'receipt-affinity':
                            receipt['matchrim_affinity'] = 92
                        elif scenario == 'receipt-update-id' and request.method == 'PATCH':
                            receipt['id'] = '00000000-0000-4000-8000-000000009502'
                        return reply(route, receipt)
                    if '/rest/v1/' in url.path and request.method == 'GET':
                        event['disposition'] = 'mock-read'
                        return reply(route, None if url.path.endswith('/quiz_results') else [])
                    event['disposition'] = 'blocked-unexpected'
                    route.abort('blockedbyclient')

                context.route('**/*', intercept)

                def socket(ws):
                    sockets.append({'host': urlparse(ws.url).hostname, 'blocked': True})
                    ws.close(code=1008, reason='Food95 offline UI control')

                context.route_web_socket('**/*', socket)
                seed = {AUTH_STORAGE: json.dumps(fake_session()), 'matchrim.local_profile_owner.v1': OWNER,
                        'matchrim.onboarding.v2:' + OWNER: json.dumps({'version': 2, 'result': 'skipped'}),
                        'matchrim.scan_privacy_notice.v2': 'accepted'}
                context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);" % json.dumps(seed))
                context.add_init_script('''window.__food95={reads:0,arrayBuffers:0};
                  const Reader=window.FileReader;
                  window.FileReader=class extends Reader {readAsDataURL(file){window.__food95.reads++;return super.readAsDataURL(file)}};
                  const arrayBuffer=File.prototype.arrayBuffer;
                  File.prototype.arrayBuffer=function(){window.__food95.arrayBuffers++;return arrayBuffer.call(this)};
                ''')
                page = context.new_page()
                page.set_default_timeout(12000)
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('console', lambda message: console.append({'type': message.type, 'text': message.text}) if message.type in ['error', 'warning'] else None)
                page.clock.install()

                def layout(stage):
                    dimensions = page.evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})')
                    check(stage + ': no horizontal overflow', dimensions['scrollWidth'] <= dimensions['width'] + 1, dimensions)
                    if urlparse(page.url).path in ['/escanear/menu-comida', '/escanear/plato']:
                        controls = page.get_by_role('main').locator('button').evaluate_all(r'''els=>els.filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden').map(el=>{
                          const r=el.getBoundingClientRect(), brokenWords=[], walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
                          let node;
                          while((node=walker.nextNode()))for(const match of node.textContent.matchAll(/\S+/g)){
                            const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
                            const lines=new Set([...range.getClientRects()].filter(rect=>rect.width>0).map(rect=>Math.round(rect.top*2)/2));
                            if(lines.size>1)brokenWords.push({word:match[0],lines:lines.size});
                          }
                          return {label:el.getAttribute('aria-label')||el.textContent,width:r.width,height:r.height,brokenWords};})''')
                        check(stage + ': native buttons are at least 44px in both dimensions',
                              all(item['height'] >= 43.5 and item['width'] >= 43.5 for item in controls), controls)
                        check(stage + ': native action words remain readable without intra-word fragmentation',
                              all(not item['brokenWords'] for item in controls),
                              [item for item in controls if item['brokenWords']])

                def capture(stage):
                    layout(stage)
                    page.screenshot(path=str(output / (stage + '.png')))
                    (output / (stage + '.txt')).write_text(page.locator('body').inner_text())
                    (output / (stage + '.html')).write_text(page.content())

                def food_calls():
                    return [row for row in calls if row.get('disposition') == 'mock-food']

                def wait_until(predicate, timeout=12000):
                    deadline = time.monotonic() + timeout / 1000
                    while time.monotonic() < deadline:
                        if predicate():
                            return
                        page.wait_for_timeout(25)
                    raise AssertionError('Timed out waiting for an actual held request/worker')

                def release_held():
                    state['hold_worker'] = False
                    for pending in held:
                        if pending.get('released'):
                            continue
                        try:
                            if pending['kind'] == 'food':
                                reply(pending['route'], response_for(pending['body'], stale=True))
                            else:
                                local_asset(pending['route'])
                            pending['released'] = 'fulfilled-after-cancel'
                        except PlaywrightError:
                            pending['released'] = 'already-cancelled'

                def progress():
                    page.get_by_role('button', name='Cancelar análisis de comida', exact=True).wait_for()
                    check('Native progress has no fake percentage/progressbar',
                          page.get_by_role('main').get_by_role('progressbar').count() == 0
                          and not re.search(r'\b\d+\s*%', page.get_by_role('main').inner_text()))
                    page.get_by_role('button', name='Cancelar análisis de comida', exact=True).scroll_into_view_if_needed()
                    capture('02-progress')

                def result_ready():
                    page.get_by_role('heading', name='Resultado', exact=True).wait_for(timeout=20000)
                    page.get_by_test_id('food-row-0').wait_for()
                    page.get_by_role('heading', name='Resultado', exact=True).scroll_into_view_if_needed()
                    page.clock.run_for(180)
                    check('Result stays an unverified style idea, not a personal score',
                        page.get_by_text('Maridajes orientativos, sin puntuación personal', exact=True).count() == 1
                        and page.get_by_text('92%', exact=True).count() == 0
                        and 'RAW_QA_DISH_REASON' not in page.get_by_role('main').inner_text()
                        and 'RESULTADO OBSOLETO QA' not in page.get_by_role('main').inner_text())
                    capture('04-result')

                def navigate_out():
                    if args.back_navigation == 'history':
                        page.go_back(wait_until='domcontentloaded')
                    else:
                        page.get_by_role('button', name='Volver a tipos de escaneo', exact=True).click()
                    page.wait_for_url('**/escanear')

                def return_to_scanner():
                    if args.back_navigation == 'history':
                        page.go_forward(wait_until='domcontentloaded')
                    else:
                        page.go_back(wait_until='domcontentloaded')

                outcome = {'case': name, 'mode': mode, 'scenario': scenario, 'orientation': orientation, 'passed': False}
                try:
                    state['phase'] = 'navigate'
                    path = '/escanear/menu-comida' if mode == 'menu' else '/escanear/plato'
                    if args.back_navigation == 'history' and scenario in ['back-read', 'pdf-back']:
                        page.goto(args.url + '/escanear', wait_until='networkidle')
                        page.get_by_role('button', name=re.compile('^Menú de comida' if mode == 'menu' else '^Plato')).click()
                        page.wait_for_url(args.url + path)
                    else:
                        page.goto(args.url + path, wait_until='networkidle')
                    upload = page.locator('input[type=file]').first
                    upload.wait_for(state='attached', timeout=30000)
                    if orientation == 'text200':
                        page.evaluate("document.documentElement.style.fontSize='200%'")
                    capture('01-entry')
                    state['phase'] = 'upload'
                    if scenario in ['oversize', 'pdf-oversize']:
                        upload.evaluate('''(el,kind)=>{const bytes=new Uint8Array(25*1024*1024+1),pdf=kind==='pdf-oversize';
                          if(pdf)bytes.set(new TextEncoder().encode('%PDF-1.7\\n'));
                          const file=new File([bytes],pdf?'oversize-qa.pdf':'oversize-qa.jpg',{type:pdf?'application/pdf':'image/jpeg'});
                          const data=new DataTransfer();data.items.add(file);el.files=data.files;el.dispatchEvent(new Event('change',{bubbles:true}));}''', scenario)
                    elif scenario == 'pdf-invalid':
                        upload.set_input_files({'name': 'invalid-qa.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.7 INVALID QA CONTROL'})
                    elif scenario == 'pdf-password':
                        upload.set_input_files({'name': 'password-qa.pdf', 'mimeType': 'application/pdf', 'buffer': protected_bytes})
                    else:
                        upload.set_input_files(str(args.pdf_fixture if scenario.startswith('pdf-') else args.image))
                    state['phase'] = 'exercise'
                    if scenario in ['pdf-cancel', 'pdf-back']:
                        wait_until(lambda: any(item['kind'] == 'worker' for item in held))
                        progress()
                        check('Actual PDF worker asset is held before vision', food_calls() == [])
                        if scenario == 'pdf-cancel':
                            page.get_by_role('button', name='Cancelar análisis de comida', exact=True).click()
                            page.get_by_text('Análisis cancelado. El archivo sigue disponible para reintentar.', exact=True).wait_for()
                            check('Cancelled PDF has explicit retained-file retry', page.get_by_role('button', name='Reintentar este archivo', exact=True).is_enabled())
                        else:
                            navigate_out()
                        release_held()
                        page.clock.run_for(400)
                        check('Late worker completion does not call vision or publish a result', not food_calls() and not page.get_by_role('heading', name='Resultado', exact=True).count())
                        capture('03-pdf-cancelled-or-back')
                        if scenario == 'pdf-back':
                            return_to_scanner()
                            upload.wait_for(state='attached')
                            check('Back navigation returns a clean food scanner', not page.get_by_role('button', name='Reintentar este archivo', exact=True).count())
                        else:
                            page.get_by_role('button', name='Reintentar este archivo', exact=True).click()
                            result_ready()
                    elif scenario in ['oversize', 'pdf-oversize', 'pdf-invalid', 'pdf-password']:
                        alert = page.get_by_role('main').get_by_role('alert')
                        alert.wait_for()
                        expected = 'contraseña' if scenario == 'pdf-password' else 'documento' if scenario == 'pdf-invalid' else '25 MB' if scenario == 'pdf-oversize' else 'foto'
                        check('Local input failure has an understandable reason', expected in alert.inner_text(), alert.inner_text())
                        check('Invalid/oversized input never reaches vision', not food_calls())
                        check('Failure allows same-file retry and different input',
                            page.get_by_role('button', name='Reintentar este archivo', exact=True).is_enabled()
                            and page.get_by_role('button', name='Seleccionar otra foto', exact=True).is_enabled())
                        if scenario in ['oversize', 'pdf-oversize']:
                            check('Oversize is rejected before FileReader', page.evaluate('window.__food95.reads') == 0)
                        if scenario == 'pdf-oversize':
                            check('Oversized PDF is rejected before arrayBuffer and worker allocation',
                                  page.evaluate('window.__food95.arrayBuffers') == 0
                                  and not any('pdf.worker' in path for path in assets))
                        alert.scroll_into_view_if_needed()
                        capture('03-input-error')
                        if scenario in ['oversize', 'pdf-oversize']:
                            page.get_by_role('button', name='Reintentar este archivo', exact=True).click()
                            alert.wait_for()
                            check('Oversize explicit retry is still local, before FileReader',
                                  not food_calls() and page.evaluate('window.__food95.reads') == 0)
                        with page.expect_file_chooser() as chosen:
                            page.get_by_role('button', name='Seleccionar otra foto', exact=True).click()
                        chosen.value.set_files(str(args.image))
                        result_ready()
                        check('Choosing another photo recovers without retaining a stale PDF claim',
                              page.get_by_text('PDF: analizada solo la primera página.', exact=True).count() == 0)
                    elif scenario in FAULTS or scenario in ['cancel-read', 'back-read']:
                        if state['attempt'] == 'hold' or scenario == 'timeout':
                            wait_until(lambda: len(food_calls()) >= ((food_calls()[0].get('tile') or {}).get('tile_count', 1) if food_calls() else 1))
                            progress()
                        if scenario in ['cancel-read', 'back-read']:
                            initial_calls = len(food_calls())
                            if scenario == 'cancel-read':
                                page.get_by_role('button', name='Cancelar análisis de comida', exact=True).click()
                                page.get_by_text('Análisis cancelado. El archivo sigue disponible para reintentar.', exact=True).wait_for()
                            else:
                                navigate_out()
                            release_held()
                            page.clock.run_for(400)
                            check('Cancelled/unmounted request cannot publish late results or auto-retry',
                                len(food_calls()) == initial_calls and not page.get_by_role('heading', name='Resultado', exact=True).count())
                            capture('03-cancelled-or-back')
                            if scenario == 'back-read':
                                return_to_scanner()
                                upload.wait_for(state='attached')
                                check('Back returns clean scanner without stale result or retained retry',
                                    not page.get_by_role('heading', name='Resultado', exact=True).count()
                                    and not page.get_by_role('button', name='Reintentar este archivo', exact=True).count())
                            else:
                                state['attempt'] = 'success'
                                page.get_by_role('button', name='Reintentar este archivo', exact=True).click()
                                result_ready()
                        else:
                            if scenario == 'timeout':
                                page.clock.fast_forward(90_100)
                            alert = page.get_by_role('main').get_by_role('alert')
                            alert.wait_for()
                            text = alert.inner_text()
                            expected = 'tardó demasiado' if scenario == 'timeout' else 'conectar' if scenario == 'network' else 'lectura fiable' if scenario in ['invalid-model', 'malformed'] else 'límite de uso' if scenario.startswith('quota') else 'No he podido analizar'
                            check('Consumer error is specific and does not leak raw provider text', expected in text and 'RAW_QA' not in text, text)
                            first = copy.deepcopy(food_calls())
                            tile_ids = [(row.get('tile') or {}).get('id', 'dish') for row in first]
                            prepared = page.get_by_alt_text('Vista previa', exact=True).evaluate(
                                'el=>({width:el.naturalWidth,height:el.naturalHeight})')
                            expected_tiles = ['dish'] if mode == 'dish' else (
                                ['top', 'bottom'] if prepared['height'] > prepared['width'] else ['left', 'right'])
                            if mode == 'menu' and prepared['width'] / prepared['height'] >= 1.3:
                                expected_tiles.append('center')
                            check('One initial request per designed crop, not hidden retries',
                                  sorted(tile_ids) == sorted(expected_tiles),
                                  {'actual': tile_ids, 'expected': expected_tiles, 'preparedImage': prepared})
                            page.clock.run_for(1500)
                            check('No hidden retry after failure', len(food_calls()) == len(first))
                            alert.scroll_into_view_if_needed()
                            capture('03-read-error')
                            release_held()
                            state['attempt'] = 'success'
                            page.get_by_role('button', name='Reintentar este archivo', exact=True).click()
                            result_ready()
                            second = food_calls()[len(first):]
                            signatures = lambda rows: sorted(((row.get('tile') or {}).get('id', 'dish'), row['imageHash']) for row in rows)
                            check('Explicit retry uses the same file/crops once per tile', signatures(first) == signatures(second), {'first': signatures(first), 'retry': signatures(second)})
                    else:
                        result_ready()
                        if scenario == 'pdf-valid':
                            check('Two-page PDF explicitly analyzes only page one', page.get_by_text('PDF: analizada solo la primera página.', exact=True).count() == 1)
                            check('Native PDF worker was requested and fulfilled locally',
                                  any('pdf.worker' in path and path.endswith('.mjs') for path in assets),
                                  [path for path in assets if 'pdf.worker' in path])
                        if scenario == 'partial':
                            check('One failed crop retains partial results and a visible limitation',
                                any(row.get('fault') == 'partial-crop' for row in food_calls())
                                and page.get_by_text('Lectura parcial o sin verificar; revisa la carta original.', exact=True).count() == 1)
                            page.get_by_text('Lectura parcial o sin verificar; revisa la carta original.', exact=True).scroll_into_view_if_needed()
                            capture('05-partial-warning')
                        check('Availability is not invented from food OCR', page.get_by_text('Disponibilidad sin confirmar', exact=True).count() > 0
                              and page.get_by_text('No disponible según la lectura', exact=True).count() > 0
                              and page.get_by_text('Próximamente · no disponible', exact=True).count() > 0
                              and page.get_by_text('Disponibilidad según el día · confirmar', exact=True).count() > 0)
                        blocked = page.locator('[data-testid^=food-row-]').filter(has=page.get_by_text('No disponible según la lectura', exact=True)).first
                        check('Unavailable row has no pairing/save actions', blocked.get_by_role('button').count() == 0)
                        if scenario == 'partial':
                            for tag, label in [('unavailable', 'No disponible según la lectura'),
                                               ('coming-soon', 'Próximamente · no disponible'),
                                               ('conditional', 'Disponibilidad según el día · confirmar')]:
                                available = page.locator('[data-testid^=food-row-]').filter(has=page.get_by_text(label, exact=True)).first
                                available.get_by_test_id('food-availability').scroll_into_view_if_needed()
                                capture('05-availability-' + tag)
                        if scenario in ['save-success', 'favorite-success'] or scenario.startswith('receipt-'):
                            row = page.get_by_test_id('food-row-0')
                            favorite_first = scenario == 'favorite-success'
                            command = row.get_by_role('button', name='Guardar como favorito' if favorite_first else 'Guardar en Quiero Probar', exact=True)
                            command.scroll_into_view_if_needed()
                            command.click(trial=True)
                            capture('05-save-actions')
                            handle = command.element_handle()
                            command.click()
                            handle.evaluate('el=>{el.click();el.click();}')
                            unconfirmed = scenario.startswith('receipt-') and scenario != 'receipt-update-id'
                            if not unconfirmed:
                                row.get_by_role('button', name='En Quiero Probar', exact=True).wait_for()
                                check('Single insert despite repeated input clicks', len(writes) == 1 and writes[0]['method'] == 'POST')
                                check('Insert favorite flag matches the explicit action', writes[0]['body'].get('is_favorite') is favorite_first)
                                if not favorite_first:
                                    row.get_by_role('button', name='Guardar como favorito', exact=True).evaluate('el=>{el.click();el.click();}')
                                    if scenario != 'receipt-update-id':
                                        row.get_by_role('button', name='Favorito', exact=True).wait_for()
                                    check('Favorite is one update, not a duplicate insert', len(writes) == 2 and writes[1]['method'] == 'PATCH')
                                if scenario != 'receipt-update-id':
                                    check('Confirmed idea/favorite is visibly locked against duplicates',
                                        row.get_by_role('button', name='En Quiero Probar', exact=True).is_disabled()
                                        and row.get_by_role('button', name='Favorito', exact=True).is_disabled())
                                    capture('05-confirmed-save')
                            if unconfirmed or scenario == 'receipt-update-id':
                                row.get_by_text('Guardado sin confirmar. Revisa Bodega antes de repetirlo.', exact=True).wait_for()
                                check('Missing/foreign/network/inexact receipt never claims success', row.get_by_role('button', name='Revisar Bodega', exact=True).is_enabled())
                                commands = row.get_by_role('button', name=re.compile('^(Guardar en Quiero Probar|Guardar como favorito|En Quiero Probar)$'))
                                check('Both mutation actions are blocked after an uncertain receipt', commands.count() == 2 and all(commands.nth(i).is_disabled() for i in range(2)))
                                previous = len(writes)
                                commands.evaluate_all('els=>els.forEach(el=>{el.click();el.click();})')
                                page.clock.run_for(250)
                                check('Repeated clicks after uncertain save cannot repeat the mutation', len(writes) == previous)
                                row.get_by_text('Guardado sin confirmar. Revisa Bodega antes de repetirlo.', exact=True).scroll_into_view_if_needed()
                                capture('05-unconfirmed-save')
                                review = row.get_by_role('button', name='Revisar Bodega', exact=True)
                                review.click(trial=True)
                                capture('05-review-action')
                                review.click()
                                page.wait_for_url('**/my-wines')
                                check('Review Bodega is a real navigation action', urlparse(page.url).path == '/my-wines')
                    state['phase'] = 'final-checks'
                    check('No uncaught browser exceptions', errors == [], errors)
                    check('Every external request is explicitly mocked or blocked', all(row.get('disposition') != 'blocked-unexpected' for row in calls), [row for row in calls if row.get('disposition') == 'blocked-unexpected'])
                    check('No real account/provider writes and all sockets blocked', all(row['blocked'] for row in sockets))
                    capture('06-final')
                    outcome['passed'] = all(item['passed'] for item in checks)
                except Exception as error:
                    outcome['error'] = str(error)
                    try:
                        capture('failure')
                    except Exception as capture_error:
                        outcome['captureError'] = str(capture_error)
                finally:
                    outcome.update({'phase': state['phase'], 'checks': checks, 'calls': calls, 'mockWrites': writes,
                                    'pageErrors': errors, 'console': console, 'sockets': sockets,
                                    'localAssets': sorted(set(assets)),
                                    'held': [{key: value for key, value in item.items() if key not in ['route', 'body']} for item in held]})
                    (output / 'result.json').write_text(json.dumps(outcome, indent=2, ensure_ascii=False) + '\n')
                    for pending in held:
                        try:
                            pending['route'].abort()
                        except PlaywrightError:
                            pass
                    context.tracing.stop(path=str(output / 'trace.zip'))
                    context.close()
                    report['results'].append(outcome)
                    persist()
                    print(json.dumps({'case': name, 'passed': outcome['passed'], 'failedChecks': [item['name'] for item in checks if not item['passed']], 'error': outcome.get('error')}, ensure_ascii=False), flush=True)
        finally:
            browser.close()
    report['sourceHashesAfter'] = {name: sha((ROOT / name).read_bytes()) for name in SOURCES}
    report['sourceFilesUnchangedDuringRun'] = source_hashes == report['sourceHashesAfter']
    report['distUnchangedDuringRun'] = asset_hashes == {str(path.relative_to(dist)): sha(path.read_bytes()) for path in sorted(dist.rglob('*')) if path.is_file()}
    persist()
    print(json.dumps({'passed': report['passed'], 'total': report['total'], 'output': str(args.output), 'realOutboundCalls': 0, 'sourceFilesUnchangedDuringRun': report['sourceFilesUnchangedDuringRun'], 'distUnchangedDuringRun': report['distUnchangedDuringRun']}))
    return 0 if report['passed'] == report['total'] and report['distUnchangedDuringRun'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
