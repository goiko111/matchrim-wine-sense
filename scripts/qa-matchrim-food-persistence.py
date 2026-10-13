"""Intercepted food-save regression; synthetic account, no remote writes or vision."""
import argparse
import base64
import json
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://127.0.0.1:4435')
parser.add_argument('--image', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--cases', help='Optional comma-separated focused cases')
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
uid = '00000000-0000-4000-8000-000000000079'
user = {'id': uid, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'synthetic@matchrim.invalid',
        'app_metadata': {'provider': 'email'}, 'user_metadata': {}, 'created_at': '2026-10-01T00:00:00Z'}
enc = lambda v: base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
token = enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': uid, 'exp': 1900000000}) + '.synthetic'
session = {'user': user, 'access_token': token, 'refresh_token': 'synthetic', 'expires_at': 1900000000,
           'expires_in': 86400, 'token_type': 'bearer'}
scan = {'mode': 'menu', 'summary': 'Synthetic', 'has_profile': True, 'dishes': [
    {'nombre': 'Dorada', 'categoria': 'Pescado', 'match': 88, 'razon': 'Synthetic', 'recomendaciones': [
        {'nombre': 'Blanco fresco', 'tipo': 'blanco', 'uvas': ['Albarino'], 'match': 90,
         'razon': 'Hipotesis de maridaje, no identidad.'}]}]}
results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for case in ['wishlist-favorite', 'favorite-first', 'failed-update-retry', 'unconfirmed-update-retry', 'pending-save', 'signout-result', 'signout-pending-scan']:
            if args.cases and case not in args.cases.split(','): continue
            context = browser.new_context(viewport={'width': 393, 'height': 852}, is_mobile=True, has_touch=True)
            context.add_init_script('''
                window.CapacitorCustomPlatform={name:'ios'};
                localStorage.setItem('sb-cbjynrbvrhcmpaojmqdp-auth-token',JSON.stringify(%s));
                localStorage.setItem('matchrim.local_profile_owner.v1',%s);
                localStorage.setItem('matchrim.onboarding.v1',JSON.stringify({version:2,result:'completed'}));
                localStorage.setItem('matchrim.scan_privacy_notice.v2','accepted');
            ''' % (json.dumps(session), json.dumps(uid)))
            writes, errors, held = [], [], []

            def intercept(route):
                req = route.request
                if urlparse(req.url).netloc == urlparse(args.url).netloc:
                    return route.continue_()
                payload, status = {}, 200
                if '/auth/v1/user' in req.url:
                    payload = user
                elif '/scan-food-pairing' in req.url:
                    if case == 'signout-pending-scan':
                        held.append((route, scan))
                        return
                    payload = scan
                elif '/rest/v1/user_wines' in req.url and req.method in ['POST', 'PATCH']:
                    body = req.post_data_json
                    query = parse_qs(urlparse(req.url).query)
                    writes.append({'method': req.method, 'body': body, 'query': query})
                    if req.method == 'POST':
                        assert body['user_id'] == uid
                        assert body['matchrim_affinity'] is None and body['sensory_attributes'] is None
                        assert body['use_for_profile_training'] is False
                        assert body['place_details']['evidence'] == 'unverified_style_suggestion'
                    else:
                        assert query.get('user_id') == ['eq.' + uid]
                        assert query.get('id') == ['eq.synthetic-row']
                    payload = {'id': 'synthetic-row'}
                    if case == 'failed-update-retry' and req.method == 'PATCH' and sum(w['method'] == 'PATCH' for w in writes) == 1:
                        status, payload = 403, {'message': 'Synthetic denied update'}
                    if case == 'unconfirmed-update-retry' and req.method == 'PATCH' and sum(w['method'] == 'PATCH' for w in writes) == 1:
                        payload = None
                    if case == 'pending-save':
                        held.append((route, payload))
                        return
                elif '/rest/v1/' in req.url:
                    payload = []
                route.fulfill(status=status, content_type='application/json', body=json.dumps(payload), headers={'Access-Control-Allow-Origin': '*'})

            context.route('**/*', intercept)
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            try:
                page.goto(args.url + '/escanear/menu-comida', wait_until='networkidle')
                page.locator('input[type=file]').first.set_input_files(str(args.image))
                if case == 'signout-pending-scan':
                    page.wait_for_timeout(400)
                    assert held, 'scan did not start'
                else:
                    page.get_by_text('Idea de vino', exact=True).wait_for()
                wish = page.get_by_role('button', name='Guardar en Quiero Probar', exact=True)
                fav = page.get_by_role('button', name='Guardar como favorito', exact=True)
                if case.startswith('signout'):
                    page.evaluate("async()=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.signOut();}")
                    page.wait_for_timeout(300)
                    for route, payload in held:
                        route.fulfill(content_type='application/json', body=json.dumps(payload))
                    held.clear()
                    page.wait_for_timeout(200)
                    assert not page.get_by_text('Idea de vino', exact=True).count(), 'old account scan survives sign-out'
                elif case == 'favorite-first':
                    fav.click()
                    page.get_by_role('button', name='Favorito', exact=True).wait_for()
                    assert page.get_by_role('button', name='En Quiero Probar', exact=True).is_disabled()
                    assert len(writes) == 1 and writes[0]['body']['is_favorite'] is True
                else:
                    wish.click()
                    if case == 'pending-save':
                        page.wait_for_timeout(100)
                        assert fav.is_disabled(), 'second mutation allowed during save'
                        assert not page.locator('[data-sonner-toast]').filter(has_text='guardado en Quiero Probar').count(), 'success before save confirmation'
                        assert page.get_by_role('button', name='Elegir otra imagen', exact=True).is_disabled()
                        for route, payload in held:
                            route.fulfill(content_type='application/json', body=json.dumps(payload))
                        held.clear()
                    page.get_by_role('button', name='En Quiero Probar', exact=True).wait_for()
                    if case != 'pending-save':
                        fav.click()
                        if case in ['failed-update-retry', 'unconfirmed-update-retry']:
                            page.get_by_text('No se pudo guardar la recomendación', exact=True).wait_for()
                            assert not page.locator('[data-sonner-toast]').filter(has_text='No se pudo guardar').count(), 'duplicate error toast and persistent alert'
                            page.wait_for_timeout(100)
                            box = page.get_by_role('alert').filter(has_text='No se pudo guardar').bounding_box()
                            assert box and box['y'] >= 0 and box['y'] + box['height'] < 700, 'save error hidden by navigation'
                            page.screenshot(path=str(args.output / (case + '-error.png')))
                            assert fav.is_enabled()
                            fav.click()
                        page.get_by_role('button', name='Favorito', exact=True).wait_for()
                    assert sum(w['method'] == 'POST' for w in writes) == 1, 'duplicate insert for one suggestion: ' + str(writes)
                    assert sum(w['method'] == 'PATCH' for w in writes) == (0 if case == 'pending-save' else 2 if case in ['failed-update-retry', 'unconfirmed-update-retry'] else 1)
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 2')
                assert not errors, errors
                page.screenshot(path=str(args.output / (case + '.png')))
                results.append({'case': case, 'passed': True, 'writes': writes, 'errors': errors})
            except Exception as error:
                page.screenshot(path=str(args.output / (case + '-failure.png')))
                results.append({'case': case, 'passed': False, 'error': str(error), 'writes': writes, 'errors': errors})
            finally:
                for route, _ in held:
                    route.abort()
                context.close()
    finally:
        browser.close()
report = {'scope': __doc__, 'remote_calls': 0, 'results': results}
(args.output / 'results.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
