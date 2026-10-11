"""Synthetic account/profile/catalog UI parity; no remote requests or real users."""
import argparse
import base64
import json
import re
import time
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://127.0.0.1:4434')
parser.add_argument('--image', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
user_id = '00000000-0000-4000-8000-000000000078'
user = {'id': user_id, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'synthetic@matchrim.invalid',
        'app_metadata': {'provider': 'email'}, 'user_metadata': {}, 'created_at': '2026-10-01T00:00:00Z'}
encode = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
token = encode({'alg': 'HS256', 'typ': 'JWT'}) + '.' + encode({'sub': user_id, 'exp': 1900000000, 'aud': 'authenticated'}) + '.synthetic-not-valid'
session = {'user': user, 'access_token': token, 'refresh_token': 'synthetic-only', 'expires_at': 1900000000,
           'expires_in': 86400, 'token_type': 'bearer'}
base = {'potente': 3, 'acidez': 3, 'dulce': 3, 'tanico': 3, 'afrutado': 3}
training = [{'id': f'SYN-{i}', 'rating': 'love', 'use_for_profile_training': True,
             'sensory_attributes': {'potencia': 5, 'acidez': 4, 'dulzura': 1, 'taninos': 4, 'afrutado': 5}} for i in range(15)]
results, scores, details = [], {}, {}

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for scenario in ['learned', 'training-unavailable', 'profile-unavailable', 'profile-stalled']:
            for mode in ['etiqueta', 'carta-vinos']:
                context = browser.new_context(viewport={'width': 393, 'height': 852}, is_mobile=True, has_touch=True)
                context.add_init_script('''
                  window.CapacitorCustomPlatform={name:'ios'};
                  localStorage.setItem('sb-cbjynrbvrhcmpaojmqdp-auth-token', JSON.stringify(%s));
                  localStorage.setItem('matchrim.local_profile_owner.v1', %s);
                  localStorage.setItem('matchrim_quiz_result', JSON.stringify({potente:1,acidez:1,dulce:5,tanico:1,afrutado:1}));
                  localStorage.setItem('matchrim.onboarding.v1',JSON.stringify({version:2,result:'completed'}));
                  localStorage.setItem('matchrim.scan_privacy_notice.v2','accepted');
                ''' % (json.dumps(session), json.dumps(user_id)))
                errors, profile_reads, held = [], [], []

                def intercept(route):
                    req = route.request
                    if urlparse(req.url).netloc == urlparse(args.url).netloc:
                        return route.continue_()
                    status, payload = 200, {}
                    if '/auth/v1/user' in req.url:
                        payload = user
                    elif '/rest/v1/quiz_results' in req.url or '/rest/v1/user_wines' in req.url:
                        query = parse_qs(urlparse(req.url).query)
                        profile_reads.append({'table': urlparse(req.url).path.split('/')[-1], 'owner': query.get('user_id')})
                        assert query.get('user_id') == ['eq.' + user_id], 'profile query not owner-scoped'
                        if '/quiz_results' in req.url:
                            if scenario == 'profile-stalled':
                                held.append(route)
                                return  # The client's bounded profile load must abort this unresolved request.
                            status, payload = (503, {'message': 'SYN unavailable'}) if scenario == 'profile-unavailable' else (200, base)
                        else:
                            status, payload = (503, {'message': 'SYN unavailable'}) if scenario == 'training-unavailable' else (200, training)
                    elif '/rest/v1/' in req.url:
                        payload = []
                    elif '/detect-wine-regions' in req.url:
                        payload = {'regions': [{'box': {'x': 10, 'y': 10, 'width': 60, 'height': 70}, 'confidence': .95,
                            'quality': {'glare': 'low', 'occlusion': 'low', 'legibility': 'good'}}],
                            'coverage': {'status': 'reported_complete', 'estimated_visible_objects': 1}}
                    elif '/analyze-wine-region' in req.url:
                        payload = {'candidates': [{'name': 'Mamba', 'producer': 'La Quinta', 'confidence': .95,
                                                  'evidence': ['Mamba', 'La Quinta'], 'uncertainty_reasons': []}]}
                    elif '/scan-wine-menu' in req.url:
                        payload = {'has_profile': True, 'layout': 'rows', 'coverage': {'status': 'reported_complete', 'estimated_visible_wines': 1},
                                   'vinos': [{'nombre': 'Mamba', 'productor': 'La Quinta', 'confidence': .99,
                                              'texto_fuente': 'Mamba La Quinta 20 EUR', 'dudas': [], 'campos_inferidos': [],
                                              'precio': 20, 'moneda': 'EUR', 'posicion': {'x': 20, 'y': 20, 'confidence': .99}}]}
                    elif '/search-wines' in req.url:
                        payload = {'wines': [{'id': 'SYN-catalog', 'name': 'La Quinta Mamba', 'producer': 'La Quinta',
                                              'tasting_attributes': {'power': 5, 'acidity': 4, 'sweetness': 1, 'tannin': 4, 'fruity': 5}}]}
                    route.fulfill(status=status, content_type='application/json', body=json.dumps(payload), headers={'Access-Control-Allow-Origin': '*'})

                context.route('**/*', intercept)
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                try:
                    page.goto(args.url + '/escanear/' + mode, wait_until='networkidle')
                    started = time.monotonic()
                    page.locator('input[type=file]').nth(1 if mode == 'etiqueta' else 0).set_input_files(str(args.image))
                    if mode == 'etiqueta':
                        page.get_by_text('Lote listo para revisar', exact=True).wait_for(timeout=30000)
                        page.get_by_role('tab', name='Vinos', exact=False).click()
                        score = page.get_by_test_id('scan-affinity-value').inner_text()
                    else:
                        page.get_by_text('Vinos Detectados (1)', exact=True).wait_for(timeout=30000)
                        row = page.get_by_role('button', name=re.compile(r'^Abrir vino 1:'))
                        text = row.inner_text()
                        match = re.search(r'(\d+)%', text)
                        score = match.group(0) if match else '-'
                    note = page.get_by_test_id('scan-profile-source')
                    note.wait_for()
                    if scenario == 'learned':
                        assert '15 valoraciones' in note.inner_text(), note.inner_text()
                        assert '%' in score, score
                    elif scenario == 'training-unavailable':
                        assert 'no se pudieron cargar' in note.inner_text(), note.inner_text()
                        assert '%' in score, score
                    else:
                        assert 'no disponible' in note.inner_text(), note.inner_text()
                        assert score == '-', score
                    scores[(scenario, mode)] = score
                    elapsed = time.monotonic() - started
                    if scenario == 'profile-stalled':
                        assert 4.5 <= elapsed < 8, elapsed
                    note.scroll_into_view_if_needed()
                    page.screenshot(path=str(args.output / f'{scenario}-{mode}.png'), animations='disabled')
                    if scenario == 'learned':
                        if mode == 'etiqueta':
                            page.get_by_role('button', name='Abrir detalle de La Quinta Mamba', exact=True).click()
                        else:
                            page.get_by_role('button', name=re.compile(r'^Abrir vino 1:')).click()
                        dimension = page.locator('.affinity-dimension-row:visible').first
                        dimension.wait_for()
                        dimension.scroll_into_view_if_needed()
                        details[mode] = page.locator('.affinity-dimension-row:visible').all_inner_texts()
                        assert 'Tu perfil 1.0' not in details[mode][0], 'stale cached quiz used for explanation'
                        page.get_by_role('button', name='La lectura de potencia acertó', exact=True).filter(visible=True).click()
                        keys = page.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('matchrim.affinity_feedback.'))")
                        assert keys and all(user_id + ':' in key for key in keys), keys
                        page.screenshot(path=str(args.output / f'{scenario}-{mode}-detail.png'), animations='disabled')
                        page.set_viewport_size({'width': 852, 'height': 393})
                        page.evaluate("document.documentElement.style.fontSize = '21.6px'")
                        dimension.scroll_into_view_if_needed()
                        assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2')
                        page.screenshot(path=str(args.output / f'{scenario}-{mode}-landscape-text135.png'), animations='disabled')
                    assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2')
                    assert not errors, errors
                    # Exercise the local Auth API transition; not a physical sign-out gesture.
                    page.evaluate("async () => {const {supabase}=await import('/src/integrations/supabase/client.ts'); await supabase.auth.signOut();}")
                    page.wait_for_timeout(250)
                    assert not page.get_by_test_id('scan-profile-source').count(), 'old scan survives sign-out'
                    assert not page.locator('button[aria-label^="Abrir vino"]').count()
                    assert not page.evaluate("Object.keys(localStorage).some(k=>k.startsWith('matchrim.affinity_feedback.'))")
                    results.append({'scenario': scenario, 'mode': mode, 'passed': True, 'score': score, 'elapsed_seconds': round(elapsed, 2), 'profile_reads': profile_reads, 'errors': errors})
                except Exception as error:
                    page.screenshot(path=str(args.output / f'{scenario}-{mode}-failure.png'), full_page=True)
                    results.append({'scenario': scenario, 'mode': mode, 'passed': False, 'error': str(error), 'profile_reads': profile_reads, 'errors': errors})
                finally:
                    for route in held:
                        route.abort()
                    context.close()
    finally:
        browser.close()
parity = all(scores.get((s, 'etiqueta')) == scores.get((s, 'carta-vinos')) for s in ['learned', 'training-unavailable', 'profile-unavailable', 'profile-stalled'])
detail_parity = bool(details.get('etiqueta')) and details.get('etiqueta') == details.get('carta-vinos')
report = {'scope': __doc__, 'remote_calls': 0, 'scanner_parity': parity, 'detail_parity': detail_parity, 'details': details, 'results': results}
(args.output / 'results.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
raise SystemExit(0 if parity and detail_parity and all(r['passed'] for r in results) else 1)
