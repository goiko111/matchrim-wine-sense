"""Bounded R4 native-style Chromium lifecycle/JS-heap QA, not recognition or native memory QA."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import importlib.util
import json
import mimetypes
from pathlib import Path
import re
import time
from urllib.parse import unquote, urlparse

from playwright.sync_api import Error as PlaywrightError, expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
LABEL_PATH = ROOT / 'scripts/qa-matchrim-consumer95-label.py'
spec = importlib.util.spec_from_file_location('label95_contract', LABEL_PATH)
label = importlib.util.module_from_spec(spec)
spec.loader.exec_module(label)
CONTRACT = {
    'cycles': 100, 'warmingCycles': 10, 'sampleEveryCycles': 10, 'maxRuntimeSeconds': 1200,
    'mode': 'bounded cycles without artificial pacing; elapsed duration is reported, not a 20-minute endurance claim',
    'postGC': 'Runtime.discardConsoleEntries, HeapProfiler.collectGarbage, then scalar CDP metrics; one renderer/page/context, no reloads',
    'maxHeapGrowthBytes': 8 * 1024 * 1024, 'maxHeapGrowthFraction': .25,
    'heapGrowthRule': 'maximum post-warm sample minus cycle-10 baseline <= max(8 MiB, 25% baseline)',
    'maxHeapSlopeBytesPerCycle': 128 * 1024,
    'heapSlopeRule': 'ordinary least-squares on post-GC samples at cycles 10..100',
    'maxDOMNodeGrowth': 100, 'maxDOMNodeGrowthFraction': .10,
    'maxListenerGrowth': 16, 'maxListenerGrowthFraction': .10,
    'maxDocumentGrowth': 1,
    'activeDOMRule': 'no retained scan dialog, preview data/blob image or canvas after clear/navigation; one root, two empty file inputs',
    'functionalRule': 'all 100 successful scan/detail/edit/catalog-cancel/clear, held scan cancel/clear and SPA navigate cycles must complete; no page errors, unexpected function/account writes or crashes',
    'limits': ['JS heap and DOM counters only; not native RSS, GPU/canvas backing memory, iPhone jetsam or phone performance',
               'Synthetic OCR/catalog/profile; existing image reused unchanged as transport/crop fixture; no recognition accuracy claim',
               'Forced GC is diagnostic and can hide pressure between samples; native keyboard is not exercised here',
               'Browser renderer and Playwright/CDP overhead, cache warm-up and timing affect measurements; thresholds are bounded regression controls, not proof of no leaks'],
}


def write(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def append(path, value):
    with path.open('a') as stream:
        stream.write(json.dumps(value, ensure_ascii=False) + '\n')


def slope(samples, field):
    xs = [row['cycle'] for row in samples]
    ys = [row[field] for row in samples]
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--image', type=Path, default=Path('/Users/GOIKO/Downloads/IMG_7605 2.jpg'))
    parser.add_argument('--url', default='http://127.0.0.1:4596')
    parser.add_argument('--chrome', default='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    parser.add_argument('--arm', choices=['disposed', 'bounded', 'legacy-retainer'], default='bounded')
    parser.add_argument('--heap-snapshots', action='store_true', help='Stream optional JS heap snapshots at cycles 0 and 100; not DOM snapshots')
    parser.add_argument('--upload-policy', choices=['playwright', 'cdp-disposed'], default='playwright')
    parser.add_argument('--legacy-release-probe', action='store_true', help='After the unchanged legacy verdict, dispose its orphaned public handles and record separate diagnostic metrics')
    args = parser.parse_args()
    assert not args.legacy_release_probe or args.arm == 'legacy-retainer'
    origin = urlparse(args.url)
    assert origin.hostname in ['127.0.0.1', 'localhost'] and origin.scheme == 'http'
    args.output.mkdir(mode=0o700, parents=True, exist_ok=False)
    started = time.monotonic()
    receipt = json.loads((args.snapshot / 'preparation.json').read_text())
    inputs = {name: label.sha(args.snapshot / name) for name in receipt['inputs']}
    assets = {str(path.relative_to(args.snapshot / 'dist')): label.sha(path)
              for path in (args.snapshot / 'dist').rglob('*') if path.is_file()}
    assert inputs == receipt['inputs'] and assets == receipt['webResources'], 'Unmatched R4 source/assets'
    frozen_start = {name: label.sha(ROOT / name) for name in label.FROZEN}
    assert all(inputs[name] == value for name, value in frozen_start.items()), 'Frozen dependency changed'
    predeclared = {'declaredAtUTC': datetime.now(timezone.utc).isoformat(), 'contract': CONTRACT,
                   'receiptSHA256': label.sha(args.snapshot / 'preparation.json'),
                   'scriptSHA256': label.sha(Path(__file__)), 'labelContractSHA256': label.sha(LABEL_PATH),
                   'fixtureSHA256': label.sha(args.image), 'sourceHashes': frozen_start,
                   'matchedInputCount': len(inputs), 'matchedAssetCount': len(assets),
                   'snapshot': str(args.snapshot), 'viewport': {'width': 393, 'height': 852},
                   'instrumentation': {'arm': args.arm, 'settleAfterEachCycleMs': 1500,
                       'settleBetweenTwoGCsMs': 1500, 'screenshots': False, 'DOMSnapshots': False,
                       'disposeEveryConsoleArgument': True, 'disposeWaitForFunction': True,
                       'fileChooserHandles': 'none; no chooser API; file-input operation recorded separately by uploadPolicy',
                       'additionalDevtoolsDOMOrNetworkListeners': False, 'listenerProbe': False,
                       'mandatoryTransport': 'Playwright internal Network interception remains necessary to block outbound requests',
                       'heapSnapshots': args.heap_snapshots,
                       'uploadPolicy': args.upload_policy,
                       'legacyReleaseProbeAfterVerdict': args.legacy_release_probe,
                       'legacyQualification': 'legacy-retainer intentionally reproduces original Locator.wait_for ownership solely as a negative control; it is not a clean-control acceptance run'},
                   'networkPolicy': 'Every request fulfilled from frozen assets/synthetic contract or aborted; no route.continue/fetch; WS and SW blocked; dead proxy and denied DNS as backstop'}
    write(args.output / 'predeclared.json', predeclared)
    print(json.dumps({'stage': 'predeclared', 'contract': CONTRACT, 'output': str(args.output)}), flush=True)
    detector, analyses = label.contract('owner-pago')
    write(args.output / 'synthetic-contract.json', {'detection': detector, 'analyses': analyses, 'profile': label.PROFILE})
    counts = Counter()
    state = {'held': None, 'holdDetection': False, 'cycle': 0}
    samples = []
    report = {'scope': __doc__, 'predeclaredSHA256': label.sha(args.output / 'predeclared.json'),
              'completedCycles': 0, 'samples': samples, 'passed': False, 'realOutboundCalls': 0,
              'browserClosed': False, 'consoleCounts': {}, 'networkCounts': {}, 'arm': args.arm,
              'handleCounts': {'waitElementsCreated': 0, 'waitElementsDisposed': 0,
                               'waitFunctionCreated': 0, 'waitFunctionDisposed': 0,
                               'consoleArgumentsDisposed': 0, 'fileChooserHandlesCreated': 0,
                               'uploadObjectsCreated': 0, 'uploadObjectsDisposed': 0}}

    def persist():
        report.update({'elapsedSeconds': time.monotonic() - started,
                       'networkCounts': dict(counts), 'activeHeldRoutes': int(state['held'] is not None)})
        write(args.output / 'report.json', report)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=args.chrome,
            proxy={'server': 'http://127.0.0.1:9', 'bypass': '127.0.0.1,localhost'},
            args=['--disable-background-networking', '--disable-component-update', '--disable-sync',
                  '--no-first-run', '--disable-domain-reliability',
                  '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'])
        context = browser.new_context(viewport=predeclared['viewport'], is_mobile=True,
            has_touch=True, reduced_motion='reduce', service_workers='block')
        report['browserVersion'] = browser.version

        def reply(route, body):
            route.fulfill(status=200, content_type='application/json', body=json.dumps(body),
                headers={'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*',
                         'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'})

        def intercept(route):
            request, url = route.request, urlparse(route.request.url)
            if (url.scheme, url.netloc) == (origin.scheme, origin.netloc) and request.method in ['GET', 'HEAD']:
                dist = (args.snapshot / 'dist').resolve()
                asset = (dist / unquote(url.path).lstrip('/')).resolve()
                if not asset.is_relative_to(dist):
                    counts['blocked-local-path'] += 1
                    return route.abort()
                if not asset.is_file():
                    asset = dist / 'index.html'
                counts['frozen-asset'] += 1
                return route.fulfill(status=200, content_type=mimetypes.guess_type(asset.name)[0] or 'application/octet-stream', body=asset.read_bytes())
            row = {'cycle': state['cycle'], 'method': request.method, 'host': url.hostname, 'path': url.path}
            if request.method == 'OPTIONS':
                row['disposition'] = 'mock-cors'
                reply(route, {})
            elif '/functions/v1/' in url.path:
                endpoint = url.path.rsplit('/', 1)[-1]
                if endpoint == 'detect-wine-regions-v72':
                    if state['holdDetection']:
                        assert state['held'] is None, 'Harness accumulated held routes'
                        state['held'] = (route, detector)
                        row['disposition'] = 'held-detection'
                    else:
                        row['disposition'] = 'mock-detection'
                        reply(route, detector)
                elif endpoint == 'analyze-wine-region-v72':
                    row['disposition'] = 'mock-analysis'
                    reply(route, analyses[0])
                elif endpoint == 'search-wines-v75':
                    row['disposition'] = 'mock-search'
                    reply(route, {'wines': []})
                else:
                    row['disposition'] = 'unexpected-function'
                    route.abort()
            elif url.hostname == 'app.winerim.com' and request.method == 'GET' and url.path.startswith('/api/v1/'):
                assert state['held'] is None, 'Harness accumulated held routes'
                state['held'] = (route, label.catalog_payload(url.path, url.query))
                row['disposition'] = 'held-catalog'
            else:
                row['disposition'] = 'blocked-external'
                if request.method not in ['GET', 'HEAD']:
                    counts['unexpected-write'] += 1
                route.abort()
            counts[row['disposition']] += 1
            append(args.output / 'network.jsonl', row)

        def release_held():
            held = state['held']
            state['held'] = None
            assert held is not None, 'No held request to release'
            try:
                reply(*held)
            except PlaywrightError:
                counts['cancelled-route-already-closed'] += 1

        context.route('**/*', intercept)
        context.route_web_socket('**/*', lambda socket: (counts.update(['blocked-websocket']), socket.close()))
        seed = {'matchrim.local_profile_owner.v1': 'anonymous',
                'matchrim.onboarding.v2:anonymous': json.dumps({'version': 2, 'result': 'skipped'}),
                'matchrim.scan_privacy_notice.v2': 'accepted', 'matchrim_quiz_result': json.dumps(label.PROFILE)}
        context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);" % json.dumps(seed))
        context.add_init_script(label.KEYBOARD_BRIDGE)
        page = context.new_page()
        page.set_default_timeout(15000)

        def console(message):
            try:
                if message.type in ['error', 'warning']:
                    key = message.type
                    report['consoleCounts'][key] = report['consoleCounts'].get(key, 0) + 1
                    append(args.output / 'console.jsonl', {'cycle': state['cycle'], 'type': key, 'text': message.text})
            finally:
                for handle in message.args:
                    handle.dispose()
                    report['handleCounts']['consoleArgumentsDisposed'] += 1

        def page_error(error):
            counts['page-error'] += 1
            append(args.output / 'page-errors.jsonl', {'cycle': state['cycle'], 'error': str(error)})

        page.on('console', console)
        page.on('pageerror', page_error)
        page.on('crash', lambda: counts.update(['page-crash']))
        cdp = context.new_cdp_session(page)
        cdp.send('Performance.enable')

        def upload():
            if args.upload_policy == 'playwright':
                page.locator('input[type=file]').nth(1).set_input_files(str(args.image))
                return
            # Same Chromium file-input operation used by Playwright, with explicit ownership.
            group = 'label95-file-input'
            result = cdp.send('Runtime.evaluate', {
                'expression': "document.querySelectorAll('input[type=file]')[1]",
                'objectGroup': group, 'returnByValue': False})
            object_id = result['result'].get('objectId')
            assert object_id and not result.get('exceptionDetails'), 'No upload input'
            report['handleCounts']['uploadObjectsCreated'] += 1
            try:
                cdp.send('DOM.setFileInputFiles', {'files': [str(args.image.resolve())], 'objectId': object_id})
            finally:
                cdp.send('Runtime.releaseObject', {'objectId': object_id})
                cdp.send('Runtime.releaseObjectGroup', {'objectGroup': group})
                report['handleCounts']['uploadObjectsDisposed'] += 1

        def wait_visible(locator, timeout=15000):
            if args.arm == 'legacy-retainer':
                locator.wait_for(timeout=timeout)
            elif args.arm == 'bounded':
                expect(locator).to_be_visible(timeout=timeout)
            else:
                handle = locator.element_handle(timeout=timeout)
                report['handleCounts']['waitElementsCreated'] += 1
                try:
                    handle.wait_for_element_state('visible', timeout=timeout)
                finally:
                    handle.dispose()
                    report['handleCounts']['waitElementsDisposed'] += 1

        def settle_dialog():
            handle = page.wait_for_function('''() => {
              const el=document.querySelector('[role=dialog]');if(!el)return false;
              const r=el.getBoundingClientRect();return Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42)<1
                &&r.top>=-1&&r.bottom<=innerHeight+2;
            }''')
            report['handleCounts']['waitFunctionCreated'] += 1
            try:
                assert handle.json_value() is True
            finally:
                handle.dispose()
                report['handleCounts']['waitFunctionDisposed'] += 1
            page.evaluate('''() => new Promise(resolve=>{
              let previous=null,stable=0;const tick=()=>{
                const el=document.querySelector('[role=dialog]');if(!el)return resolve();
                const r=el.getBoundingClientRect(),value=[r.top,r.height].join(',');
                stable=value===previous?stable+1:0;previous=value;
                if(stable>=12)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);
            })''')

        def heap_snapshot(cycle, suffix=''):
            if not args.heap_snapshots:
                return
            path = args.output / f'cycle{cycle:03d}{suffix}.heapsnapshot'
            with path.open('w') as stream:
                def chunk(event):
                    stream.write(event['chunk'])
                cdp.on('HeapProfiler.addHeapSnapshotChunk', chunk)
                try:
                    cdp.send('HeapProfiler.takeHeapSnapshot', {'reportProgress': False})
                finally:
                    cdp.remove_listener('HeapProfiler.addHeapSnapshotChunk', chunk)
            append(args.output / 'heap-snapshots.jsonl', {'cycle': cycle, 'path': str(path),
                    'bytes': path.stat().st_size, 'sha256': label.sha(path)})

        def collect_scalar(cycle):
            cdp.send('Runtime.discardConsoleEntries')
            cdp.send('HeapProfiler.collectGarbage')
            page.wait_for_timeout(1500)
            cdp.send('Runtime.discardConsoleEntries')
            cdp.send('HeapProfiler.collectGarbage')
            metrics = {row['name']: row['value'] for row in cdp.send('Performance.getMetrics')['metrics']}
            dom = cdp.send('Memory.getDOMCounters')
            active = page.evaluate('''() => ({elements:document.querySelectorAll('*').length,
              roots:document.querySelectorAll('#root').length,dialogs:document.querySelectorAll('[role=dialog]').length,
              canvases:document.querySelectorAll('canvas').length,
              previewImages:[...document.images].filter(i=>/^(data:|blob:)/.test(i.src)).length,
              fileInputs:document.querySelectorAll('input[type=file]').length,
              selectedFiles:[...document.querySelectorAll('input[type=file]')].reduce((n,i)=>n+i.files.length,0),
              keyboardListeners:window.__labelKeyboardListeners.size,timeOrigin:performance.timeOrigin})''')
            row = {'cycle': cycle, 'elapsedSeconds': time.monotonic() - started,
                   'jsHeapUsedBytes': metrics['JSHeapUsedSize'], 'jsHeapTotalBytes': metrics['JSHeapTotalSize'],
                   'documents': dom['documents'], 'nodes': dom['nodes'], 'jsEventListeners': dom['jsEventListeners'],
                   'activeDOM': active, 'heldRoutes': int(state['held'] is not None),
                   'publicClientElementHandles': sum(type(obj).__name__ == 'ElementHandle'
                       for obj in page._impl_obj._connection._objects.values())}
            return row

        def measure(cycle):
            row = collect_scalar(cycle)
            samples.append(row)
            append(args.output / 'measurements.jsonl', row)
            persist()
            print(json.dumps({'stage': 'sample', **row}), flush=True)

        try:
            page.goto(args.url + '/escanear/etiqueta', wait_until='networkidle')
            time_origin = page.evaluate('performance.timeOrigin')
            measure(0)
            heap_snapshot(0)
            for cycle in range(1, CONTRACT['cycles'] + 1):
                assert time.monotonic() - started < CONTRACT['maxRuntimeSeconds'], 'Bounded runtime exceeded'
                state['cycle'] = cycle
                cycle_start = time.monotonic()
                upload()
                wait_visible(page.get_by_text('Lote listo para revisar', exact=True), timeout=30000)
                page.get_by_role('button', name='Revisar vinos', exact=True).click()
                content = page.get_by_role('region', name='Contenido de la región 1', exact=True)
                wait_visible(content)
                settle_dialog()
                assert content.get_by_text('Afinidad pendiente', exact=True).is_visible()
                assert content.get_by_test_id('native-affinity-summary').count() == 0
                assert not content.get_by_text(re.compile('INFERRED_QA_SENTINEL')).is_visible()
                content.get_by_role('button', name='Corregir identificación', exact=True).click()
                field = content.locator('#region-wine-name')
                field.fill('Pago de Cirsus corregido')
                assert content.get_by_test_id('native-wine-primary').get_by_role('heading', level=3).inner_text() == 'Pago de Cirsus corregido'
                lookup = content.get_by_role('button', name=re.compile('^Ficha original Winerim:'))
                lookup.click()
                wait_visible(content.get_by_role('button', name='Cancelar búsqueda de ficha', exact=True))
                assert state['held'] is not None
                content.get_by_role('button', name='Cancelar búsqueda de ficha', exact=True).click()
                release_held()
                assert content.get_by_test_id('winerim-original-sheet').count() == 0
                page.get_by_role('button', name='Cerrar', exact=True).click()
                page.get_by_role('button', name='Cerrar análisis', exact=True).click()
                wait_visible(page.get_by_role('button', name='Elegir de galería', exact=True))
                state['holdDetection'] = True
                upload()
                deadline = time.monotonic() + 30
                while state['held'] is None and time.monotonic() < deadline:
                    page.wait_for_timeout(50)
                assert state['held'] is not None, 'Detector was not held'
                page.get_by_role('button', name='Cancelar', exact=True).click()
                wait_visible(page.get_by_text('Análisis cancelado', exact=True))
                release_held()
                state['holdDetection'] = False
                page.wait_for_timeout(100)
                assert not page.get_by_text('Lote listo para revisar', exact=True).is_visible(), 'Late scan result resurrected cancelled scan'
                page.get_by_role('button', name='Cerrar análisis', exact=True).click()
                page.get_by_role('button', name='Volver a tipos de escaneo', exact=True).click()
                page.get_by_role('button', name=re.compile('^Etiqueta de vino')).click()
                wait_visible(page.get_by_role('button', name='Elegir de galería', exact=True))
                assert page.evaluate('performance.timeOrigin') == time_origin, 'SPA cycle caused document reload'
                assert page.get_by_role('dialog').count() == 0 and state['held'] is None
                page.wait_for_timeout(1500)
                report['completedCycles'] = cycle
                append(args.output / 'cycles.jsonl', {'cycle': cycle, 'seconds': time.monotonic() - cycle_start, 'passed': True})
                if cycle % CONTRACT['sampleEveryCycles'] == 0:
                    measure(cycle)
                persist()
            post = [row for row in samples if row['cycle'] >= CONTRACT['warmingCycles']]
            baseline = post[0]
            growth = max(row['jsHeapUsedBytes'] for row in post) - baseline['jsHeapUsedBytes']
            heap_limit = max(CONTRACT['maxHeapGrowthBytes'], baseline['jsHeapUsedBytes'] * CONTRACT['maxHeapGrowthFraction'])
            checks = [{'name': '100 complete DOM lifecycle cycles', 'passed': report['completedCycles'] == 100},
                      {'name': 'Post-warm post-GC heap growth', 'passed': growth <= heap_limit, 'actualBytes': growth, 'limitBytes': heap_limit},
                      {'name': 'Post-warm post-GC heap slope', 'passed': slope(post, 'jsHeapUsedBytes') <= CONTRACT['maxHeapSlopeBytesPerCycle'],
                       'actualBytesPerCycle': slope(post, 'jsHeapUsedBytes'), 'limitBytesPerCycle': CONTRACT['maxHeapSlopeBytesPerCycle']}]
            for field, absolute, fraction in [('nodes', CONTRACT['maxDOMNodeGrowth'], CONTRACT['maxDOMNodeGrowthFraction']),
                                               ('jsEventListeners', CONTRACT['maxListenerGrowth'], CONTRACT['maxListenerGrowthFraction']),
                                               ('documents', CONTRACT['maxDocumentGrowth'], 0)]:
                actual = max(row[field] for row in post) - baseline[field]
                limit = max(absolute, baseline[field] * fraction)
                checks.append({'name': 'Post-warm ' + field + ' growth', 'passed': actual <= limit, 'actual': actual, 'limit': limit})
            checks.append({'name': 'Cleared active DOM and same SPA document', 'passed': all(
                row['activeDOM']['roots'] == 1 and row['activeDOM']['fileInputs'] == 2
                and row['activeDOM']['selectedFiles'] == 0 and row['activeDOM']['dialogs'] == 0
                and row['activeDOM']['canvases'] == 0 and row['activeDOM']['previewImages'] == 0
                and row['activeDOM']['keyboardListeners'] == 2 and row['activeDOM']['timeOrigin'] == time_origin
                and row['heldRoutes'] == 0 for row in post)})
            checks.append({'name': 'No page errors, crashes, unexpected functions/writes', 'passed': all(
                counts[key] == 0 for key in ['page-error', 'page-crash', 'unexpected-function', 'unexpected-write', 'blocked-local-path'])})
            report['checks'] = checks
            report['passed'] = all(check['passed'] for check in checks)
            heap_snapshot(100)
            if args.legacy_release_probe:
                # Diagnostic only, after verdict: do not alter samples, thresholds or result.
                from playwright._impl._sync_base import mapping
                owned = [obj for obj in page._impl_obj._connection._objects.values()
                         if type(obj).__name__ == 'ElementHandle']
                released = len(owned)
                for obj in owned:
                    mapping.from_impl(obj).dispose()
                del owned
                after_release = collect_scalar(100)
                write(args.output / 'legacy-public-handle-release.json', {
                    'qualification': 'Own browser public handle disposal only, after original verdict; no app mutations/actions/DOM removal',
                    'released': released, 'before': samples[-1], 'after': after_release})
                heap_snapshot(100, '-after-public-handle-release')
        except Exception as error:
            report['error'] = str(error)
            report['passed'] = False
        finally:
            if state['held'] is not None:
                held = state['held']
                state['held'] = None
                try:
                    held[0].abort()
                except PlaywrightError:
                    pass
            report['frozenSourcesUnchanged'] = {name: label.sha(ROOT / name) for name in label.FROZEN} == frozen_start
            report['passed'] = report['passed'] and report['frozenSourcesUnchanged']
            persist()
            cdp.detach()
            context.close()
            browser.close()
            report['browserClosed'] = True
            persist()
    print(json.dumps({'passed': report['passed'], 'completedCycles': report['completedCycles'],
                      'elapsedSeconds': report['elapsedSeconds'], 'output': str(args.output)}))
    return 0 if report['passed'] and report['browserClosed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
