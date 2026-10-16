"""Actual scanner UI with synthetic OCR and captured first-party detail; zero outbound requests."""
import argparse
import copy
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4594')
p.add_argument('--output', type=Path, required=True)
p.add_argument('--catalog', type=Path, required=True)
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1]
catalog = json.loads(args.catalog.read_text())
source = [r for r in catalog['reads'] if r['case'] == 'public-nv-control']
assert len(source) == 3
resolver, listing, detail = [r['body'] for r in source]
name, producer = detail['name'], detail['winery']
image = root / 'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/fixtures/IMG_7547 2.jpg'
profile = {'potente': 2, 'acidez': 4, 'dulce': 1, 'tanico': 0, 'afrutado': 1}
results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for mode in ['resolved', 'missing-sensory', 'missing-profile', 'wrong-vintage', 'wrong-producer', 'ambiguous', 'manual-retry', 'low-signal', 'no-literal']:
            for orientation in ['portrait', 'landscape', 'text200']:
                width, height = {'portrait': (393, 852), 'landscape': (852, 393), 'text200': (320, 700)}[orientation]
                context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, reduced_motion='reduce', service_workers='block')
                seed = {'matchrim.local_profile_owner.v1': 'anonymous', 'matchrim.onboarding.v2:anonymous': json.dumps({'version': 2, 'result': 'skipped'}), 'matchrim.scan_privacy_notice.v2': 'accepted'}
                if mode != 'missing-profile':
                    seed['matchrim_quiz_result'] = json.dumps(profile)
                context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);" % json.dumps(seed))
                calls, errors, checks = [], [], []
                state = {'fail': mode == 'manual-retry'}
                wine = {'nombre': name, 'productor': 'Otro productor' if mode == 'wrong-producer' else producer,
                        'anada': 2020 if mode == 'wrong-vintage' else None, 'region': detail['region'], 'pais': detail['country'],
                        'confidence': .2 if mode == 'low-signal' else .78, 'dudas': ['Lectura de confianza media'], 'campos_inferidos': [], 'precio': None,
                        'tipo': 'Generoso', 'descripcion': None, 'texto_fuente': None if mode == 'no-literal' else name + ' ' + producer,
                        'posicion': {'x': 10, 'y': 15, 'width': 60, 'height': 10}}

                def intercept(route):
                    req, url = route.request, urlparse(route.request.url)
                    if url.netloc == urlparse(args.url).netloc:
                        return route.continue_()
                    calls.append({'method': req.method, 'host': url.hostname, 'path': url.path})
                    payload = [] if '/rest/v1/' in url.path else {}
                    status = 200
                    if '/functions/v1/scan-wine-menu' in url.path:
                        payload = {'vinos': [wine], 'layout': 'rows', 'coverage': {'status': 'reported_complete', 'extracted_wines': 1}}
                    elif url.hostname == 'app.winerim.com':
                        assert req.method == 'GET'
                        if state['fail']:
                            status, payload = 503, {}
                        elif url.path.endswith('/slugname'):
                            payload = resolver
                        elif 'text=' in url.query:
                            payload = copy.deepcopy(listing)
                            if mode == 'ambiguous':
                                payload['results'].append({**detail, 'id': 999999})
                                payload['count'] = 2
                        else:
                            payload = copy.deepcopy(detail)
                            if mode == 'missing-sensory':
                                payload['tastingAttributes'] = None
                    route.fulfill(status=status, content_type='application/json', body=json.dumps(payload), headers={'Access-Control-Allow-Origin': '*'})

                context.route('**/*', intercept)
                page = context.new_page()
                page.set_default_timeout(8000)
                page.on('pageerror', lambda error: errors.append(str(error)))
                def check(label, condition):
                    checks.append({'name': label, 'passed': bool(condition)})
                    assert condition, label
                case = mode + '-' + orientation
                try:
                    page.goto(args.url + '/escanear/carta-vinos', wait_until='networkidle')
                    page.locator('input[type=file]').first.wait_for(state='attached', timeout=30000)
                    page.locator('input[type=file]').first.set_input_files(str(image))
                    row = page.get_by_role('button', name=re.compile(r'^Abrir vino 1:'))
                    row.wait_for(timeout=30000)
                    row.click()
                    content = page.get_by_role('region', name='Contenido del vino', exact=True)
                    content.wait_for()
                    page.wait_for_function('''() => {
                        const el=document.querySelector('[role=dialog]');
                        if(!el)return false;
                        return Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42)<1;
                    }''')
                    page.evaluate('''() => new Promise((resolve,reject)=>{
                        let previous=null, stable=0, frames=0;
                        const tick=()=>{
                            const el=document.querySelector('[role=dialog]');
                            if(!el)return reject(new Error('Detail closed before settling'));
                            const r=el.getBoundingClientRect();
                            if(frames>3 && previous!==null && Math.abs(r.top-previous)<.1 && r.top<innerHeight*.3 && r.bottom<innerHeight+2)stable++;else stable=0;
                            previous=r.top;frames++;
                            if(stable>=12)return resolve();
                            if(frames>240)return reject(new Error('Detail did not settle'));
                            requestAnimationFrame(tick);
                        };requestAnimationFrame(tick);
                    })''')
                    if orientation == 'text200':
                        page.evaluate("document.documentElement.style.fontSize='200%'")
                    if mode == 'manual-retry':
                        check('Initial outage keeps affinity pending', content.get_by_text('Afinidad pendiente', exact=True).count() > 0)
                        state['fail'] = False
                        content.get_by_role('button', name=re.compile(r'^Ficha original Winerim:')).click()
                        content.get_by_role('link', name='Ver ficha original Winerim', exact=True).wait_for()
                    positive = mode in ['resolved', 'manual-retry']
                    if positive:
                        check('Same exact source produces expected personal score', content.get_by_text('≈93%', exact=True).count() > 0)
                        check('Original zero remains visible', content.get_by_text('0/5', exact=True).count() > 0)
                        check('Explanation uses zero, not one', 'vino 0.0' in content.inner_text())
                        check('Original source linked', content.get_by_role('link', name='Ver ficha original Winerim', exact=True).count() == 1)
                        check('Source identity is separate from OCR signal', content.get_by_text('Vinculada', exact=True).count() == 1)
                    else:
                        check('Incomplete/conflicting evidence does not become numeric affinity', content.get_by_text('≈93%', exact=True).count() == 0)
                        check('Pending is not dislike', content.get_by_text('Afinidad pendiente', exact=True).count() > 0)
                    check('No horizontal overflow', not page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                    controls = content.get_by_role('button').evaluate_all('(els)=>els.filter(e=>e.getClientRects().length).map(e=>({label:e.getAttribute("aria-label")||e.textContent,height:e.getBoundingClientRect().height}))')
                    check('Reachable detail buttons are at least 44pt', all(c['height'] >= 43.5 for c in controls))
                    page.screenshot(path=str(args.output / (case + '.png')))
                    if positive:
                        content.get_by_text('Por qué encaja', exact=True).scroll_into_view_if_needed()
                        page.screenshot(path=str(args.output / (case + '-explanation.png')))
                        content.get_by_role('meter', name=re.compile('^tanino:')).scroll_into_view_if_needed()
                        page.screenshot(path=str(args.output / (case + '-dimensions.png')))
                    if mode in ['low-signal', 'no-literal']:
                        check('Weak/unattributed OCR does not search the catalog automatically', not any(c['host'] == 'app.winerim.com' for c in calls))
                    (args.output / (case + '-text.txt')).write_text(content.inner_text())
                    check('No browser exceptions', errors == [])
                    check('No stored/test accounts or production writes', all(c['method'] == 'GET' or '/functions/v1/' in c['path'] for c in calls))
                    results.append({'case': case, 'passed': True, 'checks': checks, 'calls': calls, 'errors': errors})
                except Exception as error:
                    page.screenshot(path=str(args.output / (case + '-failure.png')))
                    results.append({'case': case, 'passed': False, 'error': str(error), 'checks': checks, 'calls': calls, 'errors': errors})
                finally:
                    context.close()
    finally:
        browser.close()
report = {'results': results, 'passed': sum(r['passed'] for r in results), 'total': len(results), 'realOutboundCalls': 0,
          'scope': __doc__ + ' The image is a pre-existing transport/layout fixture, not a claim that the OCR name occurs in those pixels. Synthetic profiles are not real users.'}
(args.output / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
print(json.dumps({'passed': report['passed'], 'total': report['total'], 'failures': [{'case': r['case'], 'error': r['error']} for r in results if not r['passed']]}, ensure_ascii=False))
raise SystemExit(0 if report['passed'] == report['total'] else 1)
