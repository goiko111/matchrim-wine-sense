"""Local Bodega response ordering; synthetic sessions and intercepted remote traffic only."""
import argparse
import base64
import json
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4438')
p.add_argument('--output', type=Path, required=True)
p.add_argument('--cases')
p.add_argument('--ignore-read-abort', action='store_true', help='Model an already-in-flight response whose transport ignores cancellation')
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
A, B = ['00000000-0000-4000-8000-00000000008' + n for n in ['0', '1']]

def session(uid):
    enc = lambda v: base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
    return {'user': {'id': uid, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'local@matchrim.invalid',
                     'app_metadata': {'provider': 'email'}, 'user_metadata': {}},
            'access_token': enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': uid, 'exp': 1900000000}) + '.' + enc('synthetic-invalid'),
            'refresh_token': 'synthetic', 'expires_at': 1900000000, 'expires_in': 86400, 'token_type': 'bearer'}

def wine(uid):
    return {'id': 'wine-' + uid[-1], 'user_id': uid, 'name': 'QA cuenta ' + ('A' if uid == A else 'B'),
            'status': 'wishlist', 'is_favorite': False, 'rating': 'love', 'use_for_profile_training': True,
            'sensory_attributes': {'potencia': 3, 'acidez': 3, 'dulzura': 2, 'taninos': 2, 'afrutado': 4},
            'grape_varieties': ['UVA_A_ANTIGUA' if uid == A else 'UVA_B_ACTUAL'], 'created_at': '2026-10-01T00:00:00Z'}

cases = ['late-counts', 'late-learning', 'loaded-owner-to-slow', 'loaded-owner-to-error',
         'same-owner-counts', 'same-owner-learning', 'favorite-return-success', 'favorite-return-error',
         'favorite-unmount', 'favorite-logout', 'favorite-double-click', 'favorite-return-retry',
         'reads-logout', 'reads-unmount', 'late-reads-to-error']
results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for case in cases:
        if args.cases and case not in args.cases.split(','): continue
        context = browser.new_context(viewport={'width': 393, 'height': 852}, is_mobile=True, has_touch=True, reduced_motion='reduce')
        seed = {'sb-cbjynrbvrhcmpaojmqdp-auth-token': json.dumps(session(A)), 'matchrim.local_profile_owner.v1': A,
                'matchrim.onboarding.v2:' + A: json.dumps({'version': 2, 'result': 'skipped'})}
        context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const [k,v] of Object.entries(%s))localStorage.setItem(k,v);" % json.dumps(seed))
        if args.ignore_read_abort:
            context.add_init_script("""
              const fetchWithSignal = window.fetch.bind(window);
              window.fetch = (input, init) => {
                const url = typeof input === 'string' ? input : input.url;
                if (url?.includes('/rest/v1/user_wines') && (!init?.method || init.method === 'GET')) {
                  return fetchWithSignal(input, {...init, signal: undefined});
                }
                return fetchWithSignal(input, init);
              };
            """)
        owner, held, requests, errors, failures = [A], [], [], [], []
        read_counts = {}
        hold_kind = 'counts' if case in ['late-counts', 'same-owner-counts'] else 'learning' if case in ['late-learning', 'same-owner-learning'] else None
        def reply(route, data, status=200):
            route.fulfill(status=status, content_type='application/json', body=json.dumps(data))
        def handler(route):
            req = route.request
            url = urlparse(req.url)
            if url.netloc == urlparse(args.url).netloc: return route.continue_()
            data = {}
            if '/auth/v1/user' in url.path: data = session(owner[0])['user']
            elif '/rest/v1/user_wines' in url.path:
                q = parse_qs(url.query)
                uid = q.get('user_id', [''])[0].removeprefix('eq.')
                select = q.get('select', [''])[0]
                kind = 'main' if select == '*' else 'counts' if select == 'id,status,rating,is_favorite' else 'learning' if 'sensory_attributes' in select else 'other'
                requests.append({'method': req.method, 'owner': uid, 'kind': kind})
                if req.method == 'PATCH':
                    if case.startswith('favorite-'):
                        held.append((route, {'id': 'wine-0'}, 'favorite'))
                        return
                    return reply(route, {'id': 'wine-0'})
                key = (uid, kind)
                read_counts[key] = read_counts.get(key, 0) + 1
                data = [wine(uid)] if uid in [A, B] else []
                if kind == 'counts': data = [wine(uid)] * (7 if uid == A else 2)
                if kind == hold_kind and uid == A and read_counts[key] == 1:
                    held.append((route, data, kind))
                    return
                if case in ['reads-logout', 'reads-unmount', 'late-reads-to-error'] and uid == A and kind in ['counts', 'learning']:
                    held.append((route, data, kind))
                    return
                if case == 'late-reads-to-error' and uid == B:
                    return reply(route, {'message': 'Synthetic account B failure'}, 403)
                if case.startswith('loaded-owner-to-') and uid == B:
                    if case.endswith('slow'):
                        held.append((route, data, kind))
                        return
                    return reply(route, {'message': 'Synthetic account B failure'}, 403)
                if case == 'same-owner-counts' and kind == 'counts' and read_counts[key] > 1: data = [wine(uid)] * 2
                if case == 'same-owner-learning' and kind == 'learning' and read_counts[key] > 1:
                    data = [{**wine(uid), 'grape_varieties': ['UVA_A_NUEVA']}]
            elif '/rest/v1/' in url.path: data = []
            return reply(route, data)
        context.route('**/*', handler)
        page = context.new_page()
        page.set_default_timeout(7000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        def check(value, message):
            if not value: failures.append(message)
        def switch(uid):
            owner[0] = uid
            result = page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');const r=await supabase.auth.setSession(s);return {error:r.error?.message,id:r.data.user?.id};}", session(uid))
            assert result.get('error') is None and result['id'] == uid, result
            page.wait_for_timeout(350)
        def release(status=200):
            for route, data, kind in list(held):
                reply(route, data if status == 200 else {'message': 'Synthetic stale failure'}, status)
            held.clear()
            page.wait_for_timeout(400)
        def counter():
            return page.get_by_role('button', name=re.compile(r'^Quiero Probar Pendientes')).inner_text().strip().splitlines()[-1]
        def learning_text():
            return page.get_by_text('Así aprende tu Matchrim', exact=True).locator('xpath=../..').inner_text()
        def leave():
            page.get_by_role('navigation', name='Navegación principal').get_by_text('aiRIM', exact=True).click()
            page.wait_for_timeout(300)
        try:
            page.goto(args.url + '/my-wines/wishlist', wait_until='domcontentloaded')
            page.get_by_role('button', name='Guardar QA cuenta A en favoritos', exact=True).wait_for()
            page.wait_for_timeout(300)
            if case in ['reads-logout', 'reads-unmount', 'late-reads-to-error']:
                assert len(held) == 2
                if case == 'reads-logout':
                    page.evaluate("async()=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.signOut();}")
                    page.wait_for_timeout(300)
                elif case == 'reads-unmount': leave()
                else: switch(B)
                before = len(requests)
                release()
                check('UVA_A_ANTIGUA' not in page.inner_text('body'), 'stale learning visible after leaving account')
                check(len(requests) == before, 'stale read triggered extra requests')
                if case == 'late-reads-to-error': check(counter() == '0', 'stale count visible after B error')
                check(not page.locator('[data-sonner-toast]').count(), 'stale reads produced notice')
            elif case.startswith('late-'):
                assert held
                switch(B)
                page.get_by_role('button', name='Guardar QA cuenta B en favoritos', exact=True).wait_for()
                release()
                check(counter() == '2', 'stale A count replaced B count: ' + counter())
                check('UVA_A_ANTIGUA' not in page.inner_text('body'), 'stale A learning visible in B')
                check('UVA_B_ACTUAL' in page.inner_text('body'), 'B learning missing')
            elif case.startswith('loaded-owner-to-'):
                assert counter() == '7'
                assert 'UVA_A_ANTIGUA' in page.inner_text('body')
                switch(B)
                if page.get_by_role('button', name=re.compile(r'^Quiero Probar Pendientes')).count():
                    check(counter() == '0', 'A counters retained while B loading/failed: ' + counter())
                check('UVA_A_ANTIGUA' not in page.inner_text('body'), 'A learning retained while B loading/failed')
                check(not page.get_by_role('button', name='Guardar QA cuenta A en favoritos', exact=True).count(), 'A list retained')
            elif case == 'same-owner-counts':
                page.get_by_role('button', name=re.compile(r'^Favoritos Marcados')).click()
                page.wait_for_timeout(400)
                assert counter() == '2'
                release()
                check(counter() == '2', 'older count replaced same-owner fresh result: ' + counter())
            elif case == 'same-owner-learning':
                page.get_by_role('switch', name='Usar QA cuenta A para entrenar perfil').click()
                page.get_by_text('UVA_A_NUEVA', exact=True).wait_for()
                release()
                check('UVA_A_NUEVA' in learning_text(), 'older learning replaced fresh learning')
                check('UVA_A_ANTIGUA' not in learning_text(), 'old learning restored')
            elif case.startswith('favorite-'):
                button = page.get_by_role('button', name='Guardar QA cuenta A en favoritos', exact=True)
                button.click()
                page.wait_for_timeout(150)
                assert len(held) == 1
                if case == 'favorite-double-click':
                    button.dispatch_event('click')
                    page.wait_for_timeout(150)
                    check(len(held) == 1, 'duplicate in-flight favorite writes: ' + str(len(held)))
                    release()
                    check(page.locator('[data-sonner-toast]').count() == 1, 'favorite should confirm once')
                else:
                    if case.startswith('favorite-return-'):
                        switch(B)
                        switch(A)
                        page.get_by_role('button', name='Guardar QA cuenta A en favoritos', exact=True).wait_for()
                    elif case == 'favorite-logout':
                        page.evaluate("async()=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.signOut();}")
                        page.wait_for_timeout(300)
                    else:
                        leave()
                    if case == 'favorite-return-retry':
                        page.get_by_role('button', name='Guardar QA cuenta A en favoritos', exact=True).click()
                        page.wait_for_timeout(150)
                        assert len(held) == 2
                        old_route, old_data, _ = held.pop(0)
                        before = len(requests)
                        reply(old_route, old_data)
                        page.wait_for_timeout(300)
                        check(not page.locator('[data-sonner-toast]').count(), 'old operation certified the retry')
                        check(len(requests) == before, 'old operation refreshed during retry')
                        check(page.get_by_role('button', name='Guardar QA cuenta A en favoritos', exact=True).is_disabled(), 'old response cleared new pending state')
                        release()
                        check(page.locator('[data-sonner-toast]').count() == 1, 'new response did not confirm its own operation')
                        check(not errors, 'page errors: ' + str(errors))
                        page.screenshot(path=str(args.output / (case + '.png')), full_page=True)
                        results.append({'case': case, 'passed': not failures, 'failures': failures, 'requests': requests, 'pageErrors': errors})
                        print(case, 'PASS' if not failures else 'FAIL', flush=True)
                        continue
                    before = len(requests)
                    release(403 if case.endswith('error') else 200)
                    check(not page.locator('[data-sonner-toast]').count(), 'stale favorite response produced notice')
                    check(len(requests) == before, 'stale favorite response triggered refresh')
            check(not errors, 'page errors: ' + str(errors))
            page.screenshot(path=str(args.output / (case + '.png')), full_page=True)
            results.append({'case': case, 'passed': not failures, 'failures': failures, 'requests': requests, 'pageErrors': errors})
        except Exception as error:
            page.screenshot(path=str(args.output / (case + '-error.png')), full_page=True)
            results.append({'case': case, 'passed': False, 'error': str(error), 'failures': failures, 'requests': requests, 'pageErrors': errors})
        finally:
            for route, _, _ in held: route.abort()
            held.clear()
            context.close()
        print(case, 'PASS' if results[-1]['passed'] else 'FAIL', flush=True)
    browser.close()
(args.output / 'results.json').write_text(json.dumps({'scope': 'local intercepted UI, not real accounts/server writes', 'ignoreReadAbort': args.ignore_read_abort, 'results': results}, indent=2))
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
