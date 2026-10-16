"""Controlled restaurant UI journeys: real local files, synthetic read/rank replies, no remote inference."""
import argparse
import base64
import io
import json
from pathlib import Path
from urllib.parse import urlparse
from reportlab.pdfgen.canvas import Canvas
from playwright.sync_api import sync_playwright, expect
from qa_matchrim_cloud_fixture import ClientFixture
from qa_matchrim_runtime import add_browser_options, launch_browser

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', required=True)
p.add_argument('--image', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--case', choices=['portrait', 'narrow', 'landscape', 'large', 'max'])
add_browser_options(p)
a = p.parse_args()
assert not a.output.exists(), 'Preserve prior evidence'
a.output.mkdir(parents=True)


def pdf_bytes(count):
    data = io.BytesIO()
    doc = Canvas(data, pagesize=(400, 500), invariant=1)
    for i in range(count):
        doc.drawString(30, 460, 'CONTROLLED QA - NOT RESTAURANT TRUTH')
        doc.drawString(30, 420, 'Page %d of %d' % (i + 1, count))
        doc.drawString(30, 380, 'Roda I 2020 - Botella 70 EUR')
        doc.showPage()
    doc.save()
    return data.getvalue()


class RestaurantFixture(ClientFixture):
    def __init__(self, *args, **kwargs):
        self.reads = []
        self.ranks = []
        self.imports = []
        self.reject_next = False
        self.bad_pair = False
        self.hold = False
        self.held = []
        super().__init__(*args, **kwargs)

    def intercept(self, route):
        request = route.request
        path = urlparse(request.url).path
        if '/functions/v1/restaurant-' not in path:
            return super().intercept(route)
        self.handled.append(request.url)
        if request.method == 'OPTIONS':
            return self.reply(route, {})
        body = request.post_data_json
        if path.endswith('restaurant-import91'):
            self.imports.append(body)
            return self.reply(route, {'kind': 'file', 'mime': 'application/pdf', 'name': 'controlled-50.pdf',
                                     'base64': base64.b64encode(pdf_bytes(50)).decode(), 'sourceUrl': 'https://menus.restaurant.org/wines.pdf'})
        if body['operation'] == 'read':
            self.reads.append({'pageId': body['pageId'], 'kind': body['kind'], 'hasImage': body.get('image', '').startswith('data:image/jpeg;')})
            if self.hold:
                self.held.append(route)
                return
            if self.reject_next:
                self.reject_next = False
                return route.fulfill(status=502, content_type='application/json', body=json.dumps({'error': 'invalid_model_response', 'retryable': False}), headers={'Access-Control-Allow-Origin': '*'})
            rows = [
                {'name': 'Chuleta', 'sourceText': 'Chuleta a la brasa 45 EUR', 'price': 45, 'currency': 'EUR'},
                {'name': 'Pescado', 'sourceText': 'Pescado al horno 28 EUR', 'price': 28, 'currency': 'EUR'},
            ] if body['kind'] == 'food' else [
                {'name': 'Roda I', 'sourceText': 'Roda I Bodegas Roda 2020 Botella 70 EUR', 'producer': 'Bodegas Roda', 'vintage': '2020', 'price': 70, 'currency': 'EUR', 'service': 'bottle'},
                {'name': 'Muga', 'sourceText': 'Muga 2021 Botella 30 EUR', 'vintage': '2021', 'price': 30, 'currency': 'EUR', 'service': 'bottle'},
            ]
            return self.reply(route, {'rows': rows, 'partial': False, 'warnings': []})
        self.ranks.append(body)
        food = next((row for row in body['foods'] if row['id'] == body.get('selectedFoodId')), body['foods'][0])
        wine = next((row for row in body['wines'] if row['id'] == body.get('selectedWineId')), body['wines'][0])
        if body.get('budget'):
            wine = next(row for row in body['wines'] if row.get('price', 100000) <= body['budget']['amount'])
        return self.reply(route, {'pairs': [{'foodId': 'invented-food' if self.bad_pair else food['id'], 'wineId': wine['id'],
            'band': 'uncertain', 'positives': [food['name'] + ' con ' + wine['name'] + ': hipótesis culinaria por contrastar.'],
            'frictions': ['Faltan detalles de salsa y preparación.'], 'missing': ['Ficha sensorial verificada'], 'evidence': 'model_inference'}], 'warnings': []})


results = []
with sync_playwright() as pw:
    browser = launch_browser(pw, a)
    for case, width, height, scale in [('portrait', 393, 852, 1), ('narrow', 320, 700, 1), ('landscape', 852, 393, 1), ('large', 393, 852, 2), ('max', 393, 852, 3.12)]:
        if a.case and case != a.case:
            continue
        fixture = RestaurantFixture(browser, a.url, viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True)
        fixture.mobile_surface()
        page = fixture.page()
        dialog_warnings = []
        page.on('console', lambda message: dialog_warnings.append(message.text) if message.type == 'warning' and 'DialogContent' in message.text else None)
        checks = []
        def check(name, value, actual=None):
            checks.append({'name': name, 'passed': bool(value), 'actual': actual})
        def check_description(dialog, name):
            description = dialog.evaluate(r'''e => {
                const ids = (e.getAttribute('aria-describedby') || '').trim().split(/\s+/).filter(Boolean);
                const nodes = ids.map(id => document.getElementById(id));
                return {ids, texts: nodes.map(node => node?.textContent?.trim() || ''),
                    owned: nodes.every(node => node && e.contains(node))};
            }''')
            check(name + ' aria-describedby resolves to nonempty description', bool(description['ids']) and description['owned'] and all(description['texts']), description)
        def upload(files):
            with page.expect_file_chooser() as event:
                page.get_by_role('button', name='Añadir archivos', exact=True).click()
            event.value.set_files(files)
            expect(page.get_by_role('button', name='Analizar pendientes', exact=True)).to_be_enabled(timeout=20000)
        def analyze():
            page.get_by_role('button', name='Analizar pendientes', exact=True).click()
            expect(page.get_by_role('button', name='Cancelar', exact=True)).to_have_count(0, timeout=30000)
        try:
            page.goto(a.url + '/restaurante', wait_until='networkidle')
            expect(page.get_by_role('tab', name='Comida')).to_be_visible()
            if scale != 1:
                page.add_style_tag(content='html{font-size:%spx !important}' % (16 * scale))
                page.evaluate('document.documentElement.classList.add("matchrim-accessibility-text")')
            upload([{'name': a.image.name, 'mimeType': 'image/jpeg', 'buffer': a.image.read_bytes()}, {'name': 'food-two-pages.pdf', 'mimeType': 'application/pdf', 'buffer': pdf_bytes(2)}])
            expect(page.get_by_role('heading', name='food-two-pages.pdf', exact=True)).to_be_visible()
            check('Two input files and every PDF page admitted before any model call', len(fixture.reads) == 0 and page.get_by_text('2 páginas', exact=True).count() == 1)
            fixture.reject_next = True
            analyze()
            check('All three pages attempted, one error not silently retried', len(fixture.reads) == 3)
            page.get_by_role('button', name='Analizar pendientes', exact=True).click()
            expect(page.get_by_role('button', name='Cancelar', exact=True)).to_have_count(0, timeout=20000)
            check('Only failed page reruns; no duplicate paid calls for read pages', len(fixture.reads) == 4)
            check('Duplicate readings retain origins instead of duplicate dishes', page.get_by_role('heading', name='Chuleta', exact=True).count() == 1 and page.get_by_text('3 orígenes · 3 lecturas · lectura de IA sin confirmar', exact=True).count() == 2)
            page.get_by_role('button', name='Corregir Chuleta', exact=True).click()
            dialog = page.get_by_role('dialog')
            expect(dialog).to_be_visible()
            check_description(dialog, 'Grouped-row edit dialog')
            page.screenshot(path=str(a.output / (case + '-edit-description.png')))
            dialog.get_by_label('Nombre', exact=True).fill('Chuleta corregida')
            dialog.get_by_role('button', name='Guardar corrección', exact=True).click()
            expect(page.get_by_role('heading', name='Chuleta corregida', exact=True)).to_be_visible()
            corrected = page.get_by_role('listitem').filter(has=page.get_by_role('heading', name='Chuleta corregida', exact=True))
            source_texts = corrected.locator(':scope > p').all_text_contents()
            check('Manual correction preserves the original source', 'Chuleta a la brasa 45 EUR' in source_texts, source_texts)
            document = page.get_by_role('listitem').filter(has=page.get_by_role('heading', name=a.image.name, exact=True))
            document.get_by_text('Revisar páginas', exact=True).click()
            document.get_by_role('button', name='Ver página 1', exact=True).click()
            dialog = page.get_by_role('dialog')
            expect(dialog).to_be_visible()
            check_description(dialog, 'Original-page preview dialog')
            page.screenshot(path=str(a.output / (case + '-preview-description.png')))
            dialog.get_by_role('button', name='Close', exact=True).click()
            expect(dialog).to_be_hidden()
            page.get_by_role('tab', name='Vinos').click()
            upload([str(a.image)])
            analyze()
            check('Same input is allowed in a different menu', len(fixture.reads) == 5)
            page.get_by_role('tab', name='Combinaciones', exact=True).click()
            page.get_by_label('Plato', exact=True).select_option(label='Chuleta corregida')
            page.get_by_role('button', name='Elegir vinos para este plato', exact=True).click()
            expect(page.get_by_role('heading', name='Chuleta corregida', exact=True)).to_be_visible()
            check('Food-to-real-menu-wine focus sent with both source lists', len(fixture.ranks) == 1 and fixture.ranks[-1].get('selectedFoodId') and len(fixture.ranks[-1]['wines']) == 2)
            check('Inference, frictions and missing data visible without invented percentage', page.get_by_text('Posibles fricciones', exact=True).count() == 1 and page.get_by_text('Falta confirmar:', exact=False).count() == 1 and '%' not in page.locator('[role=tabpanel]').inner_text())
            page.screenshot(path=str(a.output / (case + '-combinations.png')), full_page=True)
            page.get_by_label('Plato', exact=True).select_option('')
            check('Changing focus invalidates old result', page.get_by_text('Posibles fricciones', exact=True).count() == 0)
            page.get_by_label('Vino', exact=True).select_option(label='Roda I')
            page.get_by_role('button', name='Elegir platos para este vino', exact=True).click()
            expect(page.get_by_text('Posibles fricciones', exact=True)).to_be_visible()
            check('Wine-to-real-menu-dish direction sent', len(fixture.ranks) == 2 and bool(fixture.ranks[-1].get('selectedWineId')))
            page.get_by_label('Quiero tomar otro vino', exact=True).fill('Mi Roda I')
            page.get_by_role('button', name='Añadir vino', exact=True).click()
            page.get_by_role('button', name='Elegir platos para este vino', exact=True).click()
            expect(page.get_by_role('button', name='Cancelar', exact=True)).to_have_count(0, timeout=20000)
            expect(page.get_by_text('Vino aportado por ti, no verificado en carta', exact=False)).to_be_visible()
            check('Manual wine never claims restaurant availability', fixture.ranks[-1]['selectedWineId'].startswith('manual-'))
            page.get_by_label('Vino', exact=True).select_option('')
            page.get_by_label('Presupuesto de vino', exact=True).fill('35')
            page.get_by_label('Servicio', exact=True).select_option('bottle')
            page.get_by_role('button', name='Combinar las cartas', exact=True).click()
            expect(page.get_by_text('Posibles fricciones', exact=True)).to_be_visible()
            check('Budget, currency and requested service carried separately', fixture.ranks[-1].get('budget') == {'amount': 35, 'currency': 'EUR', 'service': 'bottle'} and fixture.ranks[-1].get('service') == 'bottle')
            page.get_by_label('Presupuesto de vino', exact=True).fill('')
            fixture.bad_pair = True
            page.get_by_role('button', name='Combinar las cartas', exact=True).click()
            expect(page.get_by_role('alert')).to_be_visible()
            check('Invented reference rejected', 'invented-food' not in page.locator('[role=tabpanel]').inner_text())
            fixture.bad_pair = False
            page.get_by_role('tab', name='Vinos').click()
            page.get_by_label('Enlace de la carta', exact=True).fill('https://menus.restaurant.org/wines.pdf')
            page.get_by_role('button', name='Añadir URL', exact=True).click()
            expect(page.get_by_role('heading', name='controlled-50.pdf', exact=True)).to_be_visible(timeout=20000)
            check('Fifty-page URL PDF fully represented, not automatically sent to AI', len(fixture.imports) == 1 and page.get_by_text('50 páginas', exact=True).count() == 1 and len(fixture.reads) == 5)
            page.screenshot(path=str(a.output / (case + '-pages.png')), full_page=True)
            expected_reads = 5
            if case == 'portrait':
                fixture.hold = True
                page.once('dialog', lambda dialog: dialog.accept())
                page.get_by_role('button', name='Analizar pendientes', exact=True).click()
                expect(page.get_by_role('button', name='Cancelar', exact=True)).to_be_visible()
                page.wait_for_timeout(500)
                page.get_by_role('button', name='Cancelar', exact=True).click()
                expect(page.get_by_role('button', name='Cancelar', exact=True)).to_have_count(0)
                check('Cancel stops the batch after only its in-flight page', len(fixture.reads) == 6, len(fixture.reads))
                for held in fixture.held:
                    try:
                        held.abort('failed')
                    except Exception:
                        pass
                fixture.hold = False
                page.once('dialog', lambda dialog: dialog.accept())
                page.get_by_role('button', name='Analizar pendientes', exact=True).click()
                expect(page.get_by_role('button', name='Cancelar', exact=True)).to_have_count(0, timeout=90000)
                expected_reads = 56
                check('Every one of fifty PDF pages actually renders and reaches controlled reader', len(fixture.reads) == expected_reads and len({row['pageId'] for row in fixture.reads if row['kind'] == 'wine'}) == 51, len(fixture.reads))
                check('No skipped page or silent prefix in UI coverage', page.get_by_text('51/51 páginas seleccionadas leídas · 0 excluidas', exact=True).count() == 1)
            expect(page.get_by_text('Borrador guardado en este dispositivo.', exact=True)).to_be_visible()
            page.reload(wait_until='networkidle')
            expect(page.get_by_role('tab', name='Comida')).to_be_visible()
            page.get_by_role('tab', name='Vinos').click()
            expect(page.get_by_role('heading', name='controlled-50.pdf', exact=True)).to_be_visible()
            if scale != 1:
                page.add_style_tag(content='html{font-size:%spx !important}' % (16 * scale))
                page.evaluate('document.documentElement.classList.add("matchrim-accessibility-text")')
            check('IndexedDB restores documents after reload without rereading', len(fixture.reads) == expected_reads)
            check('No horizontal overflow', page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1'))
            check('Five navigation targets stay within viewport', page.get_by_role('navigation', name='Navegación principal').get_by_role('link').evaluate_all('els=>els.length===5&&els.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=0&&r.right<=document.documentElement.clientWidth+1})'))
            check('No runtime exceptions', not fixture.errors, fixture.errors)
            check('No DialogContent accessibility warning', not dialog_warnings, dialog_warnings)
            check('All remote traffic intercepted and no unknown mutations', fixture.finish()['externalIntercepted'] and not fixture.unexpected, fixture.unexpected)
        except Exception as failure:
            check('Full scenario completed', False, str(failure))
            (a.output / (case + '-dom-text.txt')).write_text(page.locator('body').inner_text())
            (a.output / (case + '-geometry.json')).write_text(json.dumps(page.evaluate('''() => ({width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,nodes:Array.from(document.querySelectorAll("main *")).map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,text:e.textContent?.slice(0,70),class:e.className,x:r.x,y:r.y,w:r.width,h:r.height}}).filter(r=>r.w>0&&r.h>0).slice(-100)})'''), indent=2))
            page.screenshot(path=str(a.output / (case + '-viewport.png')))
            page.screenshot(path=str(a.output / (case + '-failure.png')), full_page=True)
        results.append({'case': case, 'checks': checks, 'reads': fixture.reads, 'rankCalls': len(fixture.ranks), 'imports': fixture.imports, 'urlInput': page.locator('input[type=url]').input_value() if page.locator('input[type=url]').count() else None, 'passed': all(row['passed'] for row in checks), 'network': fixture.finish()})
        fixture.context.close()
    browser.close()
(a.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'results': results}, indent=2, ensure_ascii=False))
print(json.dumps({'scenarios': len(results), 'checks': sum(len(row['checks']) for row in results), 'failed': [{'case': row['case'], 'checks': [check for check in row['checks'] if not check['passed']]} for row in results if not row['passed']]}, ensure_ascii=False))
raise SystemExit(0 if all(row['passed'] for row in results) else 1)
