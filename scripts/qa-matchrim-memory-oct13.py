"""Scanner lifetime diagnostics with explicit CDP GC; not native memory or model QA."""
import argparse
import ast
import base64
import hashlib
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect
from qa_matchrim_runtime import add_browser_options, launch_browser, open_label_region

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--seconds', type=int, default=900)
p.add_argument('--url', default='http://127.0.0.1:4469')
p.add_argument('--gc-every', type=int, default=10)
p.add_argument('--native-sampling', action='store_true', help='Collect Chromium native allocation samples, when supported')
p.add_argument('--heap-snapshot', action='store_true')
p.add_argument('--clear-console', action='store_true')
add_browser_options(p)
p.add_argument('--cycles', type=int, help='Stop at a deterministic cycle count as well as the time cap')
p.add_argument('--bounded-waits', action='store_true', help='Use assertions instead of Python Locator.wait_for discarded DOM handles')
p.add_argument('--no-listener-probe', action='store_true', help='Control arm without DOMDebugger listener handles')
p.add_argument('--no-screenshots', action='store_true', help='Control arm without screenshot instrumentation')
p.add_argument('--dispose-console', action='store_true', help='Release every Playwright ConsoleMessage argument handle')
p.add_argument('--dispose-chooser', action='store_true', help='Release the Playwright file chooser ElementHandle after use')
args = p.parse_args()
assert 1 <= args.seconds <= 3600
assert args.gc_every >= 1
args.output.mkdir(parents=True, exist_ok=True)

def chromium_process_memory():
    # This managed Linux mounts host procfs but omits task/children. Restrict the
    # fallback PPid graph to our PID namespace before reading any process data.
    try:
        namespace = os.stat('/proc/self/ns/pid').st_ino
        own_pid = int(os.readlink('/proc/self'))
    except OSError as error:
        return {'available': False, 'reason': str(error), 'processes': []}
    records = {}
    for proc in Path('/proc').iterdir():
        if not proc.name.isdecimal():
            continue
        try:
            if os.stat(proc / 'ns' / 'pid').st_ino != namespace:
                continue
            fields = dict(line.split(':', 1) for line in (proc / 'status').read_text().splitlines() if ':' in line)
            records[int(proc.name)] = (int(fields['PPid'].strip()), fields, proc)
        except (OSError, ValueError, KeyError):
            continue
    descendants = {own_pid}
    while True:
        expanded = descendants | {pid for pid, (parent, _, _) in records.items() if parent in descendants}
        if expanded == descendants:
            break
        descendants = expanded
    processes = []
    for pid in descendants - {own_pid}:
        if pid not in records:
            continue
        _, fields, proc = records[pid]
        try:
            command = (proc / 'cmdline').read_bytes().decode(errors='replace').split('\0')
            if not command or not any(name in Path(command[0]).name for name in ['chromium', 'chrome', 'headless_shell']):
                continue
            match = re.search(r'(?:^|[\x00 ])--type(?:=|[\x00 ]+)([a-z-]+)', '\0'.join(command))
            kind = match.group(1) if match else 'browser'
            processes.append({'pid': pid, 'type': kind, 'rssKiB': int(fields.get('VmRSS', '0 kB').split()[0])})
        except (OSError, ValueError):
            continue
    return {'scope': 'Own-namespace Chromium descendant RSS, shared pages can be double counted; not iOS/native certification', 'processes': processes, 'sumRssKiB': sum(row['rssKiB'] for row in processes), 'available': bool(processes)}

root = Path(__file__).resolve().parents[1]
photo = root / 'qa-fixtures/food-menu/commons-restaurant-menu-2026-08-25-2000.jpg'
contract = root / 'scripts/qa-multi-wine-ui.py'
sha = lambda data: hashlib.sha256(data).hexdigest()
assert sha(photo.read_bytes()) == '9980c5e6b9d5e52f1783e2f26d1a97e22c0c2e1556e9e72919dd26fc34ece9a9'
assert sha(contract.read_bytes()) == 'f2aa2924e48c8c2f6f0cbe45011e6ef92bda3cb17be14a645659b70a0343ae40'
tree = ast.parse(contract.read_text())
scope = {}
exec(compile(ast.Module(body=[node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in ['candidate', 'function_response']], type_ignores=[]), str(contract), 'exec'), scope)
responses = {'detect': scope['function_response']('detect-wine-regions', SimpleNamespace(post_data_json={})), 'analyze': {rid: scope['function_response']('analyze-wine-region', SimpleNamespace(post_data_json={'region_id': rid})) for rid in ['region-1', 'region-2', 'region-3', 'region-4', 'region-5']}}
paths = ['src/components/wine-import/MultiWineLabelScanner.tsx', 'src/utils/imageAnalysis.ts', 'src/utils/manualWineIdentityNotice.ts', 'src/components/ui/sonner.tsx', 'src/utils/multiWineScan.ts', 'src/utils/scanRegionProgress.ts', 'src/utils/regionAnalysisError.ts', 'src/utils/aiRimContextGuide.ts', 'src/utils/wineComparison.ts', 'src/utils/screenOverlayPins.ts', 'src/hooks/useOverlayViewport.ts', 'package.json', 'package-lock.json', 'node_modules/sonner/dist/index.mjs']
hashes = {path: sha((root / path).read_bytes()) for path in paths}
uid = '00000000-0000-4000-8000-000000000080'
enc = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
user = {'id': uid, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa@matchrim.invalid', 'app_metadata': {'provider': 'email'}, 'user_metadata': {}}
session = {'user': user, 'access_token': enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': uid, 'exp': 1900000000}) + '.' + enc('synthetic-invalid'), 'refresh_token': 'synthetic-invalid', 'expires_at': 1900000000, 'expires_in': 86400, 'token_type': 'bearer'}
rows, errors, console, seen, handled, sockets = [], [], [], [], [], []
warnings = []
held = []
counts = {'profile': 0, 'detect': 0, 'analyze': 0, 'search': 0}
fault = False
started = time.monotonic()
started_at = datetime.now(timezone.utc).isoformat()
failure = None

def save():
    (args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'startedAt': started_at, 'elapsedSeconds': time.monotonic() - started, 'requestedSeconds': args.seconds, 'gcEvery': args.gc_every, 'heapSnapshotRequested': args.heap_snapshot, 'explicitConsoleDiscard': args.clear_console, 'disposeChooser': args.dispose_chooser, 'disposeConsole': args.dispose_console, 'requestedCycles': args.cycles, 'boundedWaits': args.bounded_waits, 'listenerProbe': not args.no_listener_probe, 'screenshots': not args.no_screenshots, 'browserVersion': browser.version if 'browser' in globals() else None, 'sourceHashes': hashes, 'cycles': rows, 'runtimeErrors': errors, 'expectedBrowserConsole': console, 'browserWarnings': warnings, 'failure': failure, 'allExternalRequestsIntercepted': sorted(seen) == sorted(handled), 'sockets': sockets, 'realRemoteAppCalls': 0, 'realWrites': 0, 'realAccounts': 0, 'paidCalls': 0}, ensure_ascii=False, indent=2) + '\n')

with sync_playwright() as pw:
    browser = launch_browser(pw, args)
    context = browser.new_context(viewport={'width': 393, 'height': 852}, is_mobile=True, has_touch=True, service_workers='block', reduced_motion='reduce')
    try:
        def reply(route, body):
            route.fulfill(status=200, content_type='application/json', body=json.dumps(body), headers={'Access-Control-Allow-Origin': '*'})

        def intercept(route):
            req, url = route.request, urlparse(route.request.url)
            if url.netloc == urlparse(args.url).netloc:
                return route.continue_()
            handled.append(req.url)
            assert req.method not in ['PUT', 'PATCH', 'DELETE']
            assert not (req.method == 'POST' and url.path.startswith('/rest/v1/'))
            if '/auth/v1/user' in url.path:
                return reply(route, user)
            if '/rest/v1/quiz_results' in url.path:
                counts['profile'] += 1
                return reply(route, None)
            endpoint = re.sub(r'-v\d+$', '', url.path.rstrip('/').split('/')[-1])
            if '/functions/v1/' in url.path and endpoint == 'detect-wine-regions':
                counts['detect'] += 1
                return reply(route, responses['detect'])
            if '/functions/v1/' in url.path and endpoint == 'analyze-wine-region':
                counts['analyze'] += 1
                if fault and req.post_data_json['region_id'] == 'region-2':
                    return route.fulfill(status=429, content_type='application/json', body=json.dumps({'error': 'INTERNAL_QA_ONLY'}), headers={'Access-Control-Allow-Origin': '*'})
                return reply(route, responses['analyze'][req.post_data_json['region_id']])
            if '/functions/v1/' in url.path and endpoint == 'search-wines':
                counts['search'] += 1
                held.append(route)
                return
            return reply(route, [] if '/rest/v1/' in url.path else {})

        def socket_handler(ws):
            local = urlparse(ws.url).netloc == urlparse(args.url).netloc
            sockets.append({'local': local, 'blocked': not local})
            if local:
                ws.connect_to_server()
            else:
                ws.close(code=1008, reason='Local timed scanner QA only')

        context.route('**/*', intercept)
        context.route_web_socket('**/*', socket_handler)
        context.on('request', lambda req: seen.append(req.url) if urlparse(req.url).netloc != urlparse(args.url).netloc else None)
        storage = {'sb-cbjynrbvrhcmpaojmqdp-auth-token': json.dumps(session), 'matchrim.scan_privacy_notice.v2': 'accepted', 'matchrim.local_profile_owner.v1': uid, 'matchrim.onboarding.v2:' + uid: json.dumps({'version': 2, 'result': 'skipped'})}
        context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);" % json.dumps(storage))
        page = context.new_page()
        page.set_default_timeout(7500)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: console.append(re.sub(r'https?://\S+', '<URL>', message.text)) if message.type == 'error' else None)
        def dispose_console(message):
            for handle in message.args:
                handle.dispose()
        if args.dispose_console:
            page.on('console', dispose_console)
        page.on('console', lambda message: warnings.append(re.sub(r'https?://\S+', '<URL>', message.text)) if message.type == 'warning' else None)
        page.goto(args.url + '/escanear/etiqueta', wait_until='networkidle')
        cdp = context.new_cdp_session(page)
        cdp.send('Performance.enable')
        native_sampling = {'requested': args.native_sampling, 'available': False}
        if args.native_sampling:
            try:
                cdp.send('Memory.startSampling', {'samplingInterval': 32768, 'suppressRandomness': True})
                native_sampling['available'] = True
                (args.output / 'initial-native-sampling.json').write_text(json.dumps(cdp.send('Memory.getSamplingProfile'), indent=2) + '\n')
            except Exception as error:
                native_sampling['error'] = str(error)
        (args.output / 'native-sampling-status.json').write_text(json.dumps(native_sampling, indent=2) + '\n')
        def document_listeners():
            document_id = cdp.send('Runtime.evaluate', {'expression': 'document'})['result']['objectId']
            listeners = cdp.send('DOMDebugger.getEventListeners', {'objectId': document_id})['listeners']
            for object_id in {item.get(key, {}).get('objectId') for item in listeners for key in ['handler', 'originalHandler']} - {None}:
                cdp.send('Runtime.releaseObject', {'objectId': object_id})
            cdp.send('Runtime.releaseObject', {'objectId': document_id})
            return {kind: sum(item['type'] == kind for item in listeners) for kind in sorted({item['type'] for item in listeners})}

        initial_listeners = None if args.no_listener_probe else document_listeners()

        def wait_visible(locator, timeout=7500):
            if args.bounded_waits:
                expect(locator).to_be_visible(timeout=timeout)
            else:
                locator.wait_for(timeout=timeout)

        def open_region(index):
            open_label_region(page, index)
            wait_visible(page.get_by_role('dialog'))
            page.wait_for_function('()=>{const r=document.querySelector("[role=dialog]")?.getBoundingClientRect();return r&&r.top>=-1&&r.bottom<=innerHeight+1;}')

        def close_dialog():
            page.get_by_role('dialog').get_by_role('button', name='Cerrar', exact=True).tap()
            expect(page.get_by_role('dialog')).to_be_hidden() if args.bounded_waits else page.get_by_role('dialog').wait_for(state='hidden')

        while time.monotonic() - started < args.seconds and (args.cycles is None or len(rows) < args.cycles):
            cycle = len(rows)
            kind = ['limit-retry', 'cancel-manual-late', 'confirm'][cycle % 3]
            orientation = 'portrait' if cycle % 2 == 0 else 'landscape'
            page.set_viewport_size({'width': 393, 'height': 852} if orientation == 'portrait' else {'width': 852, 'height': 393})
            before = counts.copy()
            fault = kind == 'limit-retry'
            cycle_started = time.monotonic()
            with page.expect_file_chooser() as event:
                page.get_by_role('button', name='Elegir de galer\u00eda', exact=True).tap()
            chooser = event.value
            assert chooser.element.evaluate('e=>e.files.length===0&&e.value===""')
            chooser.set_files(str(photo))
            if args.dispose_chooser:
                chooser.element.dispose()
            for _ in range(250):
                if len(held) == 3:
                    break
                page.wait_for_timeout(10)
            assert len(held) == 3
            if kind == 'cancel-manual-late':
                page.get_by_role('button', name='Cancelar', exact=True).tap()
                wait_visible(page.get_by_text('An\u00e1lisis cancelado', exact=True))
                open_region(5)
                page.get_by_role('dialog').get_by_role('textbox', name='Vino', exact=True).fill('Referencia QA sostenida')
                page.get_by_role('dialog').get_by_role('button', name='Aplicar identidad manual', exact=True).tap()
                for route in held:
                    reply(route, {'wines': []})
                held.clear()
                page.wait_for_timeout(100)
                assert page.get_by_role('dialog').get_by_role('textbox', name='Vino', exact=True).input_value() == 'Referencia QA sostenida'
                assert 'Identidad manual' in page.get_by_role('dialog').get_by_role('heading').first.inner_text()
                close_dialog()
            else:
                for route in held:
                    reply(route, {'wines': []})
                held.clear()
                wait_visible(page.get_by_text('Lote listo para revisar', exact=True), timeout=45000)
                open_region(2)
                if kind == 'limit-retry':
                    assert page.get_by_test_id('region-analysis-error').count() == 1
                    assert 'INTERNAL_QA_ONLY' not in page.get_by_role('dialog').inner_text()
                    fault = False
                    page.get_by_role('dialog').get_by_role('button', name='Reanalizar', exact=True).tap()
                    wait_visible(page.get_by_text('Lote listo para revisar', exact=True), timeout=45000)
                    assert page.get_by_test_id('region-analysis-error').count() == 0
                page.get_by_role('dialog').get_by_role('button', name='Confirmar este candidato', exact=True).tap()
                close_dialog()
                assert page.get_by_test_id('scan-region-progress').inner_text() == '3 analizadas \u00b7 1 identidad manual \u00b7 1 sin analizar'
            if cycle % 20 == 0 and not args.no_screenshots:
                page.screenshot(path=str(args.output / ('cycle-' + str(cycle) + '-' + kind + '.png')))
            page.get_by_role('button', name='Cerrar an\u00e1lisis', exact=True).tap()
            wait_visible(page.get_by_role('button', name='Elegir de galer\u00eda', exact=True))
            assert page.locator('[data-testid^=region-pin-]').count() == 0
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            metrics = {entry['name']: entry['value'] for entry in cdp.send('Performance.getMetrics')['metrics'] if entry['name'] in ['JSHeapUsedSize', 'JSHeapTotalSize', 'Nodes', 'Documents', 'JSEventListeners']}
            live_dom = page.evaluate('({nodes:document.querySelectorAll("*").length,images:document.images.length,canvases:document.querySelectorAll("canvas").length,dialogs:document.querySelectorAll("[role=dialog]").length,toasts:document.querySelectorAll("[data-sonner-toast]").length,visibleToasts:document.querySelectorAll("[data-sonner-toast][data-visible=true]").length})')
            post_gc = None
            after_console_clear = None
            if (cycle + 1) % args.gc_every == 0:
                cdp.send('HeapProfiler.collectGarbage')
                post_gc = {entry['name']: entry['value'] for entry in cdp.send('Performance.getMetrics')['metrics'] if entry['name'] in metrics}
                if args.clear_console:
                    cdp.send('Runtime.discardConsoleEntries')
                    cdp.send('HeapProfiler.collectGarbage')
                    after_console_clear = {entry['name']: entry['value'] for entry in cdp.send('Performance.getMetrics')['metrics'] if entry['name'] in metrics}
            assert not errors
            assert all('status of 429' in message for message in console)
            assert all(sha((root / path).read_bytes()) == expected for path, expected in hashes.items())
            rows.append({'cycle': cycle, 'kind': kind, 'orientation': orientation, 'elapsedSeconds': time.monotonic() - started, 'cycleSeconds': time.monotonic() - cycle_started, 'requests': {key: counts[key] - before[key] for key in counts}, 'metricsAfterReset': metrics, 'liveDomAfterReset': live_dom, 'metricsAfterExplicitGc': post_gc, 'metricsAfterConsoleDiscardAndGc': after_console_clear, 'chromiumProcesses': chromium_process_memory() if post_gc else None, 'documentListeners': document_listeners() if post_gc and not args.no_listener_probe else None, 'passed': True})
            save()
            if len(rows) % 10 == 0:
                print(json.dumps({'cycles': len(rows), 'elapsed': round(time.monotonic() - started), 'heapMiB': round(metrics['JSHeapUsedSize'] / 1048576, 1), 'nodes': metrics['Nodes']}), flush=True)
        (args.output / 'final-dom.json').write_text(json.dumps(page.evaluate('({nodes:document.querySelectorAll("*").length,toasts:[...document.querySelectorAll("[data-sonner-toast]")].map(e=>({text:e.innerText,visible:e.dataset.visible,expanded:e.dataset.expanded,index:e.dataset.index})),images:document.images.length,canvases:document.querySelectorAll("canvas").length})'), ensure_ascii=False, indent=2) + '\n')
        page.screenshot(path=str(args.output / 'final-before-idle.png'))
        page.wait_for_timeout(8000)
        cdp.send('HeapProfiler.collectGarbage')
        (args.output / 'idle-post-gc.json').write_text(json.dumps({'metrics': cdp.send('Performance.getMetrics')['metrics'], 'dom': page.evaluate('({nodes:document.querySelectorAll("*").length,toasts:document.querySelectorAll("[data-sonner-toast]").length})')}, indent=2) + '\n')
        page.mouse.move(0, 0)
        page.wait_for_timeout(8000)
        (args.output / 'pointer-away.json').write_text(json.dumps(page.evaluate('({nodes:document.querySelectorAll("*").length,toasts:document.querySelectorAll("[data-sonner-toast]").length})'), indent=2) + '\n')
        cdp.send('HeapProfiler.collectGarbage')
        if args.clear_console:
            cdp.send('Runtime.discardConsoleEntries')
            cdp.send('HeapProfiler.collectGarbage')
        if native_sampling['available']:
            (args.output / 'final-native-sampling.json').write_text(json.dumps(cdp.send('Memory.getSamplingProfile'), indent=2) + '\n')
            cdp.send('Memory.stopSampling')
        final_metrics = cdp.send('Performance.getMetrics')
        (args.output / 'final-chromium-rss.json').write_text(json.dumps(chromium_process_memory(), indent=2) + '\n')
        (args.output / 'final-post-gc.json').write_text(json.dumps(final_metrics, indent=2) + '\n')
        (args.output / 'document-listeners.json').write_text(json.dumps({'initial': initial_listeners, 'finalAfterIdle': None if args.no_listener_probe else document_listeners()}, indent=2) + '\n')
        if args.heap_snapshot:
            with (args.output / 'final.heapsnapshot').open('w') as snapshot:
                cdp.on('HeapProfiler.addHeapSnapshotChunk', lambda event: snapshot.write(event['chunk']))
                cdp.send('HeapProfiler.takeHeapSnapshot', {'reportProgress': False})
    except Exception as error:
        failure = str(error)
        if 'page' in locals():
            page.screenshot(path=str(args.output / 'failure.png'))
        raise
    finally:
        save()
        context.close()
        browser.close()
print(json.dumps({'cycles': len(rows), 'elapsed': round(time.monotonic() - started), 'passed': failure is None}), flush=True)
