"""Local UI with frozen real BBQ replies and controlled negative cases; no fresh recognition."""
import argparse
import copy
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect
from qa_matchrim_runtime import add_browser_options, launch_browser, upload_scan_file
from qa_matchrim_cloud_fixture import ClientFixture

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', required=True)
p.add_argument('--trace', type=Path, required=True)
p.add_argument('--image', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--only-case', choices=['narrow', 'portrait', 'landscape', 'large-text'])
p.add_argument('--only-scenario', choices=['bbq-replay', 'all-blocked'])
add_browser_options(p)
a = p.parse_args()
assert hashlib.sha256(a.image.read_bytes()).hexdigest() == '15a82f5bbaace92067533e1820ba3428b362561216de93cdaba4bbaa64cfff6a'
assert not a.output.exists(), 'Preserve previous evidence'
a.output.mkdir(parents=True)
trace = json.loads(a.trace.read_text())
replies = {row['request']['scan_region']['id']: row['payload'] for row in trace if row['status'] == 200 and row['function'].startswith('scan-food-pairing')}
assert set(replies) == {'left', 'right', 'center'}


class FoodFixture(ClientFixture):
    def __init__(self, browser, url, scenario, **options):
        self.scenario = scenario
        self.food_calls = []
        super().__init__(browser, url, **options)

    def intercept(self, route):
        req = route.request
        path = urlparse(req.url).path
        if '/functions/v1/scan-food-pairing' not in path:
            return super().intercept(route)
        self.handled.append(req.url)
        body = req.post_data_json
        tile = body.get('scan_region', {}).get('id')
        self.food_calls.append({'tile': tile, 'mode': body.get('mode')})
        payload = copy.deepcopy(replies[tile])
        if self.scenario == 'all-blocked':
            payload['dishes'] = [next(row for row in payload['dishes'] if 'COMING SOON' in row['source_text'])] if tile in ['left', 'center'] else []
        return self.reply(route, payload)


rows = []
with sync_playwright() as pw:
    browser = launch_browser(pw, a)
    for scenario in ['bbq-replay', 'all-blocked']:
        if a.only_scenario and scenario != a.only_scenario:
            continue
        for case, w, h, scale in [('narrow', 320, 568, 1), ('portrait', 393, 852, 1), ('landscape', 852, 393, 1), ('large-text', 393, 852, 2)]:
            if a.only_case and case != a.only_case:
                continue
            fixture = FoodFixture(browser, a.url, scenario, viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True)
            fixture.mobile_surface()
            page = fixture.page()
            checks = []
            observed = {}
            def check(name, ok, actual=None):
                checks.append({'name': name, 'passed': bool(ok), 'actual': actual})
            try:
                page.goto(a.url + '/escanear/menu-comida?wine=Wine-for-controlled-context', wait_until='networkidle')
                if scale == 2:
                    page.add_style_tag(content='html {font-size:32px !important}')
                upload_scan_file(page, 'food', str(a.image))
                expect(page.get_by_test_id('food-row-0')).to_be_visible(timeout=20000)
                dish_rows = page.locator('[data-testid^="food-row-"]')
                check('Exactly three intercepted crops and no paid request', len(fixture.food_calls) == 3, fixture.food_calls)
                check('Raw rows preserved rather than silently deleted', dish_rows.count() == (35 if scenario == 'bbq-replay' else 2), dish_rows.count())
                for name in ['Beef Bologna', 'Cake / Pie / Cheesecake']:
                    row = dish_rows.filter(has=page.get_by_role('heading', name=name, exact=True))
                    expect(row).to_have_count(1)
                    check(name + ' is explicitly not yet available', 'Próximamente' in row.inner_text())
                    check(name + ' cannot seed pairing/save/aiRIM actions', row.get_by_role('button').count() == 0)
                    row.scroll_into_view_if_needed()
                    page.screenshot(path=str(a.output / (scenario + '-' + case + '-' + ('beef' if name == 'Beef Bologna' else 'cake') + '.png')))
                if scenario == 'bbq-replay':
                    row = dish_rows.filter(has=page.get_by_role('heading', name='Frozen + Chilled Meats', exact=True))
                    check('Ask-us line needs clarification, not a concrete dish choice', 'Confirmar plato' in row.inner_text() and row.get_by_role('button').count() == 0)
                    row = dish_rows.filter(has=page.get_by_role('heading', name='OG Burger', exact=True))
                    check('Sunday restriction is conditional, not all-week rejection', 'según el día' in row.inner_text() and row.get_by_role('button', name='Encontrar botella real en la carta', exact=True).count() == 1)
                    row = dish_rows.filter(has=page.get_by_role('heading', name='Beef Ribs (LG)', exact=True))
                    check('Portion-only source line cannot validate inferred parent dish', 'Falta identificar' in row.inner_text() and row.get_by_role('button').count() == 0)
                    row = dish_rows.filter(has=page.get_by_role('heading', name='Brisket', exact=True))
                    check('Ordinary listed dish remains actionable, not certified in stock', 'Disponibilidad sin confirmar' in row.inner_text() and row.get_by_role('button', name='Encontrar botella real en la carta', exact=True).count() == 1)
                else:
                    check('No dead dish-for-wine shortcut when every row is blocked', page.get_by_role('button', name=re.compile('plato.*vino', re.I)).count() == 0)
                check('No document horizontal overflow at this text size', page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1'))
                observed['overflowingElements'] = page.evaluate('Array.from(document.querySelectorAll("main *")).map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,cls:e.className,text:e.textContent?.slice(0,100),left:r.left,right:r.right,width:r.width}}).filter(r=>r.right>document.documentElement.clientWidth+1||r.left < -1).slice(0,25)')
                observed['availability'] = page.get_by_test_id('food-availability').all_inner_texts()
                observed['navigationRects'] = page.get_by_role('navigation', name='Navegación principal', exact=True).get_by_role('link').evaluate_all('els=>els.map(e=>{const r=e.getBoundingClientRect(),s=e.querySelector("span[aria-hidden=true]")?.getBoundingClientRect();return {label:e.getAttribute("aria-label"),left:r.left,right:r.right,width:r.width,height:r.height,labelLeft:s?.left,labelRight:s?.right,grid:getComputedStyle(e.parentElement).gridTemplateColumns,parentWidth:e.parentElement.getBoundingClientRect().width}})')
                observed['navigationAncestors'] = page.get_by_role('navigation', name='Navegación principal', exact=True).evaluate('e=>{const out=[];for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n),r=n.getBoundingClientRect();out.push({tag:n.tagName,class:n.className,width:r.width,left:r.left,minWidth:s.minWidth,maxWidth:s.maxWidth,cssWidth:s.width,position:s.position,transform:s.transform,filter:s.filter,contain:s.contain,overflow:s.overflow});}return {nodes:out,innerWidth,visualWidth:visualViewport.width,docClient:document.documentElement.clientWidth,docScroll:document.documentElement.scrollWidth}}')
                check('All five navigation targets fit the viewport and remain 44px', len(observed['navigationRects']) == 5 and all(r['left'] >= 0 and r['right'] <= w + 1 and r['width'] >= 44 and r['height'] >= 44 for r in observed['navigationRects']), observed['navigationRects'])
                observed['axStatusNames'] = [node.get('name', {}).get('value') for node in fixture.context.new_cdp_session(page).send('Accessibility.getFullAXTree')['nodes'] if 'Próximamente' in str(node.get('name', {}).get('value', ''))]
                check('Unavailable status exists in accessibility tree', bool(observed['axStatusNames']))
                global_scan = page.get_by_role('button', name='Escanear carta de vinos y elegir botella real', exact=True)
                global_scan.click()
                page.wait_for_url('**/escanear/carta-vinos**')
                state = page.evaluate('history.state')
                observed['navigation'] = {'url': page.url, 'state': state}
                serialized = json.dumps(state)
                check('Blocked rows are absent from carried food context', 'COMING SOON' not in serialized and 'FROZEN + CHILLED' not in serialized)
                check('General wine scan remains available without selecting blocked first row', 'Beef+Bologna' not in page.url and 'Beef%20Bologna' not in page.url)
                check('All remote URLs intercepted and no unknown operations', fixture.finish()['externalIntercepted'] and not fixture.unexpected, fixture.unexpected)
                check('No browser runtime exceptions', not fixture.errors, fixture.errors)
            except Exception as error:
                check('Scenario completed', False, str(error))
                page.screenshot(path=str(a.output / (scenario + '-' + case + '-failure.png')))
            finally:
                rows.append({'scenario': scenario, 'case': case, 'checks': checks, 'observed': observed, 'network': fixture.finish(), 'passed': all(c['passed'] for c in checks)})
                fixture.context.close()
    browser.close()
report = {'scope': __doc__, 'traceSha256': hashlib.sha256(a.trace.read_bytes()).hexdigest(), 'sourceSha256': hashlib.sha256(a.image.read_bytes()).hexdigest(), 'results': rows}
(a.output / 'results.json').write_text(json.dumps(report, indent=2, ensure_ascii=False))
print(json.dumps({'scenarios': len(rows), 'checks': sum(len(r['checks']) for r in rows), 'failed': [{'scenario': r['scenario'], 'case': r['case'], 'checks': [c for c in r['checks'] if not c['passed']]} for r in rows if not r['passed']]}))
if any(not r['passed'] for r in rows):
    raise SystemExit(1)
