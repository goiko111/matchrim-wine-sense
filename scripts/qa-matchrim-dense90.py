"""Frozen real detection + original photos, deliberately empty controlled analyses. No fresh recognition."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect
from qa_matchrim_cloud_fixture import ClientFixture
from qa_matchrim_runtime import add_browser_options, launch_browser, upload_scan_file

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', required=True)
p.add_argument('--trace', type=Path, required=True)
p.add_argument('--image', type=Path, required=True)
p.add_argument('--sha256', required=True)
p.add_argument('--output', type=Path, required=True)
add_browser_options(p)
a = p.parse_args()
assert hashlib.sha256(a.image.read_bytes()).hexdigest() == a.sha256
assert not a.output.exists(), 'Preserve earlier evidence'
a.output.mkdir(parents=True)
trace = json.loads(a.trace.read_text())
detectors = {r['request']['detection_tile']: r['payload'] for r in trace if r['function'].startswith('detect-wine-regions') and r['status'] == 200}
assert set(detectors) == {'full', 'left', 'right'}


class DenseFixture(ClientFixture):
    def __init__(self, *args, **kwargs):
        self.detect_calls = []
        self.analysis_calls = []
        super().__init__(*args, **kwargs)

    def intercept(self, route):
        req, path = route.request, urlparse(route.request.url).path
        if '/functions/v1/detect-wine-regions' in path:
            self.handled.append(req.url)
            tile = req.post_data_json['detection_tile']
            self.detect_calls.append(tile)
            return self.reply(route, detectors[tile])
        if '/functions/v1/analyze-wine-region' in path:
            self.handled.append(req.url)
            body = req.post_data_json
            self.analysis_calls.append({'id': body['region_id'], 'box': body['region_box'], 'crop_box': body['crop_box']})
            return self.reply(route, {'candidates': [], 'fallback': {'code': 'insufficient_visible_text',
                'message': 'Controlled QA: no historical identity rebound to changed region geometry.', 'suggested_actions': []}})
        return super().intercept(route)


rows = []
with sync_playwright() as pw:
    browser = launch_browser(pw, a)
    for case, w, h, scale in [('narrow', 320, 568, 1), ('portrait', 393, 852, 1), ('landscape', 852, 393, 1), ('text200', 393, 852, 2), ('text312', 393, 852, 3.12)]:
        fixture = DenseFixture(browser, a.url, viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True)
        fixture.mobile_surface()
        page = fixture.page()
        console_errors = []
        page.on('console', lambda message: console_errors.append(message.text[:1000]) if message.type == 'error' else None)
        checks, observed = [], {}
        def check(name, passed, actual=None):
            checks.append({'name': name, 'passed': bool(passed), 'actual': actual})
        def capture(stage):
            page.screenshot(path=str(a.output / (case + '-' + stage + '.png')))
        try:
            page.goto(a.url + '/escanear/etiqueta', wait_until='networkidle')
            if scale != 1:
                page.add_style_tag(content='html {font-size:%spx !important}' % (16 * scale))
                page.evaluate('document.documentElement.classList.add("matchrim-accessibility-text")')
            upload_scan_file(page, 'label', str(a.image))
            expect(page.get_by_text('Lote listo para revisar', exact=True)).to_be_visible(timeout=30000)
            check('Exactly the three frozen detector tiles, no new detector calls', sorted(fixture.detect_calls) == ['full', 'left', 'right'], fixture.detect_calls)
            first_pass = len(fixture.analysis_calls)
            check('First pass respects twelve-analysis limit', 0 < first_pass <= 12, first_pass)
            pins = page.locator('[data-testid^="region-pin-"]')
            expect(pins.first).to_be_visible()
            observed['pinText'] = pins.all_inner_texts()
            check('Overlay remains number/cluster-only rather than long identity/affinity text', bool(observed['pinText']) and all(re.fullmatch(r'\+?\d+', text.strip()) for text in observed['pinText']), observed['pinText'])
            observed['pinRects'] = pins.evaluate_all('els=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})')
            overlaps = [(i,j) for i,r in enumerate(observed['pinRects']) for j,t in enumerate(observed['pinRects']) if i<j and min(r['x']+r['w'],t['x']+t['w'])>max(r['x'],t['x'])+1 and min(r['y']+r['h'],t['y']+t['h'])>max(r['y'],t['y'])+1]
            check('Measured pin targets remain44px with no overlap', not overlaps and all(abs(r['w']-44)<1 and abs(r['h']-44)<1 for r in observed['pinRects']), overlaps)
            check('Scene has no hidden horizontal overflow', page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1'))
            capture('scene')
            continuation = page.get_by_test_id('scan-continue-batch').get_by_role('button')
            continuation.click()
            expect(continuation).to_be_enabled(timeout=30000)
            check('Explicit next pass adds at most twelve calls, without re-detection', first_pass < len(fixture.analysis_calls) <= first_pass + 12 and len(fixture.detect_calls) == 3, len(fixture.analysis_calls))
            check('Completed region analyses are not silently repeated', len({r['id'] for r in fixture.analysis_calls}) == len(fixture.analysis_calls))
            page.get_by_role('tab', name=re.compile('^Vinos')).click()
            pending = page.get_by_role('region', name='Regiones pendientes de identificar', exact=True)
            buttons = pending.get_by_role('button')
            expect(buttons).to_have_count(60)
            observed['regionNames'] = buttons.evaluate_all('els=>els.map(e=>e.getAttribute("aria-label"))')
            check('All sixty selected regions retain compact sequential accessible IDs', all(name.startswith('Revisar región %s:' % (i + 1)) for i, name in enumerate(observed['regionNames'])))
            buttons.last.click()
            dialog = page.get_by_role('dialog')
            expect(dialog).to_be_visible()
            page.wait_for_function('()=>{const r=document.querySelector("[role=dialog]")?.getBoundingClientRect();return r&&r.top>=-1&&r.bottom<=document.documentElement.clientHeight+1}')
            box = dialog.bounding_box()
            check('Last-region manual review fits the viewport', box and box['x'] >= -1 and box['y'] >= -1 and box['x'] + box['width'] <= w + 1 and box['y'] + box['height'] <= h + 1, box)
            check('Unknown identity explicitly refuses fabricated affinity', 'inventadas' in dialog.inner_text())
            dialog.locator('input[name="manual-wine-name"]').fill('QA90 manual local')
            dialog.get_by_role('button', name='Aplicar identidad manual', exact=True).click()
            expect(dialog.get_by_text('Identidad revisada por ti', exact=False).first).to_be_visible()
            check('Manual name does not manufacture a numeric affinity', 'Afinidad pendiente' in dialog.inner_text() or 'afinidad quedara pendiente' in dialog.inner_text().lower())
            check('Manual correction content does not overflow horizontally', dialog.evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
            capture('manual')
            if scale != 1:
                scroll = dialog.locator('.matchrim-scan-region-layout')
                scroll.focus()
                page.keyboard.press('End')
                page.wait_for_function('()=>{const e=document.querySelector(".matchrim-scan-region-layout");return e&&Math.abs(e.scrollTop-(e.scrollHeight-e.clientHeight))<=2}')
                check('Keyboard End reaches the complete accessible panel footer', scroll.evaluate('e=>e===document.activeElement && e.getAttribute("role")==="region" && Boolean(e.getAttribute("aria-label"))'))
            dialog.get_by_role('button', name='Descartar', exact=True).click()
            expect(dialog).to_be_hidden()
            check('Discard is local and every external operation was intercepted', fixture.finish()['externalIntercepted'] and not fixture.unexpected, fixture.unexpected)
            check('No JavaScript page exception', not fixture.errors, fixture.errors)
            check('No browser console error', not console_errors, console_errors)
        except Exception as error:
            check('Scenario completed', False, str(error))
            capture('failure')
        finally:
            rows.append({'case': case, 'checks': checks, 'observed': observed, 'analyses': fixture.analysis_calls,
                         'network': fixture.finish(), 'passed': all(c['passed'] for c in checks)})
            fixture.context.close()
    browser.close()
(a.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'sourceSha256': a.sha256,
    'traceSha256': hashlib.sha256(a.trace.read_bytes()).hexdigest(), 'results': rows}, indent=2, ensure_ascii=False))
print(json.dumps({'scenarios': len(rows), 'checks': sum(len(r['checks']) for r in rows), 'failed': [{'case': r['case'], 'checks': [c for c in r['checks'] if not c['passed']]} for r in rows if not r['passed']]}))
if any(not r['passed'] for r in rows):
    raise SystemExit(1)
