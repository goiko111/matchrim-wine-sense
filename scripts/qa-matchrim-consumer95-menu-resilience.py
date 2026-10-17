"""Actual local native menu UI with fully intercepted faults/OCR/catalogue; no hosted calls or recognition claims."""
import argparse
import copy
import hashlib
import io
import importlib.util
import json
import mimetypes
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--catalog', type=Path, required=True)
p.add_argument('--image', type=Path, required=True)
p.add_argument('--build', type=Path, required=True, help='Immutable native build assets; no HTTP requests are forwarded')
p.add_argument('--pdf-fixture', type=Path, help='Reuse an existing synthetic PDF unchanged on follow-up runs')
p.add_argument('--focus-recovery', action='store_true', help='Run 18 image recovery plus all 21 failed-region cases; explicitly omit 15 PDF cases (default retains all 54)')
args = p.parse_args()
legacy_modes = ['same-image-retry', 'regional-retry', 'regional-columns', 'regional-quadrants', 'regional-partial', 'cancel-reading', 'pdf-first-page', 'pdf-cancel', 'pdf-navigate-away', 'pdf-invalid', 'pdf-encrypted']
selected_legacy_modes = legacy_modes[:6] if args.focus_recovery else legacy_modes
legacy_case_count = len(selected_legacy_modes) * 3
omitted_cases = [mode + '-' + orientation for mode in legacy_modes if mode not in selected_legacy_modes
                 for orientation in ['portrait', 'landscape', 'text200']]
assert urlparse(args.url).hostname in {'127.0.0.1', 'localhost'}
args.output.mkdir(parents=True, exist_ok=False)
frozen = {str(path.relative_to(args.build)): path.read_bytes() for path in args.build.rglob('*') if path.is_file()}
assert 'index.html' in frozen
manifest = {path: hashlib.sha256(data).hexdigest() for path, data in frozen.items()}
(args.output / 'build-manifest.json').write_text(json.dumps({'build': str(args.build), 'files': manifest}, indent=2) + '\n')
pdf_path = args.pdf_fixture or args.output / 'synthetic-two-page-control.pdf'
if not args.pdf_fixture:
    pdf = canvas.Canvas(str(pdf_path), pagesize=(595, 842), invariant=1)
    for number in [1, 2]:
        pdf.setFont('Helvetica-Bold', 20)
        pdf.drawString(40, 780, 'CONTROL QA - NO ES UNA CARTA REAL')
        pdf.setFont('Helvetica', 16)
        pdf.drawString(40, 730, 'Pagina %d - primera pagina solamente en el escaner clasico' % number)
        pdf.drawString(40, 680, 'Nombre de control - precio y texto sinteticos')
        pdf.showPage()
    pdf.save()
assert len(PdfReader(str(pdf_path)).pages) == 2
subprocess.run(['pdftoppm', '-f', '1', '-l', '1', '-singlefile', '-scale-to', '1200', '-png', str(pdf_path), str(args.output / 'synthetic-pdf-page1')], check=True, capture_output=True)
encrypted = PdfWriter()
for source_page in PdfReader(str(pdf_path)).pages:
    encrypted.add_page(source_page)
encrypted.encrypt('qa-only-password')
encrypted_bytes = io.BytesIO()
encrypted.write(encrypted_bytes)
catalog = json.loads(args.catalog.read_text())
source = [row for row in catalog['reads'] if row['case'] == 'public-nv-control']
resolver, listing, detail = [row['body'] for row in source]
results = []


def inspect_retry_layout(page, stage, evidence, checks):
    for label in ['Reintentar esta imagen', 'Reintentar la zona pendiente']:
        button = page.get_by_role('button', name=label, exact=True)
        if button.count() != 1 or not button.is_visible():
            continue
        button.scroll_into_view_if_needed()
        metric = button.evaluate(r"""button => {
          const box=button.getBoundingClientRect(), style=getComputedStyle(button), words=[];
          const walker=document.createTreeWalker(button,NodeFilter.SHOW_TEXT);
          for(let node;node=walker.nextNode();){
            for(const match of node.textContent.matchAll(/[\p{L}\p{M}]+/gu)){
              const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
              const rects=[...range.getClientRects()].filter(r=>r.width>.1&&r.height>.1);
              words.push({word:match[0],lines:new Set(rects.map(r=>Math.round(r.top))).size,
                rects:rects.map(r=>({x:r.x,y:r.y,width:r.width,height:r.height})),
                contained:rects.every(r=>r.left>=box.left-1&&r.right<=box.right+1)});
            }
          }
          const icon=button.querySelector('svg')?.getBoundingClientRect();
          return {label:button.innerText,button:{x:box.x,y:box.y,width:box.width,height:box.height},
            fontSize:style.fontSize,rootFontSize:getComputedStyle(document.documentElement).fontSize,
            flexDirection:style.flexDirection,scrollWidth:button.scrollWidth,clientWidth:button.clientWidth,
            icon:icon?{width:icon.width,height:icon.height}:null,words};
        }""")
        metric['stage'] = stage
        evidence.append(metric)
        checks.append({'name': stage + ': retry target is at least 44px: ' + label,
                       'passed': metric['button']['height'] >= 44 and metric['button']['width'] >= 44})
        checks.append({'name': stage + ': retry words stay whole and inside their button: ' + label,
                       'passed': bool(metric['words']) and all(word['lines'] == 1 and word['contained'] for word in metric['words'])
                       and metric['scrollWidth'] <= metric['clientWidth'] + 1})
        if label == 'Reintentar la zona pendiente':
            checks.append({'name': stage + ': pending-region retry icon stays physically 20px: ' + label,
                           'passed': bool(metric['icon']) and abs(metric['icon']['width'] - 20) <= 1
                           and abs(metric['icon']['height'] - 20) <= 1})
        # Do not abort behavioral recovery checks on a layout failure. The case's
        # final aggregate retains both verdicts and the original call/cache proof.


def failed_region_cases(browser):
    spec = importlib.util.spec_from_file_location('existing_d_transport', Path(__file__).with_name('qa-matchrim-consumer95-journeys.py'))
    d = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(d)
    persona = {'id': 'SYN-MENU95', 'base': {'potente': 2, 'acidez': 4, 'dulce': 1, 'tanico': 0, 'afrutado': 1}}
    persona['expectedQuiz'] = dict(persona['base'])
    modes = ['failed-only-success', 'failed-only-repeat-error', 'failed-only-cancel-late',
             'failed-only-owner-late', 'failed-only-unmount-late', 'failed-only-newfile-late', 'failed-only-clear']
    for mode in modes:
        for orientation in ['portrait', 'landscape', 'text200']:
            width, height = {'portrait': (393, 852), 'landscape': (852, 393), 'text200': (320, 700)}[orientation]
            context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True,
                                          has_touch=True, service_workers='block', reduced_motion='reduce')
            context.add_init_script("""(() => {
              window.CapacitorCustomPlatform={name:'ios'};
              document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize='%s';});
              localStorage.setItem('matchrim.local_profile_owner.v1','anonymous');
              localStorage.setItem('matchrim.onboarding.v2:anonymous',JSON.stringify({version:2,result:'skipped'}));
              localStorage.setItem('matchrim.scan_privacy_notice.v2','accepted');
              localStorage.setItem('matchrim_quiz_result',JSON.stringify({potente:2,acidez:4,dulce:1,tanico:0,afrutado:1}));
            })();""" % ('32px' if orientation == 'text200' else '16px'))
            tr = d.Transport(frozen, args.url, persona, 950, authenticated=False)
            calls, held, errors, checks, snapshots, release_errors, layout = [], [], [], [], [], [], []
            state = {'phase': 'initial', 'failed': 'top-left'}
            case = mode + '-' + orientation
            page = context.new_page()
            page.set_default_timeout(15000)
            page.on('pageerror', lambda error: errors.append(str(error)))
            context.route_web_socket('**', tr.websocket)

            def payload(tile, fresh=False):
                name = 'Nueva carta sintetica QA95' if fresh else 'Vino QA95 zona ' + tile['id']
                wine = {'nombre': name, 'productor': 'Productor sintetico QA95', 'anada': None,
                        'tipo': 'Tinto', 'confidence': .78, 'dudas': [], 'campos_inferidos': [],
                        'texto_fuente': name + ' Productor sintetico QA95', 'precio': None}
                return {'vinos': [wine], 'layout': 'rows', 'coverage': {'status': 'reported_complete', 'extracted_wines': 1}}

            def intercept(route):
                url = urlparse(route.request.url)
                if '/functions/v1/scan-wine-menu-v72' in url.path and route.request.method == 'POST':
                    body = route.request.post_data_json
                    tile = body['scan_region']
                    call = {'tile': tile, 'image_sha256': hashlib.sha256(str(body['image']).encode()).hexdigest(),
                            'fixture': body.get('qa_fixture_name'), 'phase': state['phase'], 'status': None}
                    calls.append(call)
                    if state['phase'] == 'fresh':
                        call['status'] = 200
                        return tr.finish(route, payload(tile, fresh=True))
                    if state['phase'] == 'hold':
                        held.append((route, tile, call))
                        return
                    failure = tile['id'] == 'full' or (tile['id'] == state['failed'] and state['phase'] in ['initial', 'repeat-error'])
                    call['status'] = 500 if failure else 200
                    return tr.finish(route, {'error': 'Signal timed out.', 'vinos': []} if failure else payload(tile), call['status'])
                if url.hostname == 'app.winerim.com':
                    assert route.request.method == 'GET'
                    return tr.finish(route, {'results': [], 'wines': [], 'data': []})
                return tr.route(route)

            context.route('**/*', intercept)

            def check(name, condition):
                checks.append({'name': name, 'passed': bool(condition)})

            def cache(capture=False):
                return page.evaluate("""capture => {
                  if(capture){
                    const input=document.querySelector('input[type=file]');
                    let fiber=input?.[Object.keys(input).find(k=>k.startsWith('__reactFiber$'))];
                    for(;fiber;fiber=fiber.return) for(let hook=fiber.memoizedState;hook&&typeof hook==='object';hook=hook.next){
                      const ref=hook.memoizedState, value=ref?.current;
                      if(value?.file instanceof File&&Array.isArray(value.successful)&&Array.isArray(value.failed)) {
                        window.__menuCacheReadOnly95=ref;window.__menuCacheOwnerFiber95=fiber;
                      }
                    }
                  }
                  const ref=window.__menuCacheReadOnly95;
                  if(!ref)return {observed:false};
                  const value=ref.current;
                  return {observed:true,present:!!value,file:value?.file?.name,owner:value?.ownerId,
                    successful:value?.successful?.map(x=>x.tile.id),failed:value?.failed?.map(x=>x.id)};
                }""", capture)

            def capture(stage):
                inspect_retry_layout(page, stage, layout, checks)
                snapshots.append({'stage': stage, 'cache': cache(), 'cards': page.locator('button[aria-label^="Abrir vino "]').get_attribute('aria-label')
                                  if page.locator('button[aria-label^="Abrir vino "]').count() == 1 else page.locator('button[aria-label^="Abrir vino "]').evaluate_all('els=>els.map(e=>e.getAttribute("aria-label"))')})
                page.screenshot(path=str(args.output / (case + '-' + stage + '.png')), full_page=True)
                (args.output / (case + '-' + stage + '.aria.txt')).write_text(page.locator('body').aria_snapshot())

            def observe_abort_cache():
                return page.evaluate("""() => {
                  window.__menuAbortCacheObservations95=[];let count=0;
                  const fiber=window.__menuCacheOwnerFiber95;
                  for(let hook=fiber?.memoizedState;hook&&typeof hook==='object';hook=hook.next){
                    const value=hook.memoizedState?.current;
                    if(value instanceof AbortController&&!value.signal.aborted){
                      count++;value.signal.addEventListener('abort',()=>{
                        const cache=window.__menuCacheReadOnly95?.current;
                        window.__menuAbortCacheObservations95.push({present:!!cache,
                          successful:cache?.successful?.map(x=>x.tile.id),failed:cache?.failed?.map(x=>x.id)});
                      },{once:true});
                    }
                  }
                  return count;
                }""")

            def quiet_count(expected):
                page.wait_for_timeout(1500)
                check('No automatic paid retry: request count remains ' + str(expected), len(calls) == expected)

            def cards(expected):
                page.wait_for_function('(n)=>document.querySelectorAll(\'button[aria-label^="Abrir vino "]\').length===n', arg=expected)
                labels = page.locator('button[aria-label^="Abrir vino "]').evaluate_all('els=>els.map(e=>e.getAttribute("aria-label"))')
                for tile in expected_ids if expected == 4 else expected_ids - {state['failed']}:
                    check('Retained reference remains present: ' + tile, sum('Vino QA95 zona ' + tile in label for label in labels) == 1)

            def release_late():
                for route, tile, call in held:
                    try:
                        call['status'] = 200
                        tr.finish(route, payload(tile))
                    except Exception as error:
                        release_errors.append(str(error))
                held.clear()
                page.wait_for_timeout(500)

            try:
                page.goto(args.url + '/escanear/carta-vinos', wait_until='networkidle')
                page.locator('input[type=file]').first.set_input_files(str(args.image))
                page.get_by_role('main').get_by_text('La lectura tardó demasiado. Puedes reintentar la foto o analizarla por zonas más pequeñas.', exact=True).wait_for()
                quiet_count(1)
                page.get_by_label('Dividir imagen', exact=True).click()
                page.get_by_role('option', name='Cuatro zonas · carta muy densa', exact=True).click()
                page.get_by_role('button', name='Analizar por zonas', exact=True).click()
                expected_ids = {'top-left', 'top-right', 'bottom-left', 'bottom-right'}
                page.get_by_role('button', name='Reintentar la zona pendiente', exact=True).wait_for()
                check('Initial four crops: one500 and three200, no hidden full pass', len(calls) == 5 and {x['tile']['id'] for x in calls[1:]} == expected_ids
                      and sorted(x['status'] for x in calls[1:]) == [200, 200, 200, 500])
                cards(3)
                cached = cache(True)
                check('Read-only ref probe observes precisely three successful and one failed region', cached.get('observed') and len(cached['successful']) == 3 and cached['failed'] == ['top-left'])
                check('Partial coverage stays explicit', '1 de 4 zonas no se han podido leer' in page.locator('body').inner_text())
                capture('partial')
                quiet_count(5)
                failed = next(call for call in calls[1:] if call['status'] == 500)
                if mode == 'failed-only-clear':
                    page.get_by_role('button', name='Quitar carta', exact=True).click()
                    check('Clear removes partial cache and retry controls', cache().get('present') is False and page.get_by_role('button', name='Reintentar la zona pendiente', exact=True).count() == 0)
                else:
                    state['phase'] = 'success' if mode == 'failed-only-success' else 'repeat-error' if mode == 'failed-only-repeat-error' else 'hold'
                    page.get_by_role('button', name='Reintentar la zona pendiente', exact=True).click()
                    deadline = time.monotonic() + 15
                    while len(calls) < 6 and time.monotonic() < deadline:
                        page.wait_for_timeout(25)
                    check('Explicit pending-zone click sends ONLY one request for the exact same tile/image/file', len(calls) == 6 and calls[-1]['tile'] == failed['tile']
                          and calls[-1]['image_sha256'] == failed['image_sha256'] and calls[-1]['fixture'] == failed['fixture'])
                    if mode == 'failed-only-success':
                        cards(4)
                        check('Recovered region merges retained three and consumes cache', cache().get('present') is False and page.get_by_role('button', name='Reintentar la zona pendiente', exact=True).count() == 0)
                    elif mode == 'failed-only-repeat-error':
                        page.get_by_role('button', name='Reintentar la zona pendiente', exact=True).wait_for()
                        cards(3)
                        check('Repeated failure stays partial with identical three successes', cache()['failed'] == ['top-left'] and len(cache()['successful']) == 3)
                        quiet_count(6)
                        state['phase'] = 'success'
                        page.get_by_role('button', name='Reintentar la zona pendiente', exact=True).click()
                        cards(4)
                        check('Third explicit action again reads only the failed tile', len(calls) == 7 and calls[-1]['tile'] == failed['tile'] and calls[-1]['image_sha256'] == failed['image_sha256'])
                    else:
                        if mode in ['failed-only-cancel-late', 'failed-only-newfile-late']:
                            observers = observe_abort_cache()
                            check('Actual active scanner abort signal is observable without replacing its controller', observers >= 1)
                            page.get_by_role('button', name='Cancelar análisis', exact=True).click()
                            at_abort = page.evaluate('window.__menuAbortCacheObservations95')
                            snapshots.append({'stage': 'abort-event', 'cacheObservations': at_abort})
                            check('Partial cache is already empty when the actual abort event is observed', len(at_abort) >= 1
                                  and all(row['present'] is False for row in at_abort))
                            page.get_by_text('Análisis cancelado. Puedes reintentarlo con la misma imagen o elegir otra.', exact=True).wait_for(timeout=3000)
                            if mode == 'failed-only-cancel-late':
                                capture('cancelled')
                                check('Cancellation immediately clears the retained partial cache', cache().get('present') is False)
                            else:
                                state['phase'] = 'fresh'
                                page.locator('input[type=file]').first.set_input_files({'name': 'new-synthetic-menu95.png', 'mimeType': 'image/png', 'buffer': args.image.read_bytes()})
                                page.get_by_role('button', name=re.compile(r'^Abrir vino 1:.*Nueva carta sintetica QA95')).wait_for()
                                check('New file starts one full pass without inherited region cache', len(calls) == 7 and calls[-1]['tile']['id'] == 'full' and cache().get('present') is False)
                        elif mode == 'failed-only-owner-late':
                            tr.active = 0
                            session = tr.sessions[0]
                            page.evaluate("""([key,session])=>{localStorage.setItem(key,JSON.stringify(session));const channel=new BroadcastChannel(key);channel.postMessage({event:'SIGNED_IN',session});channel.close();}""", [d.AUTH_KEY, session])
                            page.wait_for_function('(id)=>localStorage.getItem("matchrim.local_profile_owner.v1")===id', arg=session['user']['id'])
                            check('Actual SDK owner notification clears partial cache', cache().get('present') is False)
                        else:
                            page.get_by_role('link', name='Inicio', exact=True).click()
                            page.get_by_role('heading', name='¿Qué quieres elegir?', exact=True).wait_for()
                            check('Unmount cleanup clears the observed cache ref', cache().get('present') is False)
                        release_late()
                        check('Late response cannot restore old regional references', page.locator('button[aria-label^="Abrir vino "]').filter(has_text=re.compile('Vino QA95 zona')).count() == 0 and cache().get('present') is False)
                        if mode == 'failed-only-newfile-late':
                            check('Late old response cannot displace the new file result', page.get_by_role('button', name=re.compile(r'^Abrir vino 1:.*Nueva carta sintetica QA95')).count() == 1)
                quiet_count(7 if mode in ['failed-only-repeat-error', 'failed-only-newfile-late'] else 5 if mode == 'failed-only-clear' else 6)
                check('No horizontal viewport overflow', not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'))
                check('No uncaught browser errors', errors == [])
                check('No unmodeled transport/account/provider surface', tr.safety_errors == [] and tr.unmodeled == [])
                capture('final')
                assert all(row['passed'] for row in checks), '; '.join(row['name'] for row in checks if not row['passed'])
                results.append({'case': case, 'passed': True, 'checks': checks, 'intercepted_calls': calls, 'cache_snapshots': snapshots, 'lateReleaseTransportErrors': release_errors, 'retryLayout': layout})
            except Exception as failure:
                capture('failure')
                results.append({'case': case, 'passed': False, 'error': str(failure), 'checks': checks, 'calls': calls,
                                'cache_snapshots': snapshots, 'errors': errors, 'safetyErrors': tr.safety_errors, 'unmodeled': tr.unmodeled, 'retryLayout': layout})
            finally:
                for route, _, _ in held:
                    try:
                        route.abort()
                    except Exception:
                        pass
                context.unroute_all(behavior='wait')
                context.close()
            (args.output / 'report.json').write_text(json.dumps({'scope': __doc__, 'focusRecovery': args.focus_recovery,
              'legacyCases': legacy_case_count, 'legacyFullTotal': 33, 'notRun': omitted_cases, 'newCases': len(results) - legacy_case_count,
              'passed': sum(row['passed'] for row in results), 'total': len(results), 'realOutboundCalls': 0, 'results': results}, indent=2, ensure_ascii=False) + '\n')


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for mode in selected_legacy_modes:
            for orientation in ['portrait', 'landscape', 'text200']:
                width, height = {'portrait': (393, 852), 'landscape': (852, 393), 'text200': (320, 700)}[orientation]
                context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True,
                                              service_workers='block', reduced_motion='reduce')
                context.add_init_script("""
                  window.CapacitorCustomPlatform={name:'ios'};
                  localStorage.setItem('matchrim.local_profile_owner.v1','anonymous');
                  localStorage.setItem('matchrim.onboarding.v2:anonymous',JSON.stringify({version:2,result:'skipped'}));
                  localStorage.setItem('matchrim.scan_privacy_notice.v2','accepted');
                  localStorage.setItem('matchrim_quiz_result',JSON.stringify({potente:2,acidez:4,dulce:1,tanico:0,afrutado:1}));
                """)
                context.route_web_socket('**', lambda socket: socket.close())
                calls, held, errors, checks, blocked, layout = [], [], [], [], [], []
                state = {'worker_held': False, 'cancelled': False}

                def intercept(route):
                    request, url = route.request, urlparse(route.request.url)
                    if url.netloc == urlparse(args.url).netloc:
                        if mode in ['pdf-cancel', 'pdf-navigate-away'] and 'pdf.worker' in url.path:
                            held.append(route)
                            state['worker_held'] = True
                            return
                        key = url.path.lstrip('/')
                        key = key if key in frozen else 'index.html' if request.is_navigation_request() else None
                        if key is None:
                            return route.fulfill(status=404, body='Frozen local asset missing')
                        return route.fulfill(status=200, body=frozen[key], content_type=mimetypes.guess_type(key)[0] or 'application/octet-stream')
                    payload, status = ([] if '/rest/v1/' in url.path else {}), 200
                    if '/functions/v1/scan-wine-menu-v72' in url.path:
                        body = request.post_data_json or {}
                        calls.append({'tile': body.get('scan_region'), 'image_sha256': hashlib.sha256(str(body.get('image', '')).encode()).hexdigest()})
                        if mode == 'cancel-reading' and not state['cancelled']:
                            held.append(route)
                            return
                        if len(calls) == 1 and mode in ['same-image-retry', 'regional-retry', 'regional-columns', 'regional-quadrants', 'regional-partial']:
                            status, payload = 500, {'error': 'Signal timed out.', 'vinos': []}
                        elif mode == 'regional-partial' and len(calls) == 3:
                            status, payload = 500, {'error': 'Signal timed out.', 'vinos': []}
                        else:
                            second = mode in ['regional-retry', 'regional-columns', 'regional-quadrants'] and len(calls) >= 3
                            control_name = 'Control distinto ' + str(len(calls))
                            wine = {'nombre': control_name if second else detail['name'], 'productor': 'Bodega Ejemplo' if second else detail['winery'],
                                    'anada': None, 'region': None if second else detail['region'], 'pais': None if second else detail['country'],
                                    'confidence': .78, 'dudas': [], 'campos_inferidos': [], 'precio': None, 'tipo': 'Generoso', 'descripcion': None,
                                    'texto_fuente': control_name + ' Bodega Ejemplo' if second else detail['name'] + ' ' + detail['winery'], 'posicion': None}
                            payload = {'vinos': [wine], 'layout': 'rows', 'coverage': {'status': 'reported_complete', 'extracted_wines': 1}}
                    elif url.hostname == 'app.winerim.com':
                        assert request.method == 'GET'
                        payload = resolver if url.path.endswith('/slugname') else listing if 'text=' in url.query else detail
                        payload = copy.deepcopy(payload)
                    elif url.hostname != 'cbjynrbvrhcmpaojmqdp.supabase.co':
                        blocked.append({'host': url.hostname, 'path': url.path, 'method': request.method})
                        return route.abort()
                    route.fulfill(status=status, content_type='application/json', body=json.dumps(payload), headers={'Access-Control-Allow-Origin': '*'})

                context.route('**/*', intercept)
                page = context.new_page()
                page.set_default_timeout(15000)
                page.on('pageerror', lambda failure: errors.append(str(failure)))
                case = mode + '-' + orientation

                def check(name, condition):
                    checks.append({'name': name, 'passed': bool(condition)})
                    assert condition, name

                try:
                    page.goto(args.url + '/escanear/carta-vinos', wait_until='networkidle')
                    page.locator('input[type=file]').first.wait_for(state='attached', timeout=30000)
                    if orientation == 'text200':
                        page.evaluate("document.documentElement.style.fontSize='200%'")
                    selected = str(pdf_path) if mode.startswith('pdf-') else str(args.image)
                    if mode == 'pdf-invalid':
                        selected = {'name': 'invalid-qa.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.7 not a valid document'}
                    elif mode == 'pdf-encrypted':
                        selected = {'name': 'password-qa.pdf', 'mimeType': 'application/pdf', 'buffer': encrypted_bytes.getvalue()}
                    page.locator('input[type=file]').first.set_input_files(selected)
                    if mode in ['pdf-cancel', 'pdf-navigate-away']:
                        page.get_by_text('Convirtiendo PDF a imagen...', exact=True).wait_for()
                        page.get_by_role('button', name='Cancelar análisis', exact=True).wait_for()
                        page.screenshot(path=str(args.output / (case + '-conversion.png')))
                        if mode == 'pdf-cancel':
                            began = time.monotonic()
                            page.get_by_role('button', name='Cancelar análisis', exact=True).click()
                            page.get_by_text('Conversión cancelada. El PDF sigue disponible para reintentar.', exact=True).wait_for(timeout=3000)
                            check('PDF cancellation settles promptly without reading a wine', time.monotonic() - began < 3.5 and calls == [])
                            check('The same PDF remains retryable', page.get_by_role('button', name='Reintentar esta imagen', exact=True).count() == 1)
                        else:
                            page.get_by_role('link', name='Inicio', exact=True).click()
                            page.get_by_role('heading', name='¿Qué quieres elegir?', exact=True).wait_for()
                            page.wait_for_timeout(300)
                            check('Navigation cancels PDF conversion before any provider request', calls == [])
                    elif mode in ['pdf-invalid', 'pdf-encrypted']:
                        page.get_by_text('No ha salido un escaneo útil', exact=True).wait_for()
                        check('Invalid or protected PDF never reaches vision', calls == [])
                        if mode == 'pdf-encrypted':
                            check('Password restriction is explained without asking for a password', 'elimina la contrasena' in page.locator('body').inner_text())
                        check('A different file can be chosen', page.get_by_role('button', name='Elegir otra imagen o PDF', exact=True).count() == 1)
                    else:
                        if mode == 'cancel-reading':
                            page.wait_for_function('() => document.body.innerText.includes("Cancelar análisis")')
                            deadline = time.monotonic() + 15
                            while not calls and time.monotonic() < deadline:
                                page.wait_for_timeout(25)
                            check('Cancellation occurs during an actual pending request', len(calls) == 1)
                            page.get_by_role('button', name='Cancelar análisis', exact=True).click()
                            state['cancelled'] = True
                            page.get_by_text('Análisis cancelado. Puedes reintentarlo con la misma imagen o elegir otra.', exact=True).wait_for()
                            check('Cancellation retains the input and requires an explicit retry', len(calls) == 1)
                            inspect_retry_layout(page, 'cancelled', layout, checks)
                            page.get_by_role('button', name='Reintentar esta imagen', exact=True).click()
                        elif mode != 'pdf-first-page':
                            page.get_by_role('main').get_by_text('La lectura tardó demasiado. Puedes reintentar la foto o analizarla por zonas más pequeñas.', exact=True).wait_for()
                            check('No raw provider error reaches the consumer', 'Signal timed out' not in page.locator('body').inner_text())
                            check('There is no automatic paid retry', len(calls) == 1)
                            inspect_retry_layout(page, 'before-retry', layout, checks)
                            page.screenshot(path=str(args.output / (case + '-before-retry.png')))
                            if mode in ['regional-columns', 'regional-quadrants']:
                                page.get_by_label('Dividir imagen', exact=True).click()
                                page.get_by_role('option', name='Izquierda y derecha · dos páginas' if mode == 'regional-columns' else 'Cuatro zonas · carta muy densa', exact=True).click()
                            page.get_by_role('button', name='Reintentar esta imagen' if mode == 'same-image-retry' else 'Analizar por zonas', exact=True).click()
                        page.get_by_role('button', name=re.compile(r'^Abrir vino 1:')).wait_for(timeout=30000)
                        page.wait_for_timeout(250)
                        if mode in ['same-image-retry', 'cancel-reading']:
                            check('Retry reuses exactly the same prepared image', len(calls) == 2 and calls[0]['image_sha256'] == calls[1]['image_sha256'])
                        elif mode in ['regional-retry', 'regional-columns', 'regional-quadrants', 'regional-partial']:
                            expected_ids = {'top-left', 'top-right', 'bottom-left', 'bottom-right'} if mode == 'regional-quadrants' else {'left', 'right'} if mode == 'regional-columns' else None
                            actual_ids = {row['tile']['id'] for row in calls[1:]}
                            check('Explicit regional reading has no hidden full pass', len(calls) == (5 if mode == 'regional-quadrants' else 3) and (actual_ids == expected_ids if expected_ids else actual_ids in [{'left', 'right'}, {'top', 'bottom'}]))
                            check('Regional crops are separate inputs', len({row['image_sha256'] for row in calls[1:]}) == len(calls) - 1)
                            if mode == 'regional-partial':
                                check('One failed region remains a visible coverage limitation', '1 de 2 zonas no se han podido leer' in page.locator('body').inner_text() and 'la carta no está completa' in page.locator('body').inner_text())
                            else:
                                check('Distinct regional references remain distinct, including numeric variants', page.locator('button[aria-label^="Abrir vino "]').count() == len(calls) - 1)
                        elif mode == 'pdf-first-page':
                            check('Classic PDF explicitly stays on the first page', len(calls) == 1 and 'PDF: primera página' in page.locator('body').inner_text())
                        if mode not in ['regional-retry', 'regional-columns', 'regional-quadrants', 'regional-partial']:
                            page.get_by_role('button', name=re.compile(r'^Abrir vino 1:')).click()
                            page.get_by_label('Afinidad orientativa: 93 de 100', exact=True).wait_for()
                            check('Verified personal explanation survives recovery', page.get_by_text('Encaja mucho contigo', exact=True).count() == 1)
                    check('No horizontal viewport overflow', not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'))
                    check('No uncaught browser errors', errors == [])
                    check('No unmodeled remote network surface', blocked == [])
                    page.screenshot(path=str(args.output / (case + '.png')))
                    (args.output / (case + '-text.txt')).write_text(page.locator('body').inner_text())
                    assert all(row['passed'] for row in checks), '; '.join(row['name'] for row in checks if not row['passed'])
                    results.append({'case': case, 'passed': True, 'checks': checks, 'intercepted_calls': calls, 'worker_held': state['worker_held'], 'retryLayout': layout})
                except Exception as failure:
                    page.screenshot(path=str(args.output / (case + '-failure.png')))
                    results.append({'case': case, 'passed': False, 'error': str(failure), 'checks': checks, 'calls': calls, 'errors': errors, 'blocked': blocked, 'retryLayout': layout})
                finally:
                    for pending_route in held:
                        try:
                            pending_route.abort()
                        except Exception:
                            pass
                    context.unroute_all(behavior='wait')
                    context.close()
                (args.output / 'report.json').write_text(json.dumps({'scope': __doc__, 'focusRecovery': args.focus_recovery,
                  'legacyCases': legacy_case_count, 'legacyFullTotal': 33, 'notRun': omitted_cases,
                  'passed': sum(row['passed'] for row in results), 'total': len(results), 'realOutboundCalls': 0, 'results': results}, indent=2, ensure_ascii=False) + '\n')
        if args.focus_recovery:
            assert len(results) == 18 and len(omitted_cases) == 15, 'Focused run retains all 18 image cases and explicitly lists omitted PDF cases'
        else:
            assert len(results) == 33, 'The original 33 cases and their failures must be retained'
        failed_region_cases(browser)
        assert manifest == {str(path.relative_to(args.build)): hashlib.sha256(path.read_bytes()).hexdigest() for path in args.build.rglob('*') if path.is_file()}, 'Frozen build changed during QA'
    finally:
        browser.close()
print(json.dumps({'passed': sum(row['passed'] for row in results), 'total': len(results), 'failures': [{'case': row['case'], 'error': row['error']} for row in results if not row['passed']]}, ensure_ascii=False))
raise SystemExit(0 if all(row['passed'] for row in results) else 1)
