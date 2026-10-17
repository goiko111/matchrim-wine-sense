"""Frozen Consumer95 label UI contracts. Synthetic OCR/catalog/profile, not recognition metrics or native-device QA."""
import argparse
import copy
import hashlib
import json
import mimetypes
import re
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.sync_api import Error as PlaywrightError, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
FROZEN = [
    'src/components/wine-import/MultiWineLabelScanner.tsx', 'src/utils/multiWineConsumer95.ts',
    'src/components/AffinityExplanation.tsx', 'src/components/AiRimContextGuide.tsx',
    'src/components/NativeAffinitySummary.tsx', 'src/utils/consumerAffinity95.ts',
    'src/components/WinerimCandidatePicker95.tsx', 'src/utils/winerimCandidateSearch95.ts',
    'src/utils/confirmedCatalogIdentity95.ts', 'src/utils/winerimOriginalSheet.ts',
    'src/components/WinerimOriginalSheet.tsx', 'src/components/WinerimSheetLookup.tsx',
    'src/utils/multiWineScan.ts', 'src/utils/scanWineEvidence.ts',
    'src/utils/wineAffinityExplanation.ts', 'src/utils/winerimLabelIdentity.ts',
    'src/services/winerimApi.ts', 'src/utils/imageAnalysis.ts',
    'src/components/ui/button.tsx', 'src/components/ui/input.tsx', 'src/components/ui/drawer.tsx',
    'src/hooks/useOverlayViewport.ts', 'src/lib/nativeKeyboardViewport.ts',
    'src/main.tsx', 'src/index.css',
]
BUILD_CONFIG = {
    'VITE_MATCHRIM_EDGE_RELEASE': '75', 'VITE_SUPABASE_DB_SCHEMA': 'public',
    'VITE_MATCHRIM_QA_FIXTURES': 'false', 'VITE_APP_ANALYTICS_ENABLED': 'false',
    'VITE_MATCHRIM_NATIVE_GUIDE_ENABLED': 'true', 'VITE_MATCHRIM_ONBOARDING_PREVIEW': 'false',
}
MODES = ['owner-pago', 'multi-top2', 'unreadable', 'not-wine', 'duplicates',
         'verified-edit', 'catalog-retry', 'catalog-cancel', 'long-name']
VIEWPORTS = {'portrait': (393, 852), 'landscape': (852, 393), 'text200': (320, 700)}
PROFILE = {'potente': 4, 'acidez': 3, 'dulce': 1, 'tanico': 4, 'afrutado': 3}
SENSORY = {'power': 4, 'acidity': 3, 'sweetness': 1, 'tannin': 4, 'fruity': 3}
KEYBOARD_HEIGHTS = {'portrait': 352, 'landscape': 163, 'text200': 270}
KEYBOARD_BRIDGE = '''
// Synthetic transport only: callbacks are registered by the actual frozen app.
window.__labelKeyboardListeners = new Map();
window.__labelKeyboardCalls = [];
window.Capacitor = {
  PluginHeaders: [{name:'Keyboard', methods:[
    {name:'addListener',rtype:'callback'}, {name:'removeListener',rtype:'promise'},
    {name:'setAccessoryBarVisible',rtype:'promise'}]}],
  nativePromise: async (plugin,method,options) => {
    window.__labelKeyboardCalls.push({plugin,method,options});
    if(plugin!=='Keyboard')throw new Error('Unexpected synthetic native plugin');
    if(method==='removeListener')window.__labelKeyboardListeners.delete(options.eventName);
  },
  nativeCallback: (plugin,method,options,callback) => {
    if(plugin!=='Keyboard'||method!=='addListener')throw new Error('Unexpected synthetic native callback');
    window.__labelKeyboardListeners.set(options.eventName,callback);
    return 'label-qa-'+options.eventName;
  }
};
window.__labelKeyboardEvent = (name,height) => {
  const callback=window.__labelKeyboardListeners.get(name);
  if(!callback)throw new Error('Frozen app did not register '+name);
  callback({keyboardHeight:height});
};
'''


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def wine(name='Pago de Cirsus', producer='Pago de Cirsus', *, uncertain=True):
    return {
        'name': name, 'producer': producer, 'vintage': 2021, 'region': 'Navarra', 'country': 'Spain',
        'grapes': [], 'confidence': .78, 'source': 'label',
        'evidence': [f'Texto visible: {name}', f'Bodega visible: {producer}'],
        'uncertainty_reasons': ['Lectura parcial en la etiqueta.'] if uncertain else [],
        'inferred_fields': ['sensory_attributes'], 'affinity': None, 'affinity_confidence': None,
        'affinity_reason': 'INFERRED_QA_SENTINEL: sus taninos y fruta encajan contigo.',
        'sensory_attributes': {'potencia': 4, 'acidez': 3, 'dulzura': 1, 'taninos': 4,
                               'afrutado': 3, 'madera': 4, 'intensidad': 4},
    }


def contract(mode):
    pago = wine(uncertain=mode != 'verified-edit')
    unreadable = {'candidates': [], 'recognition_status': 'unreadable', 'fallback': {
        'code': 'insufficient_visible_text', 'message': 'No hay texto legible suficiente para identificar este vino.',
        'suggested_actions': ['Acerca la camara a una sola etiqueta.']}}
    not_wine = {'candidates': [], 'recognition_status': 'not_wine', 'fallback': {
        'code': 'not_wine', 'message': 'La bebida visible no se ha identificado como vino.',
        'suggested_actions': ['Descarta esta bebida o revisa otra etiqueta.']}}
    second = wine('Reserva de los Viñedos de la Sierra de la Cueva del Mar', 'Bodegas Sierra del Mar')
    second['confidence'] = .51
    alternative = wine('Gran Reserva de la Sierra', 'Bodegas Sierra del Mar')
    alternative['confidence'] = .43
    if mode == 'multi-top2':
        results = [{'candidates': [pago]}, {'candidates': [second, alternative]},
                   {'candidates': [copy.deepcopy(pago)]}, unreadable, not_wine]
    elif mode == 'duplicates':
        results = [{'candidates': [pago]}, {'candidates': [copy.deepcopy(pago)]}]
    elif mode in ['unreadable', 'not-wine']:
        results = [unreadable if mode == 'unreadable' else not_wine]
    elif mode == 'long-name':
        results = [{'candidates': [wine('PagoDeCirsusReservaDeLaSierra' * 9, 'BodegaDeLaSierra' * 9)]}]
    else:
        results = [{'candidates': [pago]}]
    count = len(results)
    regions = [{'box': {'x': 3 + i * 94 / count, 'y': 12, 'width': min(70, 88 / count), 'height': 70},
                'confidence': .99, 'object_type': 'bottle',
                'quality': {'glare': 'low', 'occlusion': 'low', 'legibility': 'good'}} for i in range(count)]
    return {'coverage': {'status': 'reported_complete', 'detected_objects': count,
                         'estimated_visible_objects': count, 'confidence': .99,
                         'notes': ['Contrato de interfaz; no mide cobertura real.']}, 'regions': regions}, results


def catalog_payload(path, query):
    detail = {'id': 95123, 'name': 'Pago de Cirsus', 'winery': 'Pago de Cirsus', 'vintage': '2021',
              'slugname': 'Pago-de-Cirsus_2021', 'region': 'Navarra', 'country': 'Spain',
              'grapes': ['Tempranillo'], 'tastingAttributes': SENSORY}
    if path.endswith('/slugname'):
        return {'restaurant': 'b653e084-e8e1-448c-bc03-507a1cea3810'}
    if 'text=' in query:
        return {'results': [detail], 'count': 1, 'page': 1, 'limit': 20}
    return detail


def settle(page):
    page.wait_for_function('''() => {
      const el=document.querySelector('[role=dialog]'); if(!el)return false;
      const r=el.getBoundingClientRect();
      return Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42)<1
        && r.top>=-1 && r.bottom<=innerHeight+2;
    }''')
    page.evaluate('''() => new Promise(resolve => {
      let previous=null, stable=0;
      const tick=()=>{const el=document.querySelector('[role=dialog]');if(!el)return resolve();
        const r=el.getBoundingClientRect(), value=[r.top,r.height].join(',');
        stable=value===previous?stable+1:0;previous=value;
        if(stable>=12)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);
    })''')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:4596')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--snapshot', type=Path, required=True)
    parser.add_argument('--image', type=Path, default=Path('/Users/GOIKO/Downloads/IMG_7605 2.jpg'))
    parser.add_argument('--modes', nargs='+', choices=MODES, default=MODES)
    parser.add_argument('--viewports', nargs='+', choices=VIEWPORTS, default=list(VIEWPORTS))
    parser.add_argument('--chrome', default='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    args = parser.parse_args()
    origin = urlparse(args.url)
    assert origin.hostname in ['127.0.0.1', 'localhost'] and origin.scheme == 'http', 'Loopback preview required'
    args.output.mkdir(parents=True, exist_ok=False, mode=0o700)
    snapshot_hashes = {name: sha(args.snapshot / name) for name in FROZEN}
    live_start = {name: sha(ROOT / name) for name in FROZEN}
    report = {'scope': __doc__, 'qualification': 'Native-style Chromium emulation, not iOS. The pre-existing image is only a transport/crop fixture; OCR/catalog responses and profile are synthetic.',
              'url': args.url, 'snapshot': str(args.snapshot), 'buildConfig': BUILD_CONFIG,
              'sourceHashes': snapshot_hashes, 'liveStartHashes': live_start, 'scriptHash': sha(Path(__file__)),
              'fixtureHash': sha(args.image), 'results': [], 'realOutboundCalls': 0,
              'networkPolicy': 'Exact loopback-origin GET/HEAD is fulfilled from the hashed production snapshot. No route continues to a network. All external requests are locally fulfilled or aborted; service workers and WebSockets blocked; unreachable proxy blocks any missed transport.'}
    report['assetHashes'] = {str(p.relative_to(args.snapshot / 'dist')): sha(p)
                             for p in sorted((args.snapshot / 'dist').rglob('*')) if p.is_file()}
    receipt_path = args.snapshot / 'preparation.json'
    if receipt_path.is_file():
        receipt = json.loads(receipt_path.read_text())
        input_hashes = {name: sha(args.snapshot / name) for name in receipt['inputs']}
        assert input_hashes == receipt['inputs'], 'Snapshot inputs do not match build receipt'
        assert report['assetHashes'] == receipt['webResources'], 'Snapshot assets do not match build receipt'
        assert all(receipt['inputs'][name] == value for name, value in snapshot_hashes.items()), 'Frozen dependencies do not match receipt'
        report['matchedBuildReceipt'] = {'sha256': sha(receipt_path), 'inputCount': len(input_hashes),
                                         'assetCount': len(report['assetHashes']), 'allHashesMatch': True}
    assert snapshot_hashes == live_start, 'Frozen label/shared source changed after snapshot'

    def persist():
        report['passed'] = sum(result['passed'] for result in report['results'])
        report['total'] = len(report['results'])
        (args.output / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')

    persist()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=args.chrome,
            proxy={'server': 'http://127.0.0.1:9', 'bypass': '127.0.0.1,localhost'},
            args=['--disable-background-networking', '--disable-component-update', '--disable-sync',
                  '--no-first-run', '--disable-domain-reliability', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'])
        try:
            for mode in args.modes:
                for orientation in args.viewports:
                    case = f'{mode}-{orientation}'
                    output = args.output / case
                    output.mkdir(mode=0o700)
                    width, height = VIEWPORTS[orientation]
                    context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True,
                        has_touch=True, reduced_motion='reduce', service_workers='block')
                    context.tracing.start(screenshots=True, snapshots=True, sources=False)
                    detection, analyses = contract(mode)
                    (output / 'contracts.json').write_text(json.dumps({'detection': detection, 'analyses': analyses, 'profile': PROFILE}, indent=2, ensure_ascii=False))
                    state = {'catalog': 'fail' if mode == 'catalog-retry' else 'hold' if mode == 'catalog-cancel' else 'ok'}
                    calls, errors, console, checks, held = [], [], [], [], []

                    def check(name, condition, detail=None):
                        checks.append({'name': name, 'passed': bool(condition), 'detail': detail})

                    def fulfill(route, payload, status=200):
                        route.fulfill(status=status, content_type='application/json', body=json.dumps(payload),
                            headers={'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'})

                    def intercept(route):
                        req, url = route.request, urlparse(route.request.url)
                        row = {'method': req.method, 'host': url.hostname, 'path': url.path, 'query': url.query}
                        if (url.scheme, url.netloc) == (origin.scheme, origin.netloc) and req.method in ['GET', 'HEAD']:
                            dist = (args.snapshot / 'dist').resolve()
                            asset = (dist / unquote(url.path).lstrip('/')).resolve()
                            if not asset.is_relative_to(dist):
                                return route.abort()
                            if not asset.is_file():
                                asset = dist / 'index.html'
                            return route.fulfill(status=200, content_type=mimetypes.guess_type(asset.name)[0] or 'application/octet-stream', body=asset.read_bytes())
                        calls.append(row)
                        if req.method == 'OPTIONS':
                            row['disposition'] = 'mock-cors'
                            return fulfill(route, {})
                        if '/functions/v1/' in url.path:
                            endpoint = url.path.rsplit('/', 1)[-1]
                            row['disposition'] = 'mock-function'
                            if endpoint == 'detect-wine-regions-v72':
                                return fulfill(route, detection)
                            if endpoint == 'analyze-wine-region-v72':
                                payload = req.post_data_json or {}
                                index = int(payload['region_index']) - 1
                                row['regionIndex'] = index + 1
                                return fulfill(route, analyses[index])
                            if endpoint == 'search-wines-v75':
                                return fulfill(route, {'wines': []})
                            row['disposition'] = 'blocked-unexpected-function'
                            return route.abort()
                        if url.hostname == 'app.winerim.com' and req.method == 'GET' and url.path.startswith('/api/v1/'):
                            row['disposition'] = 'mock-catalog'
                            if state['catalog'] == 'hold':
                                held.append((route, catalog_payload(url.path, url.query)))
                                row['disposition'] = 'held-catalog'
                                return
                            return fulfill(route, catalog_payload(url.path, url.query), 503 if state['catalog'] == 'fail' else 200)
                        row['disposition'] = 'blocked-external'
                        route.abort()

                    context.route('**/*', intercept)
                    context.route_web_socket('**/*', lambda socket: socket.close())
                    seed = {'matchrim.local_profile_owner.v1': 'anonymous',
                            'matchrim.onboarding.v2:anonymous': json.dumps({'version': 2, 'result': 'skipped'}),
                            'matchrim.scan_privacy_notice.v2': 'accepted', 'matchrim_quiz_result': json.dumps(PROFILE)}
                    context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);" % json.dumps(seed))
                    context.add_init_script(KEYBOARD_BRIDGE)
                    page = context.new_page()
                    page.set_default_timeout(10000)
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.on('console', lambda message: console.append({'type': message.type, 'text': message.text}) if message.type in ['error', 'warning'] else None)

                    def capture(stage):
                        page.screenshot(path=str(output / f'{stage}.png'))
                        (output / f'{stage}.txt').write_text(page.locator('body').inner_text())
                        (output / f'{stage}.html').write_text(page.content())
                        geometry = page.evaluate('''() => Object.fromEntries([
                          ['dialog','[role=dialog]'],['body','.matchrim-scan-region-body'],
                          ['primary','[data-testid=native-wine-primary]'],['answer','[data-testid=native-affinity-summary]'],
                          ['footer','.matchrim-region-footer-actions']].map(([key,selector])=>{
                            const el=document.querySelector(selector),r=el?.getBoundingClientRect();
                            return [key,r?{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,scrollTop:el.scrollTop}:null];
                          }))''')
                        (output / f'{stage}-geometry.json').write_text(json.dumps(geometry, indent=2))

                    def pending(content):
                        check('Affinity pending is explicit', content.get_by_text('Afinidad pendiente', exact=True).is_visible())
                        check('No persuasive inferred explanation', not content.get_by_test_id('native-affinity-summary').count()
                              and not content.get_by_text('Por qué encaja', exact=True).count()
                              and not content.get_by_text('Coincidencias principales', exact=True).count())
                        check('Inferred sentinel never visible', not content.get_by_text(re.compile('INFERRED_QA_SENTINEL')).is_visible())

                    def correction_keyboard(field):
                        field.focus()
                        keyboard_height = KEYBOARD_HEIGHTS[orientation]
                        page.evaluate("height=>window.__labelKeyboardEvent('keyboardWillShow',height)", keyboard_height)
                        page.set_viewport_size({'width': width, 'height': height - keyboard_height})
                        settle(page)
                        # A real tap exercises scrollability/hit testing in the reduced native-style viewport.
                        field.click()
                        geometry = field.evaluate('''el=>{
                          const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
                          const footer=document.querySelector('.matchrim-region-footer-actions');
                          const fr=footer?.getBoundingClientRect();
                          return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,
                            viewport:{width:innerWidth,height:innerHeight},focused:document.activeElement===el,
                            centerUnobscured:hit===el||el.contains(hit),editable:!el.disabled&&!el.readOnly,
                            footerHidden:!footer||!footer.getClientRects().length,
                            footerIntersects:fr&&r.left<fr.right&&r.right>fr.left&&r.top<fr.bottom&&r.bottom>fr.top,
                            nativeKeyboardState:document.documentElement.classList.contains('matchrim-keyboard-visible')};
                        }''')
                        check('Native-style keyboard correction stays editable, visible and unobscured',
                              geometry['focused'] and geometry['editable'] and geometry['centerUnobscured']
                              and geometry['top'] >= -1 and geometry['bottom'] <= geometry['viewport']['height'] + 1
                              and geometry['left'] >= -1 and geometry['right'] <= width + 1
                              and geometry['height'] >= 43.5 and geometry['nativeKeyboardState'], geometry)
                        check('Native-style keyboard has no footer overlap', geometry['footerHidden'] and not geometry['footerIntersects'], geometry)
                        capture('03-keyboard-correction')

                    def dismiss_keyboard(field):
                        field.blur()
                        page.set_viewport_size({'width': width, 'height': height})
                        page.evaluate("window.__labelKeyboardEvent('keyboardDidHide',0)")
                        settle(page)
                        check('Keyboard dismissal restores named footer navigation',
                              not page.evaluate("document.documentElement.classList.contains('matchrim-keyboard-visible')")
                              and all(page.get_by_role('button', name=name, exact=True).is_visible()
                                      for name in ['Anterior', 'Siguiente', 'Cerrar']))

                    try:
                        page.goto(args.url + '/escanear/etiqueta', wait_until='networkidle')
                        if orientation == 'text200':
                            # R4 AppDelegate also enables the native accessibility layout at scale >= 1.2.
                            page.evaluate("document.documentElement.style.fontSize='200%';document.documentElement.classList.add('matchrim-accessibility-text')")
                        page.locator('input[type=file]').nth(1).set_input_files(str(args.image))
                        page.get_by_text('Lote listo para revisar', exact=True).wait_for(timeout=30000)
                        check('No main photo/statistics rail', not page.get_by_test_id('scan-performance-summary').is_visible()
                              and not page.get_by_test_id('scan-region-progress').is_visible()
                              and page.locator('.matchrim-data-rail:visible').count() == 0)
                        check('No disabled Confirm 0 dead end', page.get_by_role('button', name='Confirmar 0 referencias', exact=True).count() == 0)
                        check('Review action enabled', page.get_by_role('button', name='Revisar vinos', exact=True).is_enabled())
                        capture('01-result')
                        page.get_by_role('button', name='Revisar vinos', exact=True).click()
                        content = page.get_by_role('region', name='Contenido de la región 1', exact=True)
                        content.wait_for()
                        settle(page)
                        check('Consumer wine header', page.get_by_role('heading', name='Vino 1', exact=True).is_visible())
                        if mode != 'verified-edit':
                            pending(content)
                        check('No visible scanner confidence rail', content.locator('.matchrim-data-rail:visible').count() == 0)
                        check('Reading diagnostics collapsed', not content.locator('[data-testid=native-wine-diagnostics][open]').count())
                        if mode == 'owner-pago':
                            diagnostic_text = content.get_by_test_id('native-wine-diagnostics').text_content()
                            check('Actual owner contract retains detector .99 and identity .78 in diagnostics only', bool(re.search(r'99%\s*Detección', diagnostic_text)) and bool(re.search(r'78%\s*Identidad', diagnostic_text)))
                            check('OCR does not become verified fiche', content.get_by_test_id('winerim-original-sheet').count() == 0
                                  and page.get_by_role('dialog').get_by_text('Referencia propuesta', exact=True).is_visible())
                        if content.get_by_test_id('native-reference-details').count():
                            check('Original fiche/edit fields progressive', not content.get_by_test_id('native-reference-details').get_attribute('open'))
                        capture('02-primary')

                        if mode in ['owner-pago', 'long-name']:
                            check('Primary identity visible', content.get_by_test_id('native-wine-primary').get_by_role('heading', level=3).is_visible())
                            content.get_by_role('button', name='Corregir identificación', exact=True).click()
                            field = content.locator('#region-wine-name')
                            check('Correction opens details and focuses real editable name', field.is_visible() and field.evaluate('(el)=>document.activeElement===el'))
                            check('Focused correction field is editable and unobscured at its center', field.is_editable() and field.evaluate('''el=>{
                              const r=el.getBoundingClientRect(), hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
                              return hit===el || el.contains(hit);
                            }'''))
                            correction_keyboard(field)
                            field.fill('Pago de Cirsus corregido manualmente')
                            dismiss_keyboard(field)
                            check('Correction persists to primary identity', content.get_by_test_id('native-wine-primary').get_by_role('heading', level=3).inner_text() == 'Pago de Cirsus corregido manualmente')
                            pending(content)
                            capture('03-corrected')
                        elif mode == 'verified-edit':
                            summary = content.get_by_test_id('native-affinity-summary')
                            check('Verified sheet yields personal score', summary.count() == 1)
                            check('Affinity answer before original fiche and input', summary.evaluate('''el=>['[data-testid=winerim-original-sheet]','#region-wine-name'].every(s=>Boolean(el.compareDocumentPosition(document.querySelector(s))&Node.DOCUMENT_POSITION_FOLLOWING))'''))
                            first_view = summary.evaluate('''el=>{
                              const body=el.closest('.matchrim-scan-region-body').getBoundingClientRect();
                              return ['h4','[aria-label^="Afinidad orientativa:"]'].map(selector=>{
                                const node=el.querySelector(selector),r=node.getBoundingClientRect();
                                return {selector,top:r.top,bottom:r.bottom,bodyTop:body.top,bodyBottom:body.bottom,
                                  fullyVisible:r.top>=body.top-1&&r.bottom<=body.bottom+1};
                              });
                            }''')
                            check('Affinity decision and score visible in initial content viewport', all(item['fullyVisible'] for item in first_view), first_view)
                            first_screen = summary.locator('h4,[aria-label^="Afinidad orientativa:"]').evaluate_all('''els=>els.map(el=>{
                              const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);
                              return {top:r.top,bottom:r.bottom,viewportHeight:innerHeight,
                                fullyVisible:r.top>=-1&&r.bottom<=innerHeight+1,
                                centerUnobscured:hit===el||el.contains(hit)};
                            })''')
                            check('Affinity answer unobscured in first screen', all(item['fullyVisible'] and item['centerUnobscured'] for item in first_screen), first_screen)
                            content.get_by_role('button', name='Corregir identificación', exact=True).click()
                            field = content.locator('#region-wine-name')
                            correction_keyboard(field)
                            field.fill('Otra identidad manual')
                            dismiss_keyboard(field)
                            pending(content)
                            check('Manual edit clears stale original fiche and numeric score', content.get_by_test_id('winerim-original-sheet').count() == 0 and summary.count() == 0)
                            capture('03-stale-cleared')
                        elif mode == 'unreadable':
                            content.get_by_label('Vino', exact=True).fill('Vino indicado manualmente')
                            content.get_by_label('Bodega (opcional)', exact=True).fill('Bodega de prueba')
                            content.get_by_role('button', name='Aplicar identidad manual', exact=True).click()
                            pending(content)
                            check('Unreadable permits explicit manual review, no catalog invention', content.get_by_test_id('native-wine-primary').get_by_role('heading', level=3).inner_text() == 'Vino indicado manualmente')
                            capture('03-manual')
                        elif mode == 'not-wine':
                            check('Non-wine fallback retained', content.get_by_text('La bebida visible no se ha identificado como vino.', exact=True).is_visible())
                            page.get_by_role('button', name='Descartar', exact=True).click()
                            check('Discarded batch offers another image', page.get_by_role('button', name='Elegir otra foto', exact=True).first.is_enabled())
                            capture('03-discarded')
                        elif mode in ['multi-top2', 'duplicates']:
                            page.get_by_role('button', name='Siguiente', exact=True).click()
                            content = page.get_by_role('region', name='Contenido de la región 2', exact=True)
                            content.wait_for()
                            check('Next wine remains navigable', page.get_by_role('heading', name='Vino 2', exact=True).is_visible())
                            if mode == 'multi-top2':
                                candidates = content.locator('button[aria-pressed]')
                                check('Two uncertain alternatives remain available', candidates.count() == 2)
                                candidates.nth(1).click()
                                check('Alternative selection changes primary identity', content.get_by_test_id('native-wine-primary').get_by_role('heading', level=3).inner_text() == 'Gran Reserva de la Sierra')
                                content.get_by_role('button', name='Confirmar este candidato', exact=True).click()
                                check('Explicit confirmation remains user review, not fiche verification', page.get_by_role('dialog').get_by_text('Identidad indicada por ti', exact=True).is_visible())
                                pending(content)
                            capture('03-next-alternative')
                            page.get_by_role('button', name='Anterior', exact=True).click()
                            page.get_by_role('button', name='Cerrar', exact=True).click()
                            page.get_by_role('tab', name=re.compile('^Vinos')).click()
                            check('Duplicate references grouped once without claiming physical inventory', page.get_by_text('2 regiones agrupadas', exact=False).count() == 1)
                            capture('04-grouped')
                        elif mode in ['catalog-retry', 'catalog-cancel']:
                            content.get_by_test_id('native-reference-details').locator('summary').click()
                            lookup = content.get_by_role('button', name=re.compile('^Ficha original Winerim:'))
                            lookup.click()
                            if mode == 'catalog-retry':
                                content.get_by_text(re.compile('No se ha podido consultar la ficha original')).wait_for()
                                pending(content)
                                capture('03-catalog-unavailable')
                            else:
                                page.wait_for_function("() => Boolean(document.querySelector('[aria-label=\"Cancelar búsqueda de ficha\"]'))")
                                check('Catalog request is locally held', len(held) == 1)
                                content.get_by_role('button', name='Cancelar búsqueda de ficha', exact=True).click()
                                for route, payload in held:
                                    try:
                                        fulfill(route, payload)
                                    except PlaywrightError:
                                        pass
                                page.wait_for_timeout(250)
                                check('Cancelled/late catalog response cannot bind stale sheet', content.get_by_test_id('winerim-original-sheet').count() == 0 and content.get_by_test_id('native-affinity-summary').count() == 0)
                                check('Cancelled request does not continue to list/detail', sum(c['disposition'] == 'mock-catalog' for c in calls) == 0)
                                pending(content)
                                capture('03-catalog-cancelled')
                            state['catalog'] = 'ok'
                            lookup.click()
                            content.get_by_role('link', name='Ver ficha original Winerim', exact=True).wait_for()
                            check('Catalog retry succeeds without scan replacement', content.get_by_test_id('native-affinity-summary').count() == 1)
                            content.evaluate('(el)=>el.scrollTop=0')
                            capture('04-catalog-recovered')

                        dimensions = page.evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})')
                        check('No horizontal overflow', dimensions['scrollWidth'] <= dimensions['width'] + 1, dimensions)
                        dialog = page.get_by_role('dialog')
                        if dialog.count():
                            controls = dialog.locator('button,summary,input').evaluate_all('''els=>els.filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute('aria-label')||e.textContent||e.id,width:r.width,height:r.height};})''')
                            check('Visible detail controls at least 44px high', all(c['height'] >= 43.5 for c in controls), controls)
                            check('Footer actions retain accessible names', all(page.get_by_role('button', name=name, exact=True).count() == 1 for name in ['Anterior', 'Siguiente', 'Reanalizar', 'Descartar', 'Cerrar']))
                        check('No browser exceptions', errors == [], errors)
                        check('All external traffic locally handled', all(c['disposition'] in ['mock-cors', 'mock-function', 'mock-catalog', 'held-catalog', 'blocked-external'] for c in calls), calls)
                        check('Only analysis POST fixtures; no account/persistence writes', all(c['method'] in ['GET', 'HEAD', 'OPTIONS'] or c['disposition'] == 'mock-function' for c in calls))
                        outcome = {'case': case, 'passed': all(c['passed'] for c in checks), 'checks': checks}
                    except Exception as error:
                        capture('failure')
                        outcome = {'case': case, 'passed': False, 'error': str(error), 'checks': checks}
                    finally:
                        outcome.update({'calls': calls, 'pageErrors': errors, 'console': console})
                        report['results'].append(outcome)
                        (output / 'result.json').write_text(json.dumps(outcome, indent=2, ensure_ascii=False) + '\n')
                        context.tracing.stop(path=str(output / 'trace.zip'))
                        context.close()
                        persist()
                        print(json.dumps({'case': case, 'passed': outcome['passed'], 'failedChecks': [c['name'] for c in checks if not c['passed']], 'error': outcome.get('error')}, ensure_ascii=False), flush=True)
        finally:
            browser.close()
    report['liveEndHashes'] = {name: sha(ROOT / name) for name in FROZEN}
    report['frozenSourcesUnchanged'] = report['liveEndHashes'] == snapshot_hashes
    persist()
    print(json.dumps({'passed': report['passed'], 'total': report['total'], 'output': str(args.output), 'frozenSourcesUnchanged': report['frozenSourcesUnchanged']}))
    return 0 if report['passed'] == report['total'] and report['frozenSourcesUnchanged'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
