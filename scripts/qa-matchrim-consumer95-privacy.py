"""Fresh native anonymous scan privacy gates. Frozen assets, denied remote transport, no uploads/accounts."""
import argparse
import hashlib
import json
import mimetypes
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--build', type=Path, required=True)
p.add_argument('--url', default='http://127.0.0.1:4697')
p.add_argument('--output', type=Path, required=True)
args = p.parse_args()
assert urlparse(args.url).hostname in ('127.0.0.1', 'localhost')
args.output.mkdir(parents=True, exist_ok=False)
args.output.chmod(0o700)
frozen = {str(f.relative_to(args.build)): f.read_bytes() for f in args.build.rglob('*') if f.is_file()}
manifest = {f: hashlib.sha256(data).hexdigest() for f, data in frozen.items()}
assert 'index.html' in frozen
(args.output / 'build-manifest.json').write_text(json.dumps({'build': str(args.build), 'files': manifest}, indent=2) + '\n')
key = 'matchrim.scan_privacy_notice.v2'
results = []
routes = {'Label': '/escanear/etiqueta', 'Menu': '/escanear/carta-vinos', 'Food': '/escanear/menu-comida', 'Restaurant': '/restaurante'}

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                                  args=['--disable-background-networking', '--disable-sync', '--disable-quic', '--host-resolver-rules=MAP * ~NOTFOUND'])
    try:
        for surface, path in routes.items():
            for width, height, font in [(393, 852, 16), (852, 393, 16), (393, 852, 32)]:
                for storage in ['normal', 'privacy-key-blocked']:
                    case = f'{surface}-{width}x{height}-root{font}-{storage}'
                    context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce',
                                                  is_mobile=True, has_touch=True, service_workers='block', locale='es-ES')
                    context.add_init_script("""(() => {
                      window.CapacitorCustomPlatform={name:'ios'};
                      localStorage.setItem('matchrim.local_profile_owner.v1','anonymous');
                      localStorage.setItem('matchrim.onboarding.v2:anonymous',JSON.stringify({version:2,result:'skipped'}));
                      window.__privacyStorageDenied95=[];
                      const key='matchrim.scan_privacy_notice.v2';
                      if(%s){for(const method of ['getItem','setItem']){const original=Storage.prototype[method];
                        Storage.prototype[method]=function(k,...rest){if(k===key){window.__privacyStorageDenied95.push(method);throw new DOMException('Controlled privacy storage denial','SecurityError');}return original.call(this,k,...rest);};}}
                      document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize='%spx';});
                    })();""" % ('true' if storage != 'normal' else 'false', font))
                    events, errors, checks, metrics = [], [], [], []

                    def intercept(route):
                        req, url = route.request, urlparse(route.request.url)
                        event = {'host': url.hostname, 'path': url.path, 'method': req.method}
                        events.append(event)
                        if url.netloc == urlparse(args.url).netloc and req.method in ('GET', 'HEAD'):
                            f = url.path.lstrip('/')
                            f = f if f in frozen else 'index.html' if req.is_navigation_request() else None
                            event['disposition'] = 'frozen-file' if f else 'local-404'
                            return route.fulfill(status=200 if f else 404, body=frozen[f] if f else b'',
                                                 content_type=mimetypes.guess_type(f or '')[0] or 'application/octet-stream')
                        event['disposition'] = 'denied-no-forward'
                        return route.abort('blockedbyclient')

                    context.route('**/*', intercept)
                    context.route_web_socket('**', lambda ws: events.append({'method': 'WEBSOCKET', 'disposition': 'denied-no-connect'}))
                    page = context.new_page()
                    page.set_default_timeout(10000)
                    page.on('pageerror', lambda e: errors.append(str(e)))

                    def check(name, value):
                        checks.append({'name': name, 'passed': bool(value)})

                    def snapshot(stage):
                        page.screenshot(path=str(args.output / (case + '-' + stage + '.png')), full_page=True)
                        page.screenshot(path=str(args.output / (case + '-' + stage + '.viewport.png')))
                        (args.output / (case + '-' + stage + '.aria.txt')).write_text(page.locator('body').aria_snapshot())

                    def gate_state():
                        return page.evaluate("""() => {
                          const gate=document.querySelector('[aria-labelledby="scan-privacy-title"]');
                          const box=gate?.querySelector('[role=checkbox]'),label=box?.closest('label'),button=gate?.querySelector('button:not([role=checkbox])'),link=gate?.querySelector('a');
                          const rect=el=>{const r=el?.getBoundingClientRect();return r&&{width:r.width,height:r.height,left:r.left,right:r.right};};
                          const words=[];
                          if(link){const walker=document.createTreeWalker(link,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode())for(const m of n.textContent.matchAll(/\\S+/g)){const r=document.createRange();r.setStart(n,m.index);r.setEnd(n,m.index+m[0].length);if(r.getClientRects().length>1)words.push(m[0]);}}
                          return {checkbox:rect(box),label:rect(label),button:rect(button),link:rect(link),linkText:link?.textContent,brokenLinkWords:words,
                            overflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)>innerWidth+1,
                            uploadInputs:document.querySelectorAll('input[type=file],input[type=url]').length,storageDenied:window.__privacyStorageDenied95};
                        }""")

                    try:
                        page.goto(args.url + path, wait_until='networkidle')
                        page.get_by_role('heading', name='Antes de analizar una imagen', exact=True).wait_for()
                        cb = page.get_by_role('checkbox', name='He leído el aviso de privacidad del escáner', exact=True)
                        cont = page.get_by_role('button', name='Entiendo y continuar', exact=True)
                        initial = gate_state()
                        metrics.append({'stage': 'before', **initial})
                        check('Fresh context has gate and no file/camera/URL inputs mounted', initial['uploadInputs'] == 0)
                        check('Unchecked consent cannot continue', cb.get_attribute('data-state') == 'unchecked' and cont.is_disabled())
                        check('No POST attempt before consent', not any(x['method'] == 'POST' for x in events))
                        check('Checkbox associated label and continue targets are at least44, not a required44 checkbox', initial['label']['height'] >= 43.9 and initial['label']['width'] >= 43.9 and initial['button']['height'] >= 43.9)
                        check('Privacy link is readable without fragmented words or horizontal overflow', initial['linkText'] == 'política de privacidad' and not initial['brokenLinkWords'] and not initial['overflow'])
                        snapshot('before')
                        page.locator('a[href="/privacy"]').click()
                        page.wait_for_url('**/privacy')
                        page.go_back(wait_until='networkidle')
                        page.get_by_role('heading', name='Antes de analizar una imagen', exact=True).wait_for()
                        check('Opening the real legal link grants no consent', cont.is_disabled() and cb.get_attribute('data-state') == 'unchecked')
                        label = cb.locator('xpath=ancestor::label')
                        label.scroll_into_view_if_needed()
                        point = label.evaluate("""label=>{const r=label.getBoundingClientRect();for(const y of [.25,.5,.75])for(const x of [.95,.8,.5]){const px=r.x+r.width*x,py=r.y+r.height*y,e=document.elementFromPoint(px,py);if(e?.closest('label')===label&&!e.closest('a,button,input'))return [px,py];}return null;}""")
                        check('Associated label has a real non-checkbox/non-link pointer hit', point is not None)
                        assert point is not None
                        page.mouse.click(*point)
                        page.wait_for_function('()=>document.querySelector("[role=checkbox]")?.getAttribute("data-state")==="checked"')
                        check('Checking alone still blocks uploads until explicit continue', gate_state()['uploadInputs'] == 0 and not any(x['method'] == 'POST' for x in events))
                        cont.click()
                        page.get_by_role('heading', name='Antes de analizar una imagen', exact=True).wait_for(state='detached')
                        page.locator('input[type=file]').first.wait_for(state='attached')
                        check('Actual checkbox+explicit continue unlocks current scanner despite denied persistence', page.locator('input[type=file]').count() > 0)
                        if storage == 'normal':
                            check('Acceptance is persisted', page.evaluate('(key)=>localStorage.getItem(key)', key) == 'accepted')
                        else:
                            check('Storage failure was actually exercised, not silently bypassed', 'setItem' in page.evaluate('window.__privacyStorageDenied95'))
                        snapshot('accepted')
                        page.reload(wait_until='networkidle')
                        if storage == 'normal':
                            page.locator('input[type=file]').first.wait_for(state='attached')
                            check('Reload retains explicit acceptance', page.get_by_role('heading', name='Antes de analizar una imagen', exact=True).count() == 0)
                        else:
                            page.get_by_role('heading', name='Antes de analizar una imagen', exact=True).wait_for()
                            check('Unpersisted acceptance does not silently bypass next page lifetime', cont.is_disabled() and gate_state()['uploadInputs'] == 0)
                        check('No upload/account/provider POST attempted in this gate-only test', not any(x['method'] == 'POST' for x in events))
                        check('No uncaught browser errors', errors == [])
                        snapshot('reload')
                        assert all(x['passed'] for x in checks), '; '.join(x['name'] for x in checks if not x['passed'])
                        results.append({'case': case, 'passed': True, 'checks': checks, 'metrics': metrics, 'events': events})
                    except Exception as failure:
                        snapshot('failure')
                        results.append({'case': case, 'passed': False, 'error': str(failure), 'checks': checks, 'metrics': metrics, 'events': events, 'pageErrors': errors})
                    finally:
                        context.close()
                    (args.output / 'report.json').write_text(json.dumps({'scope': __doc__, 'passed': sum(x['passed'] for x in results), 'total': len(results),
                      'forwardedRequests': 0, 'storageBlockedScope': 'Only privacy-key get/set denied; unrelated app storage remains available.', 'results': results}, indent=2, ensure_ascii=False) + '\n')
    finally:
        browser.close()
assert manifest == {str(f.relative_to(args.build)): hashlib.sha256(f.read_bytes()).hexdigest() for f in args.build.rglob('*') if f.is_file()}
print(json.dumps({'passed': sum(x['passed'] for x in results), 'total': len(results), 'failures': [{'case': x['case'], 'error': x['error']} for x in results if not x['passed']]}))
raise SystemExit(0 if all(x['passed'] for x in results) else 1)
