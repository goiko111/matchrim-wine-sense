"""Local-only Bodega rating/training/delete QA. All non-local requests are intercepted."""
import argparse
import base64
import json
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4439')
p.add_argument('--output', type=Path, required=True)
p.add_argument('--cases', help='Comma-separated action:scenario cases')
p.add_argument('--landscape-text', action='store_true', help='Mobile landscape with enlarged CSS text, not native Dynamic Type')
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
A, B = ['00000000-0000-4000-8000-00000000008' + n for n in ['0', '1']]
def session(uid):
    enc = lambda v: base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
    return {'user': {'id': uid, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa@matchrim.invalid',
                     'app_metadata': {'provider': 'email'}, 'user_metadata': {}},
            'access_token': enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': uid, 'exp': 1900000000}) + '.' + enc('synthetic-invalid'),
            'refresh_token': 'synthetic', 'expires_at': 1900000000, 'expires_in': 86400, 'token_type': 'bearer'}
def fixture(uid, action, scenario):
    return {'id': 'wine-' + uid[-1], 'user_id': uid, 'name': 'QA ' + ('A' if uid == A else 'B'),
            'status': 'collection' if scenario.startswith('quantity-') or scenario == 'rated-collection' else 'wishlist',
            'quantity': int(scenario[-1]) if scenario.startswith('quantity-') else 2 if scenario == 'rated-collection' else 1,
            'is_favorite': False, 'rating': 'love' if action == 'training' or scenario in ['remove-rating', 'rated-collection'] else None,
            'use_for_profile_training': scenario in ['training-off', 'remove-rating'],
            'sensory_attributes': None if scenario == 'missing-attrs' else {'potencia': 3, 'acidez': 3, 'dulzura': 2, 'taninos': 2, 'afrutado': 4},
            'grape_varieties': ['UVA_' + uid[-1]], 'created_at': '2026-10-01T00:00:00Z'}

scenarios = ['ab', 'ab-error', 'aba', 'aba-error', 'logout', 'logout-error', 'unmount', 'unmount-error', 'new-operation', 'duplicate', 'retry', 'empty', 'no-match', 'wrong-id']
cases = [f'{action}:{scenario}' for action in ['rating', 'training', 'delete'] for scenario in scenarios]
cases += ['rating:wrong-state', 'training:wrong-state', 'rating:quantity-2', 'rating:quantity-1',
          'rating:missing-attrs', 'training:missing-attrs', 'rating:remove-rating', 'training:training-off',
          'rating:rated-collection', 'rating:reject', 'training:cross-action', 'delete:cancel']
results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for case in cases:
        if args.cases and case not in args.cases.split(','): continue
        action, scenario = case.split(':')
        context = browser.new_context(viewport={'width': 852, 'height': 393} if args.landscape_text else {'width': 393, 'height': 852}, is_mobile=True, has_touch=True, reduced_motion='reduce')
        seed = {'sb-cbjynrbvrhcmpaojmqdp-auth-token': json.dumps(session(A)), 'matchrim.local_profile_owner.v1': A,
                'matchrim.onboarding.v2:' + A: json.dumps({'version': 2, 'result': 'skipped'})}
        context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const [k,v] of Object.entries(%s))localStorage.setItem(k,v);" % json.dumps(seed))
        if args.landscape_text:
            context.add_init_script("document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize='21.6px';document.documentElement.style.setProperty('--matchrim-native-safe-top','20px')})")
        owner, held, requests, errors, failures, dialogs = [A], [], [], [], [], []
        rows = {uid: fixture(uid, action, scenario) for uid in [A, B]}
        def reply(route, data, status=200):
            route.fulfill(status=status, content_type='application/json', body='' if status == 204 else json.dumps(data))
        def handler(route):
            req = route.request
            url = urlparse(req.url)
            if url.netloc == urlparse(args.url).netloc: return route.continue_()
            data = {}
            if '/auth/v1/user' in url.path: data = session(owner[0])['user']
            elif '/rest/v1/user_wines' in url.path:
                q = parse_qs(url.query)
                uid = q.get('user_id', [''])[0].removeprefix('eq.')
                payload = req.post_data_json if req.method == 'PATCH' else None
                requests.append({'path': url.path, 'method': req.method, 'owner': uid, 'query': q, 'body': payload})
                if req.method in ['PATCH', 'DELETE']:
                    held.append({'route': route, 'owner': uid, 'method': req.method, 'body': payload})
                    return
                data = [rows[uid]] if rows.get(uid) else []
                if 'rating' in q and q['rating'] == ['not.is.null']: data = [w for w in data if w['rating']]
            elif '/functions/' in url.path:
                requests.append({'path': url.path, 'method': req.method})
            elif '/rest/v1/' in url.path: data = []
            return reply(route, data)
        context.route('**/*', handler)
        page = context.new_page()
        page.set_default_timeout(6000)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('dialog', lambda d: (dialogs.append(d.message), d.dismiss() if scenario == 'cancel' and len(dialogs) == 1 else d.accept()))
        def check(ok, message):
            if not ok: failures.append(message)
        def control():
            if action == 'training': return page.get_by_role('switch', name='Usar QA A para entrenar perfil', exact=True)
            if action == 'delete': return page.get_by_role('button', name='Eliminar QA A', exact=True)
            return page.get_by_role('button', name='Quitar valoración' if scenario == 'remove-rating' else 'No va' if scenario == 'reject' else 'Me encanta', exact=True)
        def switch(uid):
            owner[0] = uid
            r = page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');const r=await supabase.auth.setSession(s);return {error:r.error?.message,id:r.data.user?.id};}", session(uid))
            assert r.get('error') is None and r['id'] == uid, r
            page.get_by_role('button', name='Eliminar QA ' + ('A' if uid == A else 'B'), exact=True).wait_for()
            page.wait_for_timeout(100)
        def release(mode='success', index=0):
            item = held.pop(index)
            uid, body = item['owner'], item['body']
            if mode == 'error': reply(item['route'], {'message': 'Synthetic rejection'}, 403)
            elif mode == 'empty': reply(item['route'], None, 204)
            elif mode == 'no-match': reply(item['route'], [], 200)
            elif mode == 'wrong-id': reply(item['route'], {**(rows[uid] or {}), **(body or {}), 'id': 'unrelated-wine'})
            elif mode == 'wrong-state': reply(item['route'], rows[uid])
            else:
                result = {**(rows[uid] or {'id': 'wine-' + uid[-1]}), **(body or {})}
                rows[uid] = None if item['method'] == 'DELETE' else result
                reply(item['route'], result)
            page.wait_for_timeout(300)
        def notices(): return page.locator('[data-sonner-toast]')
        def successes(): return page.locator('[data-sonner-toast][data-type=success]')
        try:
            page.goto(args.url + '/my-wines/' + ('collection' if scenario.startswith('quantity-') or scenario == 'rated-collection' else 'wishlist'), wait_until='networkidle')
            page.get_by_role('button', name='Eliminar QA A', exact=True).wait_for()
            if action == 'training' and scenario == 'missing-attrs':
                check(not control().count(), 'invalid sensory attributes expose training switch')
                check(not held, 'invalid attributes triggered mutation')
            else:
                control().click()
                page.wait_for_timeout(100)
                if scenario == 'cancel':
                    check(not held, 'cancelled delete sent a mutation')
                    check(control().is_enabled(), 'cancelled delete left the action locked')
                    control().click()
                    page.wait_for_timeout(100)
                assert len(held) == 1, 'first action not sent'
                first_body = held[0]['body']
                check(held[0]['owner'] == A, 'mutation has wrong owner filter')
                if scenario in ['ab', 'ab-error', 'aba', 'aba-error', 'logout', 'logout-error', 'unmount', 'unmount-error', 'new-operation']:
                    if scenario in ['ab', 'ab-error', 'aba', 'aba-error', 'new-operation']:
                        switch(B)
                        if scenario in ['aba', 'aba-error', 'new-operation']: switch(A)
                    elif scenario.startswith('logout'):
                        page.evaluate("async()=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.signOut();}")
                        page.wait_for_timeout(250)
                    else:
                        page.get_by_role('navigation', name='Navegación principal').get_by_text('aiRIM', exact=True).click()
                        page.wait_for_timeout(250)
                    if scenario == 'new-operation':
                        control().click()
                        page.wait_for_timeout(100)
                        assert len(held) == 2
                    before, previous_url = len(requests), page.url
                    release('error' if scenario.endswith('error') or (action == 'delete' and scenario == 'new-operation') else 'success')
                    check(not notices().count(), 'stale response produced notification')
                    check(page.url == previous_url, 'stale response navigated the new session')
                    check(len(requests) == before, 'stale response invoked Edge or refreshed reads')
                    if scenario == 'new-operation':
                        check(control().is_disabled(), 'old completion cleared new pending state')
                        release()
                        check(successes().count() == 1, 'new operation lacks its own confirmation')
                elif scenario in ['duplicate', 'cross-action']:
                    control().dispatch_event('click')
                    if scenario == 'cross-action':
                        page.get_by_role('button', name='Me encanta', exact=True).dispatch_event('click')
                        page.get_by_role('button', name='Eliminar QA A', exact=True).dispatch_event('click')
                    page.wait_for_timeout(100)
                    check(len(held) == 1, 'repeated action caused duplicate writes')
                    check(control().is_disabled(), 'pending action not visibly disabled')
                    if action == 'delete': check(len(dialogs) == 1, 'duplicate delete confirmation prompt')
                    while held: release()
                    check(successes().count() == 1, 'confirmed operation should announce once')
                elif scenario == 'retry':
                    before = len(requests)
                    release('error')
                    check(not successes().count(), 'rejection announced success')
                    check(len(requests) == before, 'rejection triggered downstream work')
                    check(control().is_enabled(), 'rejection did not allow retry')
                    control().click()
                    page.wait_for_timeout(100)
                    assert len(held) == 1
                    release()
                    check(successes().count() == 1, 'retry did not confirm')
                elif scenario in ['empty', 'no-match', 'wrong-id', 'wrong-state']:
                    before, previous_url = len(requests), page.url
                    release(scenario)
                    check(not successes().count(), 'unconfirmed response announced success')
                    check(notices().count() == 1, 'unconfirmed response lacks visible error')
                    check(page.url == previous_url, 'unconfirmed response navigated')
                    check(len(requests) == before, 'unconfirmed response invoked Edge/refreshed reads')
                    check(control().is_enabled(), 'unconfirmed response prevents retry')
                else:
                    release()
                    check(successes().count() == 1, 'confirmed action missing success')
                    if scenario.startswith('quantity-'):
                        n = int(scenario[-1])
                        check(first_body['quantity'] == n - 1, 'rating consumption quantity changed')
                        check(first_body.get('status') == 'tasted' if n == 1 else 'status' not in first_body, 'consumption status changed')
                        check(bool(first_body.get('consumption_date')) == (n == 1), 'consumption timestamp policy changed')
                    if scenario == 'missing-attrs':
                        check('usado para afinar' not in notices().inner_text(), 'rating without attributes claims training')
                        check('Faltan atributos' in notices().inner_text(), 'missing attributes not explained')
                    if scenario == 'remove-rating':
                        check(first_body['rating'] is None and not first_body['use_for_profile_training'], 'rating removal changed')
                        check('quantity' not in first_body and 'status' not in first_body, 'rating removal altered holding/consumption')
                    if scenario == 'training-off': check(first_body == {'use_for_profile_training': False}, 'training toggle changed rating')
                    if scenario == 'rated-collection':
                        check('quantity' not in first_body and 'status' not in first_body and 'consumption_date' not in first_body, 're-rating consumed another bottle')
                    if scenario == 'reject':
                        check(first_body['rating'] == 'not_for_me' and first_body['status'] == 'tasted', 'explicit negative rating policy changed')
                        check(page.url.endswith('/my-wines/no-repetir') or page.url.endswith('/my-wines/rejected'), 'negative rating did not navigate to rejected')
            check(not errors, 'page exceptions: ' + str(errors))
            check(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), 'horizontal overflow')
            for notice in notices().all():
                box = notice.bounding_box()
                check(box is not None and box['y'] >= 0 and box['y'] + box['height'] <= page.viewport_size['height'], 'notification outside viewport')
            for label in ['Me encanta', 'Correcto', 'No va']:
                for button in page.get_by_role('button', name=label, exact=True).all():
                    check(button.evaluate('(e)=>e.scrollWidth <= e.clientWidth + 1'), 'rating button clips text: ' + label)
            page.screenshot(path=str(args.output / (case.replace(':', '-') + '.png')), full_page=True)
            results.append({'case': case, 'passed': not failures, 'failures': failures, 'requests': requests, 'pageErrors': errors})
        except Exception as error:
            page.screenshot(path=str(args.output / (case.replace(':', '-') + '-error.png')), full_page=True)
            results.append({'case': case, 'passed': False, 'error': str(error), 'failures': failures, 'requests': requests, 'pageErrors': errors})
        finally:
            for item in held: item['route'].abort()
            held.clear()
            context.close()
        print(case, 'PASS' if results[-1]['passed'] else 'FAIL', flush=True)
    browser.close()
(args.output / 'results.json').write_text(json.dumps({'scope': 'local intercepted UI only; no real writes/Edge calls/accounts', 'landscapeEnlargedText': args.landscape_text, 'results': results}, indent=2))
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
