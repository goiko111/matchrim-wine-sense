"""Actual Restaurant UI from frozen bytes; every request is fulfilled locally or blocked.

Captured La Gitana Library responses come from 94. Session, dishes, profile,
rank reply and decimal variants are explicit synthetic controls, not recognition
or live consumer evidence. No native R1 artifacts, accounts or real endpoints.
"""
import argparse
import base64
import copy
import hashlib
import json
import mimetypes
import re
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.sync_api import expect, sync_playwright


def digest(data):
    return hashlib.sha256(data).hexdigest()


def fake_session(owner):
    def encode(value):
        return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
    user = {'id': owner, 'aud': 'authenticated', 'role': 'authenticated',
            'email': 'restaurant95@qa.invalid', 'app_metadata': {}, 'user_metadata': {}}
    return {'user': user, 'access_token': encode({'alg': 'HS256', 'typ': 'JWT'}) + '.'
            + encode({'sub': owner, 'exp': 4102444800}) + '.synthetic-invalid',
            'refresh_token': 'synthetic-invalid', 'expires_at': 4102444800,
            'expires_in': 86400, 'token_type': 'bearer'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build', type=Path, required=True, help='Private controlled build parent with build-freeze.json')
    parser.add_argument('--catalog', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--case', help='Optional one-case smoke, preserving separate evidence directory')
    args = parser.parse_args()
    assert not args.output.exists(), 'Preserve existing evidence'
    args.output.mkdir(parents=True)
    freeze = json.loads((args.build / 'build-freeze.json').read_text())
    assert freeze['state'] == 'frozen'
    frozen = {}
    for item in freeze['outputFiles']:
        data = (args.build / 'build' / item['file']).read_bytes()
        assert digest(data) == item['sha256']
        frozen['/' + item['file']] = data
    captured = json.loads(args.catalog.read_text())
    rows = [entry for entry in captured['reads'] if entry['case'] == 'public-nv-control']
    assert len(rows) == 3
    resolver, listing, original = [entry['body'] for entry in rows]
    owner = '95000000-0000-4000-8000-000000000095'
    session = fake_session(owner)
    base = 'http://127.0.0.1:4596'
    result_rows = []
    scenarios = [
        ('valid-portrait', 393, 852, 1), ('valid-landscape', 852, 393, 1),
        ('valid-text200', 393, 852, 2), ('decimal-portrait', 393, 852, 1),
        ('missing-profile', 393, 852, 1), ('missing-sensory', 393, 852, 1),
        ('wrong-source', 393, 852, 1), ('edited-identity', 393, 852, 1),
        ('reverse-pairing', 393, 852, 1), ('cancel-late-library', 393, 852, 1),
    ]
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True,
            executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args=['--disable-background-networking', '--host-resolver-rules=MAP * ~NOTFOUND'])
        try:
            for case, width, height, scale in scenarios:
                if args.case and case != args.case:
                    continue
                context = browser.new_context(viewport={'width': width, 'height': height}, locale='es-ES',
                    is_mobile=True, has_touch=True, reduced_motion='reduce', service_workers='block')
                context.set_default_timeout(10000)
                calls, unexpected, errors, held, checks, sockets = [], [], [], [], [], []
                source = copy.deepcopy(original)
                search = copy.deepcopy(listing)
                profile = {'potente': 2, 'acidez': 4, 'dulce': 1, 'tanico': 0, 'afrutado': 1}
                if case == 'decimal-portrait':
                    source['tastingAttributes']['power'] = 2.4
                    search['results'][0]['tastingAttributes']['power'] = 2.4
                    profile['potente'] = 2.4
                if case == 'missing-sensory':
                    source['tastingAttributes'] = None
                if case == 'wrong-source':
                    source['winery'] = 'Other captured-control producer'
                dish1 = {'id': 'dish-gambas', 'kind': 'food', 'name': 'Gambas', 'sourceText': 'Gambas a la plancha 18 EUR',
                         'price': 18, 'currency': 'EUR', 'pageIds': ['food-p1'], 'reviewed': True}
                dish2 = {**dish1, 'id': 'dish-arroz', 'name': 'Arroz', 'sourceText': 'Arroz de verduras 16 EUR', 'price': 16}
                wine = {'id': 'wine-gitana', 'kind': 'wine', 'name': original['name'], 'producer': original['winery'],
                        'sourceText': original['name'] + ' / ' + original['winery'] + ' Botella 20 EUR', 'pageIds': ['wine-p1'],
                        'reviewed': True, 'price': 20, 'currency': 'EUR', 'service': 'bottle'}
                state = {'version': 1, 'id': 'controlled-restaurant95', 'restaurant': 'Restaurant95 control', 'revision': 0,
                    'documents': [{'id': kind, 'kind': kind, 'name': 'Controlled ' + kind, 'digest': ('f' if kind == 'food' else 'a') * 64,
                                   'pageCount': 1, 'text': 'Synthetic controlled Restaurant95 source'} for kind in ('food', 'wine')],
                    'pages': [{'id': kind + '-p1', 'documentId': kind, 'number': 1, 'enabled': True,
                               'status': 'read', 'partial': False, 'warnings': []} for kind in ('food', 'wine')],
                    'rows': [dish1, dish2, wine], 'pairs': [], 'pairWarnings': []}

                def reply(route, payload, status=200):
                    route.fulfill(status=status, content_type='application/json', body=json.dumps(payload),
                                  headers={'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*'})

                def intercept(route):
                    req = route.request
                    u = urlparse(req.url)
                    entry = {'method': req.method, 'host': u.hostname, 'path': u.path}
                    calls.append(entry)
                    if u.netloc == urlparse(base).netloc:
                        if u.path == '/qa-seed':
                            return route.fulfill(status=200, content_type='text/html', body='<html><body>Private local seed</body></html>')
                        target = unquote(u.path)
                        if target in ('/', '/restaurante'):
                            target = '/index.html'
                        if target in frozen:
                            return route.fulfill(status=200, body=frozen[target], content_type=mimetypes.guess_type(target)[0] or 'application/octet-stream')
                        return route.fulfill(status=404, body='No frozen asset')
                    if req.method == 'OPTIONS':
                        return reply(route, {})
                    if u.hostname == 'app.winerim.com':
                        assert req.method == 'GET'
                        if u.path.endswith('/slugname'):
                            return reply(route, resolver)
                        if 'text=' in u.query:
                            if case == 'cancel-late-library':
                                held.append(route)
                                return
                            return reply(route, search)
                        if u.path.endswith('/278688/Manzanilla-La-Gitana'):
                            return reply(route, source)
                    if u.hostname == 'cbjynrbvrhcmpaojmqdp.supabase.co':
                        if u.path == '/auth/v1/user' and req.method == 'GET':
                            return reply(route, session['user'])
                        if u.path.startswith('/rest/v1/') and req.method == 'GET':
                            table = u.path.rsplit('/', 1)[-1]
                            if table == 'quiz_results':
                                return reply(route, [] if case == 'missing-profile' else [{**profile, 'user_id': owner}])
                            if table in ('profiles', 'user_wines', 'user_roles'):
                                return reply(route, [])
                        if u.path.endswith('/functions/v1/restaurant-workspace91') and req.method == 'POST':
                            body = req.post_data_json
                            assert body['operation'] == 'rank', 'No recognition/model calls in this control'
                            entry['operation'] = body['operation']
                            entry['selectedWineId'] = body.get('selectedWineId')
                            entry['selectedFoodId'] = body.get('selectedFoodId')
                            return reply(route, {'pairs': [{'foodId': 'dish-gambas', 'wineId': 'wine-gitana', 'band': 'uncertain',
                                'positives': ['Gambas y Manzanilla La Gitana: hipotesis culinaria controlada, sin perfil sensorial inferido.'],
                                'frictions': ['Confirmar la preparacion.'], 'missing': ['Salsa y alergias'],
                                'evidence': 'model_inference'}], 'warnings': []})
                    unexpected.append(entry)
                    route.abort('blockedbyclient')

                context.route('**/*', intercept)
                def socket(ws):
                    sockets.append({'blocked': True})
                    ws.close(code=1008, reason='No outbound sockets in controlled Restaurant95 QA')
                context.route_web_socket(re.compile('.*'), socket)
                init = {'owner': owner, 'session': session, 'scale': scale, 'ignoreAbort': case == 'cancel-late-library'}
                context.add_init_script("""(() => {
                    const s=%s; window.CapacitorCustomPlatform={name:'ios'};
                    localStorage.setItem('sb-cbjynrbvrhcmpaojmqdp-auth-token',JSON.stringify(s.session));
                    localStorage.setItem('matchrim.local_profile_owner.v1',s.owner);
                    localStorage.setItem('matchrim.onboarding.v2:'+s.owner,JSON.stringify({version:2,result:'skipped'}));
                    localStorage.setItem('matchrim.scan_privacy_notice.v2','accepted');
                    document.addEventListener('DOMContentLoaded',()=>{
                        document.documentElement.style.fontSize=(16*s.scale)+'px';
                        if(s.scale>1)document.documentElement.classList.add('matchrim-accessibility-text');
                    });
                    if(s.ignoreAbort){
                        const original=window.fetch;
                        window.__qaLateLibraryResolved=0;
                        window.fetch=async(input,init)=>{
                            if(String(input).startsWith('https://app.winerim.com/')){
                                const result=await original(input,{...init,signal:undefined});
                                window.__qaLateLibraryResolved++;return result;
                            }return original(input,init);
                        };
                    }
                })();""" % json.dumps(init))
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                def check(label, condition):
                    checks.append({'name': label, 'passed': bool(condition)})
                    assert condition, label
                try:
                    page.goto(base + '/qa-seed', wait_until='networkidle')
                    page.evaluate("""async ({owner,state})=>{
                        await new Promise((resolve,reject)=>{
                            const q=indexedDB.open('matchrim.restaurant91',2);
                            q.onupgradeneeded=()=>{for(const name of ['sessions','files'])if(!q.result.objectStoreNames.contains(name))q.result.createObjectStore(name);};
                            q.onerror=()=>reject(q.error);q.onsuccess=()=>{
                                const tx=q.result.transaction('sessions','readwrite');tx.objectStore('sessions').put(state,owner);
                                tx.oncomplete=()=>{q.result.close();resolve();};tx.onerror=()=>reject(tx.error);
                            };
                        });
                    }""", {'owner': owner, 'state': state})
                    page.goto(base + '/restaurante', wait_until='networkidle')
                    page.get_by_role('tab', name=re.compile('^Vinos')).click()
                    heading = page.get_by_role('heading', name=original['name'], exact=True)
                    heading.wait_for()
                    wine_row = page.locator('li').filter(has=heading).first
                    wine_row.get_by_role('button', name='Ficha y afinidad', exact=True).click()
                    if case == 'cancel-late-library':
                        for _ in range(100):
                            if held:
                                break
                            page.wait_for_timeout(50)
                        check('Library transport held before cancellation', len(held) == 1)
                        page.get_by_role('button', name='Cancelar', exact=True).click()
                        expect(page.get_by_role('button', name='Cancelar', exact=True)).to_have_count(0)
                        for route in held:
                            reply(route, search)
                        page.wait_for_function('window.__qaLateLibraryResolved >= 2')
                        check('Late transport truly resolved despite AbortSignal', page.evaluate('window.__qaLateLibraryResolved') >= 2)
                        check('No late source, summary or profile committed', page.get_by_test_id('native-affinity-summary').count() == 0
                              and page.get_by_test_id('restaurant-original-details').count() == 0
                              and not any(c['path'].endswith('/quiz_results') for c in calls))
                    elif case == 'wrong-source':
                        expect(page.get_by_role('alert')).to_contain_text('Afinidad pendiente')
                        check('Conflicting independent detail is not displayed as a personal score', page.get_by_test_id('native-affinity-summary').count() == 0)
                    else:
                        pending = case in ('missing-profile', 'missing-sensory')
                        summary = page.get_by_test_id('native-affinity-pending' if pending else 'native-affinity-summary')
                        expect(summary).to_be_visible()
                        check('One consumer summary only', page.locator('[data-testid="native-affinity-summary"], [data-testid="native-affinity-pending"]').count() == 1)
                        original_details = page.get_by_test_id('restaurant-original-details')
                        check('Consumer summary precedes optional fiche in actual DOM', summary.evaluate('(el)=>!!(el.compareDocumentPosition(document.querySelector("[data-testid=restaurant-original-details]"))&Node.DOCUMENT_POSITION_FOLLOWING)'))
                        check('Fiche starts collapsed', not original_details.evaluate('el=>el.open'))
                        check('Native raw percentage rail removed', 'Afinidad contigo:' not in wine_row.inner_text())
                        if pending:
                            check('Pending carries no visible score', page.get_by_test_id('native-affinity-summary').count() == 0)
                            if case == 'missing-profile':
                                expect(summary.get_by_role('link', name='Completar mi test')).to_be_visible()
                            else:
                                expect(summary).to_contain_text('Faltan datos sensoriales')
                        else:
                            expect(summary.get_by_label('Afinidad orientativa: 93 de 100')).to_be_visible()
                            summary.scroll_into_view_if_needed()
                            page.screenshot(path=str(args.output / (case + '-consumer.png')))
                            page.get_by_test_id('native-affinity-details').locator('summary').click()
                            expect(summary).to_contain_text('Este vino: 0.0/5')
                            if case == 'decimal-portrait':
                                expect(summary).to_contain_text('Este vino: 2.4/5')
                            check('Captured zero and controlled decimal remain exact', 'Este vino: 0.0/5' in summary.inner_text())
                        if case == 'edited-identity':
                            wine_row.get_by_role('button', name='Corregir ' + original['name'], exact=True).click()
                            dialog = page.get_by_role('dialog')
                            dialog.get_by_label('Bodega', exact=True).fill('Edited producer')
                            dialog.get_by_role('button', name='Guardar corrección', exact=True).click()
                            expect(page.get_by_test_id('native-affinity-summary')).to_have_count(0)
                            check('Editing row invalidates old score and original fiche', page.get_by_test_id('restaurant-original-details').count() == 0)
                            wine_row.get_by_role('button', name='Ficha y afinidad', exact=True).click()
                            expect(page.get_by_role('alert')).to_contain_text('Afinidad pendiente')
                            check('Edited producer cannot inherit La Gitana sheet', page.get_by_test_id('native-affinity-summary').count() == 0)
                        elif case == 'reverse-pairing':
                            wine_row.get_by_role('button', name='Platos para este vino', exact=True).click()
                            expect(page.get_by_role('combobox', name='Vino', exact=True)).to_have_value('wine-gitana')
                            page.get_by_role('button', name='Elegir platos para este vino', exact=True).click()
                            expect(page.get_by_role('heading', name='Gambas', exact=True)).to_be_visible()
                            check('Reverse pairing sends selected current wine', any(c.get('operation') == 'rank' and c.get('selectedWineId') == 'wine-gitana' for c in calls))
                            text = page.locator('main').inner_text()
                            check('Pairing does not mix culinary band with personal affinity', 'Maridajes orientativos por IA, no puntuaciones personales' in text
                                  and page.get_by_test_id('native-affinity-summary').count() == 0 and '≈93' not in text)
                            page.screenshot(path=str(args.output / (case + '-pairs.png')))
                            page.get_by_role('button', name='Ver ficha y afinidad del vino', exact=True).click()
                            expect(page.get_by_test_id('native-affinity-summary')).to_be_visible()
                            check('Returning from reverse pairing has one current-wine summary', page.get_by_test_id('native-affinity-summary').count() == 1)
                        else:
                            original_details.locator('summary').first.click()
                            expect(page.get_by_test_id('winerim-original-sheet')).to_be_visible()
                            if case != 'missing-sensory':
                                expect(page.get_by_test_id('winerim-original-sheet')).to_contain_text('0/5')
                    check('No horizontal overflow', not page.evaluate('document.documentElement.scrollWidth>innerWidth'))
                    check('No actual browser runtime errors', errors == [])
                    check('All unmodeled traffic blocked; none required', unexpected == [])
                    page.screenshot(path=str(args.output / (case + '-final.png')), full_page=True)
                    (args.output / (case + '-text.txt')).write_text(page.locator('main').inner_text())
                    result_rows.append({'case': case, 'passed': True, 'checks': checks, 'requests': calls, 'errors': errors, 'unexpected': unexpected})
                except Exception as error:
                    page.screenshot(path=str(args.output / (case + '-failure.png')), full_page=True)
                    result_rows.append({'case': case, 'passed': False, 'error': str(error), 'checks': checks,
                                        'requests': calls, 'errors': errors, 'unexpected': unexpected})
                finally:
                    context.close()
        finally:
            browser.close()
    report = {'scope': __doc__, 'build': str(args.build), 'buildFreezeSha256': digest((args.build / 'build-freeze.json').read_bytes()),
              'runnerSha256': digest(Path(__file__).read_bytes()), 'catalog94Sha256': digest(args.catalog.read_bytes()),
              'results': result_rows, 'passed': sum(r['passed'] for r in result_rows), 'total': len(result_rows),
              'realOutboundCalls': 0, 'realAuthCalls': 0, 'models': 0, 'productionWrites': 0,
              'transport': 'No route.continue, route.fetch, sockets or real host resolution; static frozen bytes and local fixtures only',
              'nativeBuildOrR1Modified': False}
    (args.output / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({'passed': report['passed'], 'total': report['total'],
                      'failures': [{'case': r['case'], 'error': r['error']} for r in result_rows if not r['passed']]}, ensure_ascii=False))
    return 0 if report['passed'] == report['total'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
