"""Mobile recorded-response regression; every remote request is intercepted."""
import argparse
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://127.0.0.1:4431')
parser.add_argument('--corpus', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
fixture = json.loads((root / 'qa/fixtures/scan-evidence-oct8.json').read_text())
args.output.mkdir(parents=True, exist_ok=True)
results = []

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for scenario in ['non-wine', 'aliases-pending', 'aliases-catalog', 'menu-pending']:
            case_id = 'commons-93111644-etiqueta' if scenario == 'non-wine' else 'commons-159930620-etiqueta'
            case = next(c for c in fixture['cases'] if c['id'] == case_id)
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
                    endpoint = req.url.split('/functions/v1/')[-1]
                    calls.append(endpoint.split('?')[0])
                    body = req.post_data_json if req.method == 'POST' else {}
                    payload = {}
                    if endpoint.startswith('detect-wine-regions'):
                        payload = next(c['payload'] for c in case['calls'] if c['function'] == 'detect-wine-regions')
                    elif endpoint.startswith('analyze-wine-region'):
                        payload = next((c['payload'] for c in case['calls'] if c['function'] == 'analyze-wine-region' and c['region_id'] == body.get('region_id')), {'candidates': []})
                    elif endpoint.startswith('search-wines'):
                        payload = {'wines': [{'id': 'qa-canonical-1', 'name': 'La Quinta Mamba', 'producer': 'La Quinta',
                            'tasting_attributes': {'power': 4, 'acidity': 3, 'sweetness': 1, 'tannin': 4, 'fruity': 3}}] if scenario == 'aliases-catalog' else []}
                    elif endpoint.startswith('scan-wine-menu'):
                        payload = {'has_profile': False, 'layout': 'rows', 'coverage': {'status': 'reported_complete', 'estimated_visible_wines': 1},
                            'vinos': [{'nombre': 'Amontillado El Contrabandista', 'productor': 'Valdespino', 'anada': None,
                                'region': 'Jerez', 'pais': 'Espana', 'precio': 20, 'tipo': 'generoso', 'confidence': .99,
                                'texto_fuente': 'Amontillado El Contrabandista Valdespino 20', 'descripcion': None,
                                'posicion': {'x': 30, 'y': 30, 'confidence': .99},
                                'atributos': {'potencia': 4, 'acidez': 3, 'dulzura': 3, 'taninos': 1, 'afrutado': 3},
                                'compatibilidad': 69, 'affinity_calibrated': True}]}
                    elif '/rest/v1/' in req.url:
                        payload = []
                    route.fulfill(status=200, content_type='application/json', body=json.dumps(payload), headers={'Access-Control-Allow-Origin': '*'})

                context.route('**/*', intercept)
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                try:
                    menu = scenario == 'menu-pending'
                    page.goto(args.url + '/escanear/' + ('carta-vinos' if menu else 'etiqueta'), wait_until='networkidle')
                    image = args.corpus / ('commons-171025734.jpg' if menu else case_id.replace('-etiqueta', '.jpg'))
                    page.locator('input[type=file]').nth(0 if menu else 1).set_input_files(str(image))
                    if menu:
                        page.get_by_text('Vinos Detectados (1)', exact=True).wait_for(timeout=45000)
                        page.get_by_text('Tu perfil está listo.', exact=False).wait_for()
                        assert 'Completa el quiz Matchrim para ver compatibilidades' not in page.locator('body').inner_text()
                        assert '≈69%' not in page.locator('body').inner_text()
                    else:
                        page.get_by_text('Lote listo para revisar', exact=True).wait_for(timeout=45000)
                        tab = page.get_by_role('tab', name=re.compile(r'^Vinos \('))
                        tab.click()
                        rows = page.locator('button[aria-label^="Abrir detalle de "]')
                        assert rows.count() == (0 if scenario == 'non-wine' else 1), rows.all_inner_texts()
                        scores = page.locator('[data-testid="scan-affinity-value"]').all_inner_texts()
                        if scenario == 'aliases-pending':
                            assert scores == ['-'], scores
                        if scenario == 'aliases-catalog':
                            assert len(scores) == 1 and '%' in scores[0], scores
                    assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2')
                    assert not errors, errors
                    file = f'{scenario}-{orientation}.png'
                    page.screenshot(path=str(args.output / file), full_page=True, animations='disabled')
                    if not menu and scenario != 'non-wine':
                        rows.first.click()
                        reason = page.get_by_text('Afinidad pendiente:' if scenario == 'aliases-pending' else 'Coincidencia sensorial calculada', exact=False).first
                        reason.wait_for()
                        page.wait_for_timeout(400)  # Let the drawer opening transition finish before checking its content.
                        reason.scroll_into_view_if_needed()
                        page.screenshot(path=str(args.output / f'{scenario}-{orientation}-detail.png'), animations='disabled')
                    results.append({'scenario': scenario, 'orientation': orientation, 'passed': True, 'intercepted_requests': len(calls), 'errors': errors, 'screenshot': file})
                except Exception as error:
                    page.screenshot(path=str(args.output / f'{scenario}-{orientation}-failure.png'), full_page=True)
                    (args.output / 'failure.txt').write_text(str(error) + '\n' + page.locator('body').inner_text())
                    raise
                finally:
                    context.close()
    finally:
        browser.close()
        (args.output / 'results.json').write_text(json.dumps({'scope': 'Recorded-response/synthetic catalog UI replay, NOT real recognition or iPhone QA', 'remote_calls': 0, 'results': results}, indent=2))
print(json.dumps({'passed': len(results), 'expected': 8, 'remote_calls': 0}))
