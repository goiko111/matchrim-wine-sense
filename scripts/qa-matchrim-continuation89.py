"""Local UI continuation/cancel/error regression. Synthetic regions, not vision accuracy."""
import argparse
import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect
from qa_matchrim_cloud_fixture import ClientFixture, PHOTO
from qa_matchrim_runtime import add_browser_options, launch_browser, upload_scan_file

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4469')
p.add_argument('--output', type=Path, required=True)
add_browser_options(p)
a = p.parse_args()
a.output.mkdir(parents=True, exist_ok=True)
results = []


class DenseFixture(ClientFixture):
    def __init__(self, *args, **kwargs):
        self.analyses, self.held = [], []
        self.hold = False
        self.malformed = False
        super().__init__(*args, **kwargs)

    def intercept(self, route):
        req = route.request
        path = urlparse(req.url).path
        if req.method == 'POST' and '/functions/v1/detect-wine-regions' in path:
            return self.reply(route, {'image_kind': 'multi_bottle', 'coverage': {
                'status': 'reported_complete', 'estimated_visible_objects': 30},
                'regions': [{'box': {'x': i % 10 * 10, 'y': i // 10 * 30, 'width': 8, 'height': 20},
                             'confidence': .9, 'quality': {'legibility': 'good', 'glare': 'low', 'occlusion': 'low'}} for i in range(30)]})
        if req.method == 'POST' and '/functions/v1/analyze-wine-region' in path:
            body = req.post_data_json
            self.analyses.append(body['region_id'])
            if self.hold:
                self.held.append(route)
                return
            if self.malformed:
                return route.fulfill(status=502, content_type='application/json',
                                     headers={'sb-error-code': 'invalid_model_response', 'Access-Control-Allow-Origin': '*'},
                                     body=json.dumps({'error': 'invalid_model_response', 'retryable': False,
                                                      'message': 'La respuesta no se pudo leer.', 'candidates': []}))
            return self.reply(route, {'candidates': [], 'visible_text': [], 'fallback': {
                'code': 'insufficient_visible_text', 'message': 'Synthetic QA abstention'}})
        return super().intercept(route)


with sync_playwright() as pw:
    browser = launch_browser(pw, a)
    try:
        for name, width, height, scale in [('portrait', 393, 852, 1), ('landscape', 852, 393, 1), ('text-200', 393, 852, 2), ('cancel-resume', 393, 852, 1), ('model-error', 393, 852, 1)]:
            fixture = DenseFixture(browser, a.url, viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True)
            fixture.mobile_surface()
            page = fixture.page()
            checks = []
            try:
                page.goto(a.url + '/escanear/etiqueta', wait_until='networkidle')
                if scale == 2:
                    page.add_style_tag(content='html{font-size:32px!important}')
                fixture.malformed = name == 'model-error'
                upload_scan_file(page, 'label', str(PHOTO))
                expect(page.get_by_text('Lote listo para revisar', exact=True)).to_be_visible(timeout=45000)
                assert len(fixture.analyses) == 12
                checks.append('First pass bounded to 12')
                if name == 'model-error':
                    assert len(set(fixture.analyses)) == 12, 'Malformed output must not trigger automatic paid retries'
                    assert '12 con error' in page.get_by_test_id('scan-region-progress').inner_text()
                    expect(page.get_by_test_id('scan-technical-errors')).to_contain_text('12 regiones con error técnico')
                    assert page.get_by_text('Sin reconocer', exact=True).locator('..').inner_text().splitlines()[0] == '0'
                    checks.append('Invalid model output is error, not unreadable identity or automatic retry')
                elif name == 'cancel-resume':
                    fixture.hold = True
                    page.get_by_role('button', name='Analizar siguientes 12', exact=True).click()
                    page.wait_for_function("document.querySelector('[data-testid=scan-region-progress]')?.innerText.includes('en curso')")
                    page.get_by_role('button', name='Cancelar', exact=True).click()
                    expect(page.get_by_text('Análisis cancelado', exact=True)).to_be_visible()
                    assert '12 analizadas' in page.get_by_test_id('scan-region-progress').inner_text()
                    for route in fixture.held:
                        try:
                            route.abort()
                        except Exception:
                            pass
                    fixture.hold = False
                    page.wait_for_timeout(150)
                    checks.append('Cancellation preserves completed regions and leaves interrupted work pending')
                if name != 'model-error':
                    while page.get_by_test_id('scan-continue-batch').count():
                        button = page.get_by_test_id('scan-continue-batch').get_by_role('button')
                        button.click()
                        expect(page.get_by_text('Lote listo para revisar', exact=True)).to_be_visible(timeout=45000)
                    counts = Counter(fixture.analyses)
                    assert len(counts) == 30
                    assert all(counts[f'region-{i}'] == 1 for i in range(1, 13)), counts
                    if name != 'cancel-resume':
                        assert len(fixture.analyses) == 30
                    assert '30 analizadas' in page.get_by_test_id('scan-region-progress').inner_text()
                    checks.append('All 30 regions attempted; no completed region resubmitted')
                assert not fixture.errors, fixture.errors
                assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2')
                assert page.locator('[data-testid^="region-outline-"]').count() == 0
                checks.append('No runtime error, horizontal overflow or text-covering outlines')
                page.screenshot(path=str(a.output / (name + '.png')), full_page=True)
                results.append({'case': name, 'passed': True, 'checks': checks, 'analyses': fixture.analyses})
            except Exception as error:
                page.screenshot(path=str(a.output / (name + '-failure.png')), full_page=True)
                results.append({'case': name, 'passed': False, 'checks': checks, 'error': str(error), 'analyses': fixture.analyses})
            finally:
                fixture.context.close()
    finally:
        browser.close()
(a.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'remote_calls': 0, 'results': results}, indent=2))
print(json.dumps(results, indent=2))
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
