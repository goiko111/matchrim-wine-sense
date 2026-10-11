"""Offline recorded menu/food regression. External requests are always intercepted."""
import argparse
import copy
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://127.0.0.1:4433')
parser.add_argument('--food-image', type=Path, required=True)
parser.add_argument('--wine-image', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
fixture = json.loads((root / 'qa/fixtures/menu-food-evidence-oct8.json').read_text())
args.output.mkdir(parents=True, exist_ok=True)
results = []

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for scenario in ['wine-menu', 'food-legacy', 'food-partial']:
            for orientation, width, height in [('portrait', 393, 852), ('landscape', 852, 393)]:
                context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True)
                context.add_init_script("""
                  window.CapacitorCustomPlatform={name:'ios'};
                  localStorage.setItem('matchrim.onboarding.v1',JSON.stringify({version:2,result:'completed'}));
                  localStorage.setItem('matchrim.local_profile_owner.v1','anonymous');
                  localStorage.setItem('matchrim_quiz_result',JSON.stringify({potente:4,acidez:4,dulce:1,tanico:3,afrutado:4}));
                  localStorage.setItem('matchrim.scan_privacy_notice.v2','accepted');
                """)
                calls, errors = [], []

                def intercept(route):
                    req = route.request
                    if urlparse(req.url).netloc == urlparse(args.url).netloc:
                        return route.continue_()
                    endpoint = req.url.split('/functions/v1/')[-1].split('?')[0]
                    body = req.post_data_json if req.method == 'POST' else {}
                    payload = {}
                    if endpoint.startswith('scan-wine-menu'):
                        tile_id = body.get('scan_region', {}).get('id', 'full')
                        calls.append({'endpoint': endpoint, 'tile': tile_id})
                        payload = next((c['payload'] for c in fixture['cases'][0]['calls'] if c['scan_region']['id'] == tile_id), {'vinos': []})
                    elif endpoint.startswith('scan-food-pairing'):
                        calls.append({'endpoint': endpoint})
                        payload = copy.deepcopy(fixture['cases'][1]['calls'][0]['payload'])
                        if scenario == 'food-partial':
                            payload['coverage'] = {'estimated_visible_dishes': 20, 'returned_dishes': 8, 'truncated': True}
                    elif endpoint.startswith('search-wines'):
                        payload = {'wines': []}
                    elif '/rest/v1/' in req.url:
                        payload = []
                    route.fulfill(status=200, content_type='application/json', body=json.dumps(payload), headers={'Access-Control-Allow-Origin': '*'})

                context.route('**/*', intercept)
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                try:
                    wine = scenario == 'wine-menu'
                    page.goto(args.url + '/escanear/' + ('carta-vinos' if wine else 'menu-comida'), wait_until='networkidle')
                    page.locator('input[type=file]').first.set_input_files(str(args.wine_image if wine else args.food_image))
                    if wine:
                        page.get_by_text('Vinos Detectados (16)', exact=True).wait_for(timeout=45000)
                        rows = page.get_by_role('button', name=re.compile(r'^Abrir vino \d+:'))
                        assert rows.count() == 16, rows.all_inner_texts()
                        assert rows.filter(has_text='Laurent Perriere Ultra').count() == 1
                        assert not rows.filter(has_text='Laurent Perriere Ultra Brut').count()
                        rows.filter(has_text='Laurent Perriere Ultra').scroll_into_view_if_needed()
                    else:
                        page.get_by_text('8 platos devueltos. La cobertura de la carta no está verificada.', exact=True).wait_for()
                        text = page.locator('body').inner_text()
                        assert 'descarta postres' not in text and 'El usuario busca' not in text
                        assert not re.search(r'\d+\s*%', text), 'unverified food affinity still visible'
                        assert page.get_by_text('Idea de vino', exact=True).count() == 16
                        assert page.get_by_text('Hipótesis de maridaje del modelo', exact=True).count() == 16
                        if scenario == 'food-partial':
                            page.get_by_text('Lectura parcial. Faltan platos por revisar.', exact=True).wait_for()
                        page.get_by_role('heading', name='Resultado', exact=True).scroll_into_view_if_needed()
                    page.wait_for_timeout(300)
                    assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2')
                    assert not errors, errors
                    page.screenshot(path=str(args.output / f'{scenario}-{orientation}.png'), animations='disabled')
                    if not wine:
                        page.get_by_role('button', name='Guardar en Quiero Probar', exact=True).first.click()
                        page.wait_for_url('**/auth**')
                    results.append({'scenario': scenario, 'orientation': orientation, 'passed': True, 'errors': errors, 'intercepted_calls': calls})
                except Exception as error:
                    page.screenshot(path=str(args.output / f'{scenario}-{orientation}-failure.png'), full_page=True)
                    results.append({'scenario': scenario, 'orientation': orientation, 'passed': False, 'error': str(error), 'errors': errors, 'intercepted_calls': calls})
                finally:
                    context.close()
    finally:
        browser.close()
(args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'remote_calls': 0, 'results': results}, indent=2))
print(json.dumps(results, indent=2))
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
