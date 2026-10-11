"""Focused local first-use and notice QA; synthetic accounts, all remote traffic intercepted."""
import argparse
import base64
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4437')
p.add_argument('--output', type=Path, required=True)
p.add_argument('--cases', help='Optional comma-separated focused cases')
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
A = '00000000-0000-4000-8000-000000000080'
B = '00000000-0000-4000-8000-000000000081'
def session(uid):
    user = {'id': uid, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'local@matchrim.invalid',
            'app_metadata': {'provider': 'email'}, 'user_metadata': {}}
    enc = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
    token = enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': uid, 'exp': 1900000000}) + '.' + enc('synthetic-signature-not-valid')
    return {'user': user, 'access_token': token, 'refresh_token': 'synthetic', 'expires_at': 1900000000, 'expires_in': 86400, 'token_type': 'bearer'}

results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    cases = ['new-auth', 'new-anonymous', 'returning-quiz', 'returning-wines', 'legacy-corrupt', 'other-owner-completed',
             'own-skipped', 'scoped-corrupt', 'future-version', 'old-scoped-skip', 'anon-to-account', 'account-switch', 'logout',
             'guide-flow', 'guide-bottles', 'guide-airim', 'guide-profile', 'guide-keyboard',
             'guide-landscape-text', 'guide-portrait-text', 'scan-notice', 'bodega-rejected-notice',
             'bodega-timeout-retry', 'bodega-logout-pending', 'notice-logout']
    for case in cases:
        if args.cases and case not in args.cases.split(','): continue
        uid = None if case in ['new-anonymous', 'legacy-corrupt', 'scan-notice', 'anon-to-account'] else A
        active_uid = [uid]
        context = browser.new_context(viewport={'width': 393, 'height': 852}, is_mobile=True, has_touch=True, reduced_motion='reduce')
        seed = {'matchrim.scan_privacy_notice.v2': 'accepted', 'matchrim.local_profile_owner.v1': uid or 'anonymous'}
        if uid: seed['sb-cbjynrbvrhcmpaojmqdp-auth-token'] = json.dumps(session(uid))
        if case == 'legacy-corrupt': seed['matchrim.onboarding.v1'] = '{'
        if case == 'other-owner-completed': seed['matchrim.onboarding.v2:' + B] = json.dumps({'version': 2, 'result': 'completed'})
        if case == 'own-skipped': seed['matchrim.onboarding.v2:' + A] = json.dumps({'version': 2, 'result': 'skipped'})
        if case == 'scoped-corrupt': seed['matchrim.onboarding.v2:' + A] = '{'
        if case == 'future-version': seed['matchrim.onboarding.v2:' + A] = json.dumps({'version': 99, 'result': 'completed'})
        if case == 'old-scoped-skip': seed['matchrim.onboarding.v2:' + A] = json.dumps({'version': 1, 'result': 'skipped'})
        context.add_init_script('''
          window.CapacitorCustomPlatform={name:'ios'};
          if (!sessionStorage.getItem('qa-seeded')) {
            for (const [k,v] of Object.entries(%s)) localStorage.setItem(k,v);
            sessionStorage.setItem('qa-seeded','yes');
          }
        ''' % json.dumps(seed))
        errors, requests, held = [], [], []
        allow_wines = [False]
        favorite_attempts = [0]
        def route_handler(route):
            req = route.request
            if urlparse(req.url).netloc == urlparse(args.url).netloc:
                return route.continue_()
            requests.append({'path': urlparse(req.url).path, 'method': req.method})
            data, status = {}, 200
            if '/auth/v1/user' in req.url: data = session(active_uid[0] or A)['user']
            elif '/rest/v1/quiz_results' in req.url:
                data = {'potente': 3, 'acidez': 3, 'dulce': 3, 'tanico': 3, 'afrutado': 3} if case == 'returning-quiz' else None
            elif '/rest/v1/user_wines' in req.url:
                data = []
                if case == 'returning-wines': data = [{'id': 'synthetic-wine', 'name': 'QA Blanco', 'rating': None}]
                if case == 'bodega-rejected-notice' and 'select=*' in req.url:
                    data = [{'id': 'synthetic-wine', 'user_id': A, 'name': 'QA Blanco', 'status': 'wishlist', 'is_favorite': favorite_attempts[0] > 1,
                             'rating': None, 'sensory_attributes': None, 'matchrim_affinity': None, 'created_at': '2026-10-01T00:00:00Z'}]
                if case == 'bodega-rejected-notice' and req.method == 'PATCH':
                    favorite_attempts[0] += 1
                    status, data = (403, {'message': 'Synthetic rejection'}) if favorite_attempts[0] == 1 else (200, {'id': 'synthetic-wine'})
                if case in ['bodega-timeout-retry', 'bodega-logout-pending'] and 'select=*' in req.url and not allow_wines[0]:
                    held.append(route)
                    return
            elif '/rest/v1/' in req.url: data = []
            elif '/functions/' in req.url: data = {'wines': []}
            route.fulfill(status=status, content_type='application/json', body=json.dumps(data))
        context.route('**/*', route_handler)
        page = context.new_page()
        page.set_default_timeout(7000)
        page.on('pageerror', lambda e: errors.append(str(e)))
        try:
            route = '/escanear/menu-comida' if case in ['scan-notice', 'notice-logout'] else '/my-wines/wishlist' if case.startswith('bodega-') else '/'
            page.goto(args.url + route, wait_until='domcontentloaded' if 'pending' in case or 'timeout' in case else 'networkidle')
            page.wait_for_timeout(300)
            dialog = page.get_by_role('dialog')
            if case in ['new-auth', 'new-anonymous', 'legacy-corrupt', 'other-owner-completed', 'scoped-corrupt', 'future-version']:
                assert dialog.count() == 1, 'eligible first use omitted guide'
            elif case in ['returning-quiz', 'returning-wines', 'own-skipped', 'old-scoped-skip']:
                assert dialog.count() == 0, 'returning or skipped owner interrupted'
                assert page.get_by_role('button', name='Ayuda: abrir guía de Matchrim').is_visible()
            elif case in ['anon-to-account', 'account-switch', 'logout']:
                page.get_by_role('button', name='Saltar guía', exact=True).click()
                dialog.wait_for(state='hidden')
                if case == 'logout':
                    active_uid[0] = None
                    page.evaluate("async()=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.signOut();}")
                else:
                    active_uid[0] = A if case == 'anon-to-account' else B
                    auth_result = page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');const r=await supabase.auth.setSession(s);return {error:r.error?.message,user:r.data.user?.id};}", session(active_uid[0]))
                    assert auth_result['error'] is None and auth_result['user'] == active_uid[0], auth_result
                page.get_by_role('button', name='Saltar guía', exact=True).wait_for()
                assert '1 de 6' in dialog.inner_text()
                page.get_by_role('button', name='Saltar guía', exact=True).click()
                dialog.wait_for(state='hidden')
                if case == 'account-switch':
                    active_uid[0] = A
                    page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s);}", session(A))
                    page.wait_for_timeout(300)
                    assert not dialog.count(), 'own skip lost on return'
            elif case == 'guide-keyboard':
                page.get_by_role('button', name='Saltar guía', exact=True).wait_for()
                for _ in range(12):
                    page.keyboard.press('Tab')
                    assert page.evaluate("Boolean(document.activeElement.closest('[role=dialog]'))"), 'focus escaped guide'
                page.keyboard.press('Escape')
                dialog.wait_for(state='hidden')
                assert not dialog.count()
                assert page.get_by_role('button', name='Ayuda: abrir guía de Matchrim').evaluate('(e)=>e===document.activeElement'), 'focus not returned to Help'
            elif case.startswith('guide-'):
                if not dialog.count(): page.get_by_role('button', name='Ayuda: abrir guía de Matchrim').click()
                page.get_by_role('button', name='Saltar guía', exact=True).click()
                page.reload(wait_until='networkidle')
                assert not dialog.count(), 'skip not retained'
                page.get_by_role('button', name='Ayuda: abrir guía de Matchrim').click()
                target_label = 'Un plato u ocasión' if case == 'guide-airim' else 'Botellas' if case in ['guide-bottles', 'guide-profile'] else 'Carta o pizarra'
                page.get_by_role('radio', name=target_label, exact=True).check()
                if case in ['guide-landscape-text', 'guide-portrait-text']:
                    page.set_viewport_size({'width': 852, 'height': 393} if case == 'guide-landscape-text' else {'width': 393, 'height': 852})
                    page.evaluate("document.documentElement.style.fontSize='21.6px';document.documentElement.style.setProperty('--matchrim-native-safe-top','20px');document.documentElement.style.setProperty('--matchrim-native-safe-bottom','20px')")
                    page.wait_for_timeout(250)
                for step in range(6):
                    assert f'{step+1} de 6' in dialog.inner_text()
                    if step == 1:
                        assert '12' in dialog.inner_text() and 'aplazad' in dialog.inner_text()
                        page.get_by_label('Nombre de la etiqueta 1').fill('QA ejemplo no persistente')
                        page.get_by_role('button', name='Confirmar ejemplo', exact=True).click()
                    if step == 3: assert 'confirm' in dialog.inner_text().lower()
                    if step == 4: assert 'comida' in dialog.inner_text().lower()
                    assert dialog.evaluate('(e)=>e.scrollWidth<=e.clientWidth+2'), 'dialog horizontal overflow'
                    motion = dialog.evaluate("e=>({animation:getComputedStyle(e).animationName,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches})")
                    assert motion['animation'] == 'none' and motion['reduced'], 'reduced-motion guide animates: ' + str(motion)
                    box = dialog.bounding_box()
                    assert box and box['y'] >= 0 and box['y'] + box['height'] <= page.viewport_size['height'], str({'box': box, 'style': dialog.evaluate("e=>({height:getComputedStyle(e).height,maxHeight:getComputedStyle(e).maxHeight,display:getComputedStyle(e).display,innerHeight,visual:visualViewport.height,safe:getComputedStyle(document.documentElement).getPropertyValue('--matchrim-safe-top'),landscape:matchMedia('(orientation:landscape) and (max-height:600px)').matches})")})
                    page.screenshot(path=str(args.output / f'{case}-step-{step+1}.png'))
                    page.get_by_role('button', name='Crear mi perfil primero' if step == 5 and case == 'guide-profile' else 'Empezar' if step == 5 else 'Continuar', exact=True).click()
                expected = '/matchrim' if case == 'guide-profile' else '/inteligencia-liquida' if case == 'guide-airim' else '/escanear/etiqueta' if case == 'guide-bottles' else '/escanear/carta-vinos'
                page.wait_for_url('**' + expected)
                assert not any(r['method'] in ['POST', 'PATCH'] and '/rest/v1/user_wines' in r['path'] for r in requests)
                assert not any('/functions/' in r['path'] for r in requests), 'guide called analysis'
                assert not page.evaluate("localStorage.getItem('matchrim_quiz_result')")
            elif case in ['scan-notice', 'notice-logout']:
                page.locator('input[type=file]').first.set_input_files({'name': 'invalid.txt', 'mimeType': 'text/plain', 'buffer': b'not-an-image'})
                page.wait_for_timeout(300)
                notice = page.locator('[data-sonner-toast]').filter(has_text='Selecciona una imagen o PDF válido')
                assert notice.count() == 1, 'important scan validation is invisible'
                box = notice.bounding_box()
                assert box and box['y'] >= 0 and box['y'] + box['height'] < 700
                if case == 'notice-logout':
                    page.evaluate("async()=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.signOut();}")
                    page.wait_for_timeout(500)
                    assert not page.locator('[data-sonner-toast]').count(), 'old account notice survives logout'
                else:
                    page.set_viewport_size({'width': 852, 'height': 393})
                    page.evaluate("document.documentElement.style.fontSize='21.6px';document.documentElement.style.setProperty('--matchrim-native-safe-top','20px')")
                    page.screenshot(path=str(args.output / 'notice-landscape-text.png'))
                    box = notice.bounding_box()
                    assert box and box['y'] >= 20 and box['y'] + box['height'] < 300
            elif case == 'bodega-logout-pending':
                page.wait_for_timeout(300)
                assert held
                page.evaluate("async()=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.signOut();}")
                for r in held: r.fulfill(status=403, content_type='application/json', body='{"message":"late prior account failure"}')
                held.clear()
                page.wait_for_timeout(500)
                assert not page.locator('[data-sonner-toast]').count(), 'late prior account failure leaked'
            elif case == 'bodega-timeout-retry':
                page.get_by_role('button', name='Reintentar', exact=True).wait_for(timeout=14000)
                assert held, 'timeout request was not held'
                assert page.get_by_role('alert').filter(has_text='No hemos podido cargar tus vinos').count() == 1
                assert not page.locator('[data-sonner-toast]').count(), 'duplicate load error toast plus persistent alert'
                box = page.get_by_role('alert').filter(has_text='No hemos podido cargar tus vinos').bounding_box()
                nav_box = page.get_by_role('navigation', name='Navegación principal').bounding_box()
                assert box and nav_box and box['y'] >= 0 and box['y'] + box['height'] <= nav_box['y'], 'retry alert obscured by mobile navigation'
                page.screenshot(path=str(args.output / 'bodega-timeout-error.png'))
                allow_wines[0] = True
                page.get_by_role('button', name='Reintentar', exact=True).click()
                page.wait_for_timeout(300)
                assert not page.get_by_role('button', name='Reintentar', exact=True).count()
            else:
                page.get_by_role('button', name='Guardar QA Blanco en favoritos', exact=True).click()
                page.wait_for_timeout(300)
                notice = page.locator('[data-sonner-toast]').filter(has_text='Error al actualizar favorito')
                assert notice.count() == 1, 'important bodega rejection is invisible'
                page.screenshot(path=str(args.output / 'bodega-rejected-error.png'))
                notice.locator('[data-close-button]').click()
                page.get_by_role('button', name='Guardar QA Blanco en favoritos', exact=True).click()
                page.get_by_role('button', name='Quitar QA Blanco de favoritos', exact=True).wait_for()
                assert favorite_attempts[0] == 2
            assert not errors, errors
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 2')
            page.screenshot(path=str(args.output / f'{case}.png'))
            results.append({'case': case, 'passed': True, 'requests': requests})
        except Exception as error:
            page.screenshot(path=str(args.output / f'{case}-failure.png'))
            results.append({'case': case, 'passed': False, 'error': str(error), 'requests': requests, 'page_errors': errors})
        finally:
            for r in held: r.abort()
            context.close()
    browser.close()
report = {'scope': __doc__, 'remote_application_calls': 0, 'results': results}
(args.output / 'results.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
