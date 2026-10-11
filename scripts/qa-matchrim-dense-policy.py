"""Offline mobile QA: recorded detector/recognizer responses and explicit synthetic failure cases."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://127.0.0.1:4432')
parser.add_argument('--corpus', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
fixture = json.loads((root / 'qa/fixtures/dense-scan-oct8.json').read_text())
args.output.mkdir(parents=True, exist_ok=True)
results = []
scenarios = [(c['id'], orientation, width, height) for c in fixture['cases']
             for orientation, width, height in [('portrait', 393, 852), ('landscape', 852, 393)]]
scenarios += [(s, 'portrait', 393, 852) for s in ['tiny-region', 'poor-legibility', 'retry-budget', 'cancel']]

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for scenario, orientation, width, height in scenarios:
            case = next((c for c in fixture['cases'] if c['id'] == scenario), fixture['cases'][0])
            context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True)
            context.add_init_script("""
              window.CapacitorCustomPlatform={name:'ios'};
              localStorage.setItem('matchrim.onboarding.v1',JSON.stringify({version:2,result:'completed'}));
              localStorage.setItem('matchrim.local_profile_owner.v1','anonymous');
              localStorage.setItem('matchrim.scan_privacy_notice.v2','accepted');
            """)
            calls, errors, held = [], [], []

            def intercept(route):
                req = route.request
                if urlparse(req.url).netloc == urlparse(args.url).netloc:
                    return route.continue_()
                endpoint = req.url.split('/functions/v1/')[-1].split('?')[0]
                body = req.post_data_json if req.method == 'POST' else {}
                payload, status = {}, 200
                if '/functions/v1/' in req.url and req.method == 'POST':
                    calls.append({'endpoint': endpoint, 'region_id': body.get('region_id'),
                                  'region_box': body.get('region_box'), 'crop_box': body.get('crop_box'),
                                  'crop_pixels': body.get('crop_pixels')})
                if endpoint.startswith('detect-wine-regions'):
                    if scenario in ['tiny-region', 'poor-legibility', 'cancel', 'retry-budget']:
                        boxes = [{'x': 10, 'y': 10, 'width': 2.5 if scenario == 'tiny-region' else 25, 'height': 40}]
                        if scenario == 'retry-budget':
                            boxes = [{'x': (i % 5) * 20, 'y': (i // 5) * 25, 'width': 18, 'height': 23} for i in range(20)]
                        payload = {'regions': [{'box': box, 'confidence': .95, 'quality': {
                            'glare': 'low', 'occlusion': 'low', 'legibility': 'poor' if scenario == 'poor-legibility' else 'good'}} for box in boxes],
                            'coverage': {'status': 'reported_complete', 'estimated_visible_objects': len(boxes)}}
                    else:
                        payload = next(c['payload'] for c in case['calls'] if c['function'] == 'detect-wine-regions'
                                       and c['request_payload']['detection_tile'] == body.get('detection_tile'))
                elif endpoint.startswith('analyze-wine-region'):
                    if scenario == 'cancel':
                        held.append(route)
                        return
                    if scenario == 'retry-budget':
                        status, payload = 503, {'error': 'Synthetic QA temporary failure'}
                    else:
                        payload = next((c['payload'] for c in case['calls'] if c['function'] == 'analyze-wine-region'
                                        and c['region_id'] == body.get('region_id')), {'candidates': []})
                elif endpoint.startswith('search-wines'):
                    payload = {'wines': []}
                elif '/rest/v1/' in req.url:
                    payload = []
                route.fulfill(status=status, content_type='application/json', body=json.dumps(payload), headers={'Access-Control-Allow-Origin': '*'})

            context.route('**/*', intercept)
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            try:
                page.goto(args.url + '/escanear/etiqueta', wait_until='networkidle')
                folder = 'new-sources' if case['id'] == 'commons-94131711-etiqueta' else 'wine-board-sources'
                image = args.corpus / folder / case['id'].replace('-etiqueta', '.jpg')
                page.locator('input[type=file]').nth(1).set_input_files(str(image))
                if scenario == 'cancel':
                    page.wait_for_function("document.body.innerText.includes('Leyendo cada región')")
                    page.get_by_role('button', name='Cancelar', exact=True).click()
                    page.get_by_text('Análisis cancelado', exact=True).wait_for()
                    for route in held:
                        route.abort()
                    page.wait_for_timeout(300)
                    assert 'Lote listo para revisar' not in page.locator('body').inner_text()
                else:
                    page.get_by_text('Lote listo para revisar', exact=True).wait_for(timeout=60000)
                    analyses = [c for c in calls if c['endpoint'].startswith('analyze-wine-region')]
                    if scenario in ['tiny-region', 'poor-legibility']:
                        assert not analyses, calls
                    assert len(calls) <= 24, len(calls)
                    assert page.locator('[data-testid^="region-outline-"]').count() == 0
                    page.get_by_test_id('scan-deferred-summary').wait_for()
                    for call in analyses:
                        assert call['crop_box'] and call['crop_pixels'], call
                        crop = call['crop_pixels']
                        assert crop['x'] >= 0 and crop['y'] >= 0 and crop['width'] > 0 and crop['height'] > 0
                        assert crop['x'] + crop['width'] <= 1800 and crop['y'] + crop['height'] <= 2400
                    page.screenshot(path=str(args.output / f'{scenario}-{orientation}-scene.png'), full_page=True, animations='disabled')
                    page.get_by_role('tab', name='Vinos', exact=False).click()
                    pending = page.get_by_role('region', name='Regiones pendientes de identificar')
                    pending.wait_for()
                    pending.get_by_role('button').last.click()
                    page.get_by_role('heading', name='Región', exact=False).wait_for()
                    page.wait_for_timeout(350)
                    assert page.locator('[data-testid^="region-outline-"]').count() == 1
                    page.screenshot(path=str(args.output / f'{scenario}-{orientation}-detail.png'), animations='disabled')
                    if scenario in ['tiny-region', 'poor-legibility']:
                        before = len(calls)
                        page.get_by_role('button', name='Reanalizar', exact=True).click()
                        if scenario == 'poor-legibility':
                            page.get_by_text('Lote listo para revisar', exact=True).wait_for()
                            assert len(calls) > before and len(calls) - before <= 4
                        else:
                            page.wait_for_timeout(250)
                            assert len(calls) == before, 'manual retry must not bypass native pixel floor'
                    if scenario == 'retry-budget':
                        assert len(calls) == 24, len(calls)
                assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2')
                assert not errors, errors
                results.append({'scenario': scenario, 'orientation': orientation, 'passed': True,
                                'edge_requests': len(calls), 'recognition_requests': sum(c['endpoint'].startswith('analyze-wine-region') for c in calls),
                                'errors': errors, 'calls': calls})
            except Exception as error:
                page.screenshot(path=str(args.output / f'{scenario}-{orientation}-failure.png'), full_page=True)
                results.append({'scenario': scenario, 'orientation': orientation, 'passed': False, 'error': str(error), 'calls': calls, 'errors': errors})
            finally:
                context.close()
    finally:
        browser.close()
(args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'remote_calls': 0, 'results': results}, indent=2))
print(json.dumps([{k: v for k, v in result.items() if k != 'calls'} for result in results], indent=2))
raise SystemExit(0 if all(result['passed'] for result in results) else 1)
