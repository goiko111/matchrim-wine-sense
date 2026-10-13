"""Actual notification component controls and CDP listener cleanup, not full-account or native QA."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from qa_matchrim_runtime import add_browser_options, launch_browser

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4474')
p.add_argument('--output', type=Path, required=True)
add_browser_options(p)
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
rows = []
with sync_playwright() as pw:
    browser = launch_browser(pw, args)
    for width, height, orientation in [(393, 852, 'portrait'), (852, 393, 'landscape')]:
        context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, service_workers='block', reduced_motion='reduce')
        context.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).netloc == urlparse(args.url).netloc else r.abort())
        context.route_web_socket('**/*', lambda ws: ws.connect_to_server() if urlparse(ws.url).netloc == urlparse(args.url).netloc else ws.close())
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(args.url + '/scripts/qa-pages/notifications.html', wait_until='networkidle')
        cdp = context.new_cdp_session(page)

        def visibility_listeners():
            obj = cdp.send('Runtime.evaluate', {'expression': 'document'})['result']['objectId']
            listeners = cdp.send('DOMDebugger.getEventListeners', {'objectId': obj})['listeners']
            for oid in {item.get(key, {}).get('objectId') for item in listeners for key in ['handler', 'originalHandler']} - {None}:
                cdp.send('Runtime.releaseObject', {'objectId': oid})
            cdp.send('Runtime.releaseObject', {'objectId': obj})
            return sum(item['type'] == 'visibilitychange' for item in listeners)

        initial = visibility_listeners()
        page.get_by_role('button', name='Crear aviso', exact=True).tap()
        close = page.get_by_role('button', name='Cerrar aviso', exact=True)
        close.wait_for(state='visible')
        rect = close.bounding_box()
        assert rect['width'] >= 44 and rect['height'] >= 44
        page.screenshot(path=str(args.output / (orientation + '-close.png')))
        close.tap()
        page.locator('[data-sonner-toast]').wait_for(state='hidden')
        for _ in range(24):
            page.get_by_role('button', name='Crear aviso', exact=True).tap()
        active = visibility_listeners()
        page.wait_for_timeout(8000)
        cdp.send('HeapProfiler.collectGarbage')
        final = visibility_listeners()
        assert final == initial == 0 and not page.locator('[data-sonner-toast]').count()
        assert not errors and page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        rows.append({'orientation': orientation, 'notifications': 25, 'initialVisibilityListeners': initial, 'activeVisibilityListeners': active, 'finalVisibilityListeners': final, 'touchTarget': rect, 'runtimeErrors': errors, 'passed': True})
        context.close()
    browser.close()
(args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'results': rows}, indent=2) + '\n')
print(json.dumps(rows))
