"""Consumer95 rendered-UI QA. Run only against the explicitly frozen local build.

All browser HTTP is either fulfilled from a hashed build/in-memory transport or
aborted. WebSockets never connect to a server. No existing browser profile is used.
Evidence is private and append-only by run directory; no canonical QA outputs.
"""

import argparse
import base64
import faulthandler
import hashlib
import json
import math
import mimetypes
import os
import re
import time
import traceback
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse
from urllib.request import HTTPRedirectHandler, ProxyHandler, build_opener

from playwright.sync_api import TimeoutError as PlaywrightTimeout, expect, sync_playwright


REPO = Path('/Users/GOIKO/2matchrim76-recognition-20261008')
TASK = Path('/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8')
EVIDENCE = TASK / 'artifacts/matchrim95-eight-hours-20261017/journeys'
PROFILES = TASK / 'artifacts/matchrim95-eight-hours-20261017/personas/synthetic-profiles.json'
BUILD = Path('/private/tmp/matchrim95-ui-iteration4')
BUILD_PORTS = {
    '/private/tmp/matchrim95-ui-iteration4': 4595,
    '/private/tmp/Matchrim95-consumer-r1/web': 4598,
    '/private/tmp/matchrim95-ui-iteration13': 4601,
    '/private/tmp/matchrim95-ui-iteration16': 4601,
    '/private/tmp/matchrim95-ui-iteration17': 4601,
    '/private/tmp/matchrim95-ui-iteration20': 4601,
    '/private/tmp/Matchrim95-consumer-r4/web': 4601,
}
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
BACKEND = 'cbjynrbvrhcmpaojmqdp.supabase.co'
AUTH_KEY = 'sb-cbjynrbvrhcmpaojmqdp-auth-token'
AXES = ('potente', 'acidez', 'dulce', 'tanico', 'afrutado')
# Frozen oracle, deliberately not imported or extracted from app source at runtime.
QUIZ_WEIGHTS = (
    (0, 2, 0, 0, 1), (2, 0, 0, 2, 0), (2, 0, 0, 2, 0), (0, 0, 2, 0, 2),
    (2, 0, 0, 2, 0), (2, 1, 0, 2, 0), (0, 2, 0, 0, 0), (2, 0, 0, 2, 0),
    (0, 0, 2, 0, 2), (1, 0, 1, 1, 1), (2, 0, 0, 2, 0), (1, 0, 1, 1, 0),
    (1, 0, 2, 1, 0), (1, 0, 2, 1, 0), (0, 1, 0, 0, 1), (0, 0, 2, 0, 2),
    (0, 2, 0, 0, 0), (0, 2, 0, 0, 0), (2, 0, 0, 1, 0), (0, 2, 2, 0, 1),
)
QUIZ_PROMPTS = (
    'manzana verde', 'cayena', 'trufas', 'pimiento rojo asado', 'olor a cuero',
    'queso azul', 'pepinillos en vinagre', 'berenjenas asadas', 'd\u00e1tiles',
    'an\u00eds estrellado', 'caf\u00e9 sin az\u00facar', 'avellanas tostadas', 'vainilla',
    'caf\u00e9 con leche y az\u00facar', 'hierbabuena', 'mango', 'marisco',
    'encurtidos', 'curry', 'caramelos de lim\u00f3n',
)
RADIOS = {'si': 'Me gusta', 'no': 'No me gusta', 'indiferente': 'Me da igual'}
FIXED_TIME = '2026-10-17T08:00:00Z'
PASSWORD = 'Synthetic-only-not-real-95!'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def save_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=True) + '\n')


def oracle(answers):
    assert set(answers) == {str(i) for i in range(1, 21)}
    multipliers = {'si': 1, 'indiferente': .5, 'no': 0}
    return {axis: math.floor(5 * sum(row[j] * multipliers[answers[str(i + 1)]]
                                   for i, row in enumerate(QUIZ_WEIGHTS)) /
                            sum(row[j] for row in QUIZ_WEIGHTS) + .5)
            for j, axis in enumerate(AXES)}


def make_session(index):
    uid = f'95000000-0000-4000-8000-{index + 1:012d}'
    email = f'consumer95-{index + 1}@matchrim.invalid'
    user = {'id': uid, 'email': email, 'aud': 'authenticated', 'role': 'authenticated',
            'app_metadata': {'provider': 'email', 'providers': ['email']},
            'user_metadata': {'first_name': 'Synthetic', 'last_name': str(index + 1)},
            'created_at': FIXED_TIME, 'email_confirmed_at': FIXED_TIME}
    enc = lambda obj: base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip('=')
    token = enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': uid, 'exp': 2100000000}) + '.invalid-synthetic-signature'
    return {'access_token': token, 'refresh_token': f'synthetic-invalid-refresh-{index}',
            'expires_at': 2100000000, 'expires_in': 86400, 'token_type': 'bearer', 'user': user}


def wine(index, owner, profile, status, rating, quantity):
    row = {'id': f'95000000-1111-4000-8000-{index * 10 + len(status):012d}',
            'user_id': owner, 'name': f'SYN95 {index + 1:02d} {status}',
            'producer': 'Bodega ficticia QA', 'vintage': 2023,
            'region': 'Region sintetica', 'country': 'Espa\u00f1a', 'grape_varieties': ['QA'],
            'alcohol_content': 13, 'status': status, 'rating': rating, 'quantity': quantity,
            'is_favorite': False, 'use_for_profile_training': bool(rating),
            'matchrim_affinity': None, 'sensory_attributes': dict(zip(
                ('potencia', 'acidez', 'dulzura', 'taninos', 'afrutado'),
                [profile[a] for a in AXES])),
            'place_details': None, 'price': None, 'personal_note': None,
            'consumption_date': None, 'image_url': None,
            'created_at': FIXED_TIME, 'updated_at': FIXED_TIME}
    row['sensory_attributes']['scale'] = 'winerim-0-5'
    compact = lambda value: json.dumps(value, separators=(',', ':'), ensure_ascii=False)
    row['place_details'] = {'bodega_sensory_evidence': {
        'version': 2, 'scale': 'winerim-0-5', 'source': 'catalog',
        'canonical_id': f'syn95-catalog-{index}-{status}',
        'identity_signature': compact([row['name'].lower(), row['producer'].lower(),
                                        row['vintage'], row['region'].lower(), 'espana']),
        'attribute_signature': compact(['winerim-0-5', *[profile[a] for a in AXES]])}}
    return row


class Transport:
    def __init__(self, frozen, base, persona, index, authenticated=True, seeded=False):
        self.frozen, self.base, self.persona = frozen, base, persona
        self.sessions = [make_session(index), make_session(index + 100)]
        self.active = 0 if authenticated else None
        self.events, self.safety_errors, self.unmodeled = [], [], []
        self.failure = None
        self.observations = {}
        self.tables = {'quiz_results': [], 'user_wines': [], 'profiles': [],
                       'user_roles': [], 'wines': [], 'wine_styles': [],
                       'wine_recommendations': [], 'wine_preferences': [], 'dietary_preferences': []}
        for si, sess in enumerate(self.sessions):
            uid = sess['user']['id']
            self.tables['profiles'].append({'id': uid, 'first_name': 'Synthetic',
                                            'last_name': persona['id'], 'preferred_language': 'ES'})
            for status, rating, qty in [('collection', 'ok', 3), ('wishlist', None, 1), ('tasted', 'not_for_me', 0)]:
                self.tables['user_wines'].append(wine(index + si * 100, uid, persona['base'], status, rating, qty))
            if seeded:
                self.tables['quiz_results'].append({'id': f'quiz-{uid}', 'user_id': uid,
                    **persona['expectedQuiz'], 'created_at': FIXED_TIME, 'wine_recommendations': []})

    @property
    def owner(self):
        return self.sessions[self.active]['user']['id'] if self.active is not None else None

    def own_wines(self):
        return [w for w in self.tables['user_wines'] if w['user_id'] == self.owner]

    def uid_for_request(self, request):
        bearer = request.headers.get('authorization', '').removeprefix('Bearer ')
        for sess in self.sessions:
            if bearer == sess['access_token']:
                return sess['user']['id']
        return None

    def finish(self, route, body, status=200, total=None):
        headers = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*',
                   'Access-Control-Allow-Methods': 'GET,HEAD,POST,PATCH,PUT,DELETE,OPTIONS',
                   'Access-Control-Expose-Headers': 'Content-Range', 'Cache-Control': 'no-store'}
        if total is not None:
            headers['Content-Range'] = f'0-{max(0, total - 1)}/{total}' if total else '*/0'
        route.fulfill(status=status, content_type='application/json', headers=headers,
                      body='' if route.request.method == 'HEAD' else json.dumps(body))

    def route(self, route):
        req, url = route.request, urlparse(route.request.url)
        event = {'host': url.hostname, 'path': url.path, 'method': req.method,
                 'resource': req.resource_type, 'disposition': 'aborted'}
        self.events.append(event)
        try:
            if (url.scheme, url.netloc) == (urlparse(self.base).scheme, urlparse(self.base).netloc):
                path = unquote(url.path).lstrip('/')
                if '..' in Path(path).parts or req.method not in ('GET', 'HEAD'):
                    self.safety_errors.append('Unexpected local mutation or traversal')
                    return route.abort('blockedbyclient')
                key = path if path in self.frozen else 'index.html' if req.is_navigation_request() else None
                if key is None:
                    event['disposition'] = 'local-missing-404'
                    return route.fulfill(status=404, body='Frozen build: missing asset')
                data = self.frozen[key]
                event.update(disposition='frozen-file', file=key, sha256=digest(data))
                return route.fulfill(status=200, body=data,
                                     content_type=mimetypes.guess_type(key)[0] or 'application/octet-stream')
            if url.hostname != BACKEND:
                event['disposition'] = 'blocked-external'
                return route.abort('blockedbyclient')
            event['disposition'] = 'in-memory'
            if req.method == 'OPTIONS':
                return self.finish(route, {})
            payload = req.post_data_json if req.post_data else None
            if url.path.startswith('/auth/v1/'):
                if isinstance(payload, dict) and payload.get('email'):
                    assert payload['email'].endswith('.invalid'), 'Non-synthetic email blocked'
                endpoint = url.path.split('/')[-1]
                if endpoint == 'token':
                    if self.failure == 'login':
                        return self.finish(route, {'code': 'invalid_credentials', 'msg': 'Invalid login credentials'}, 400)
                    if self.failure == 'unconfirmed':
                        return self.finish(route, {'code': 'email_not_confirmed', 'msg': 'Email not confirmed'}, 400)
                    self.active = next((i for i, s in enumerate(self.sessions)
                                        if s['user']['email'] == (payload or {}).get('email')), 0)
                    return self.finish(route, self.sessions[self.active])
                if endpoint == 'logout':
                    if self.failure == 'logout':
                        return self.finish(route, {'message': 'Synthetic signout failure'}, 500)
                    self.active = None
                    return self.finish(route, {})
                if endpoint == 'signup':
                    if self.failure == 'signup':
                        return self.finish(route, {'msg': 'User already registered', 'code': 'user_already_exists'}, 422)
                    # No token, explicitly awaiting email confirmation. No email is sent.
                    return self.finish(route, {**self.sessions[0]['user'], 'email': payload['email'],
                                                'email_confirmed_at': None, 'identities': []})
                if endpoint == 'recover':
                    if self.failure == 'recovery':
                        return self.finish(route, {'msg': 'Synthetic recovery unavailable'}, 503)
                    return self.finish(route, {})
                if endpoint == 'user':
                    uid = self.uid_for_request(req)
                    sess = next((s for s in self.sessions if s['user']['id'] == uid), None)
                    return self.finish(route, sess['user'] if sess else {'message': 'No session'}, 200 if sess else 401)
            if url.path.startswith('/rest/v1/'):
                table = url.path.split('/')[-1]
                uid = self.uid_for_request(req)
                if table not in self.tables:
                    self.unmodeled.append({'table': table, 'method': req.method})
                    return self.finish(route, {'message': 'Unmodeled QA table'}, 501)
                if table in ('user_wines', 'quiz_results', 'profiles') and not uid:
                    return self.finish(route, {'message': 'Synthetic auth required'}, 401)
                q = parse_qs(url.query)
                rows = self.tables[table]
                def matches(row):
                    if 'user_id' in row and row['user_id'] != uid:
                        return False
                    if table == 'profiles' and row['id'] != uid:
                        return False
                    for field, values in q.items():
                        if field in ('select', 'order', 'limit', 'offset', 'on_conflict'):
                            continue
                        for value in values:
                            actual = str(row.get(field)).lower() if row.get(field) is not None else 'null'
                            if value.startswith('eq.') and actual != value[3:].lower():
                                return False
                            if value == 'not.is.null' and row.get(field) is None:
                                return False
                            if value == 'is.null' and row.get(field) is not None:
                                return False
                    return True
                selected = [r for r in rows if matches(r)]
                if req.method in ('POST', 'PATCH', 'DELETE'):
                    if self.failure == table or self.failure == 'mutations':
                        return self.finish(route, {'code': 'QA_ERROR', 'message': 'Synthetic persistence unavailable'}, 503)
                    if self.failure == 'zero-row':
                        selected = []
                    elif req.method == 'POST':
                        selected = []
                        for item in payload if isinstance(payload, list) else [payload]:
                            assert not item.get('user_id') or item['user_id'] == uid, 'Foreign owner insert blocked'
                            row = {**item, 'id': item.get('id', f'95000000-9999-4000-8000-{len(rows) + 1:012d}'),
                                   'created_at': FIXED_TIME, 'updated_at': FIXED_TIME}
                            if table == 'quiz_results':
                                row['wine_recommendations'] = []
                            rows.append(row)
                            selected.append(row)
                    elif req.method == 'PATCH':
                        assert not payload.get('user_id') or payload['user_id'] == uid
                        for row in selected:
                            row.update(payload)
                    else:
                        self.tables[table] = [r for r in rows if r not in selected]
                total = len(selected)
                selected = selected[int(q.get('offset', ['0'])[0]):]
                if 'limit' in q:
                    selected = selected[:int(q['limit'][0])]
                if 'vnd.pgrst.object' in req.headers.get('accept', ''):
                    if not selected and req.method in ('PATCH', 'DELETE'):
                        return self.finish(route, {'code': 'PGRST116', 'message': 'No rows'}, 406)
                    return self.finish(route, selected[0] if selected else None, total=total)
                return self.finish(route, selected, total=total)
            if url.path.startswith('/functions/v1/'):
                endpoint = url.path.split('/')[-1]
                if endpoint == 'ai-wine-chat':
                    if self.failure == 'airim':
                        return self.finish(route, {'message': 'Synthetic aiRIM unavailable'}, 503)
                    return self.finish(route, {'success': True,
                        'response': 'Fixture SYN95: respuesta simulada, no consejo ni recomendacion real.'})
                if 'calculate-wine-affinity' in endpoint:
                    return self.finish(route, {'affinity': None})
                if endpoint in ('matchrim-recommendations', 'winerim-wines') or 'search-wines' in endpoint:
                    return self.finish(route, {'results': [], 'wines': [], 'data': [], 'total': 0})
            self.unmodeled.append({'path': url.path, 'method': req.method})
            event['disposition'] = 'blocked-unmodeled'
            return route.abort('blockedbyclient')
        except Exception as error:
            self.safety_errors.append(str(error))
            event['disposition'] = 'blocked-safety-error'
            route.abort('blockedbyclient')

    def websocket(self, ws):
        url = urlparse(ws.url)
        self.events.append({'host': url.hostname, 'path': url.path, 'method': 'WEBSOCKET',
                            'disposition': 'blocked-websocket'})
        # Not calling connect_to_server is the Playwright interception boundary.
        # Leave this socket mocked; synchronous close can stall some driver builds.


class Suite:
    def __init__(self, args):
        self.args = args
        self.build = Path(getattr(args, 'build', None) or BUILD).resolve()
        self.native_result_heading = getattr(args, 'native_result_heading', None) or (
            'Tu perfil' if self.build in (Path('/private/tmp/matchrim95-ui-iteration17'),
                                         Path('/private/tmp/matchrim95-ui-iteration20'),
                                         Path('/private/tmp/Matchrim95-consumer-r4/web')) else 'Resultados de tu perfil')
        assert str(self.build) in BUILD_PORTS, 'Only explicitly frozen QA builds are permitted'
        endpoint = urlparse(args.base)
        assert endpoint.scheme == 'http' and endpoint.hostname in ('localhost', '127.0.0.1')
        assert endpoint.port == BUILD_PORTS[str(self.build)], 'Frozen build/preview port mismatch'
        assert not endpoint.username and not endpoint.password and not endpoint.query and not endpoint.fragment
        self.out = EVIDENCE / args.run_id
        EVIDENCE.mkdir(parents=True, exist_ok=True)
        EVIDENCE.chmod(0o700)
        self.out.mkdir(parents=True, exist_ok=False)
        self.results, self.audit, self.sessions = [], [], []
        self.frozen = {str(p.relative_to(self.build)): p.read_bytes()
                       for p in sorted(self.build.rglob('*')) if p.is_file()}
        assert 'index.html' in self.frozen
        self.manifest = {k: digest(v) for k, v in self.frozen.items()}
        self.profile_bytes = PROFILES.read_bytes()
        self.profiles = json.loads(self.profile_bytes)
        assert len(self.profiles) == 50 and len({p['id'] for p in self.profiles}) == 50
        for p in self.profiles:
            assert p['synthetic'] is True and p['realPerson'] is False
            assert oracle(p['answers']) == p['expectedQuiz'], p['id']
        # This immutable copy is the answer matrix actually used by the UI loop.
        save_json(self.out / 'frozen-quiz-oracle.json', {
            'profileSource': str(PROFILES), 'sourceSha256': digest(self.profile_bytes),
            'weights': QUIZ_WEIGHTS, 'prompts': QUIZ_PROMPTS,
            'profiles': [{'id': p['id'], 'base': p['base'], 'answers': p['answers'],
                          'expected': oracle(p['answers'])} for p in self.profiles]})
        preview = {'url': args.base, 'verified': False}
        try:
            class NoRedirects(HTTPRedirectHandler):
                def redirect_request(self, *unused):
                    return None
            opener = build_opener(ProxyHandler({}), NoRedirects())
            response = opener.open(args.base, timeout=3)
            assert response.geturl().startswith(args.base + '/') or response.geturl() == args.base
            body = response.read()
            preview.update(verified=body == self.frozen['index.html'], indexSha256=digest(body))
        except Exception as error:
            preview['error'] = str(error)
        assert preview['verified'], f'Preview not serving the selected frozen index: {preview}'
        save_json(self.out / 'build-hash-manifest.json', {
            'buildPath': str(self.build), 'preview': preview, 'files': self.manifest,
            'manifestSha256': digest(json.dumps(self.manifest, sort_keys=True).encode()),
            'runnerSha256': digest(Path(__file__).read_bytes()), 'surface': args.surface,
            'quizResultHeading': self.native_result_heading if args.surface == 'native' else 'Resultados de tu perfil',
            'appSourceMayBeChanging': True, 'browserDelivery': 'frozen bytes; no route.continue or route.fetch',
            'scope': 'mocked rendered browser UI, NOT hosted auth, provider intelligence, RLS or human comprehension'})

    def context(self, browser, persona, index, authenticated=True, seeded=False, native=None):
        native = self.args.surface == 'native' if native is None else native
        mode = index % 5
        width, height, font = [(393, 852, 16), (320, 740, 16), (852, 393, 16),
                               (393, 852, 24), (852, 393, 24)][mode]
        transport = Transport(self.frozen, self.args.base, persona, index, authenticated, seeded)
        transport.native = native
        context = browser.new_context(viewport={'width': width, 'height': height},
            reduced_motion='reduce', locale='es-ES', service_workers='block', accept_downloads=False)
        context.set_default_timeout(5500)
        context.route('**/*', transport.route)
        context.route_web_socket(re.compile('.*'), transport.websocket)
        sess = transport.sessions[0]
        setup = {'session': sess if authenticated else None, 'authKey': AUTH_KEY,
                 'owner': sess['user']['id'] if authenticated else 'anonymous',
                 'profile': persona['expectedQuiz'] if seeded else None,
                 'native': native, 'font': font}
        context.add_init_script("""(() => {
            const s = %s;
            if (s.native) window.CapacitorCustomPlatform = {name:'ios'};
            if (!localStorage.getItem('qa95.initialized')) {
                if (s.session) localStorage.setItem(s.authKey, JSON.stringify(s.session));
                localStorage.setItem('matchrim.local_profile_owner.v1', s.owner);
                if (s.profile) localStorage.setItem('matchrim_quiz_result', JSON.stringify(s.profile));
                localStorage.setItem('qa95.initialized', 'yes');
            }
            const display = () => {
                document.documentElement.style.fontSize = s.font + 'px';
                if (s.native) {
                    document.documentElement.style.setProperty('--matchrim-native-safe-top', '59px');
                    document.documentElement.style.setProperty('--matchrim-native-safe-bottom', '34px');
                }
            };
            document.addEventListener('DOMContentLoaded', display);
        })();""" % json.dumps(setup))
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        self.sessions.append({'persona': persona['id'], 'index': index, 'nativeEmulation': native,
                              'viewport': [width, height], 'rootFontPx': font,
                              'transport': transport, 'pageErrors': errors})
        return context, page, transport, errors

    def go(self, page, path):
        page.goto(self.args.base + path, wait_until='networkidle')
        page.wait_for_timeout(100)
        body = page.locator('body').inner_text()
        assert 'Algo no ha cargado bien' not in body
        assert 'No se ha podido cargar esta pantalla' not in body, body[:1000]

    @staticmethod
    def tab(page, name):
        tab = page.get_by_role('tab', name=re.compile(r'^' + re.escape(name) + r'(?:\s|$)'))
        tab.click()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(100)
        expect(tab).to_have_attribute('aria-selected', 'true')

    def skip_guide(self, page):
        skip = page.get_by_role('button', name='Saltar gu\u00eda', exact=True)
        if skip.is_visible():
            skip.click()

    @staticmethod
    def dismiss_notices(page):
        region = page.get_by_role('region', name='Notifications (F8)', exact=True)
        for _ in range(6):
            close = region.locator('[role=status][data-state=open] button').first
            if not close.is_visible():
                break
            close.focus()
            close.press('Enter')
            page.wait_for_timeout(80)

    def shot(self, page, case):
        page.wait_for_load_state('networkidle', timeout=2500)
        page.wait_for_timeout(150)
        page.screenshot(path=str(self.out / f'{case}.png'), full_page=True)
        page.screenshot(path=str(self.out / f'{case}.viewport.png'), full_page=False)
        (self.out / f'{case}.aria.txt').write_text(page.locator('body').aria_snapshot())

    def record(self, case, fn, page, evidence=False):
        faulthandler.dump_traceback_later(120)
        started = time.monotonic()
        result = {'case': case, 'environment': 'frozen-build-mocked-E2E'}
        try:
            result.update(status='PASS', details=fn())
        except Exception as error:
            result.update(status='FAIL', observed=str(error), traceback=traceback.format_exc(),
                          failureKind='selector-or-timing-needs-triage' if isinstance(error, PlaywrightTimeout)
                          else 'assertion-needs-triage', url=page.url)
            evidence = True
            body = page.locator('body').inner_text()
            if 'Falta configurar el enlace p\u00fablico de Matchrim' in body:
                result['failureKind'] = 'confirmed-frozen-native-build-configuration-blocker'
                result['observed'] = 'Rendered error boundary: Falta configurar el enlace publico de Matchrim'
        result['durationMs'] = round((time.monotonic() - started) * 1000)
        faulthandler.cancel_dump_traceback_later()
        if evidence:
            try:
                self.shot(page, case)
                result['evidence'] = [f'{case}.png', f'{case}.aria.txt']
            except Exception as error:
                result['captureError'] = str(error)
        self.results.append(result)
        self.checkpoint()
        print(case, result['status'], result.get('observed', '')[:220], flush=True)
        return result['status'] == 'PASS'

    def checkpoint(self):
        session_rows = [{**{k: v for k, v in s.items() if k != 'transport'},
                         'traffic': s['transport'].events, 'safetyErrors': s['transport'].safety_errors,
                         'unmodeled': s['transport'].unmodeled,
                         'syntheticFinalState': {k: s['transport'].tables[k] for k in ('quiz_results', 'user_wines')}}
                        for s in self.sessions]
        save_json(self.out / 'checkpoint.json', {'results': self.results, 'sessions': session_rows,
                                               'uiHeuristicObservations': self.audit})

    def layout(self, page, label):
        metrics = page.evaluate("""() => {
            const intendedHiddenRadixSelect = el => {
                if(el.tagName!=='SELECT'||el.getAttribute('aria-hidden')!=='true'||el.tabIndex!==-1)return false;
                const r=el.getBoundingClientRect(),s=getComputedStyle(el);
                return r.width<=1.1&&r.height<=1.1&&s.position==='absolute'&&
                    (s.clip==='rect(0px, 0px, 0px, 0px)'||s.clipPath==='inset(50%)');
            };
            const visible = el => {const r=el.getBoundingClientRect();const s=getComputedStyle(el);
                return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none' && !intendedHiddenRadixSelect(el);};
            const name = el => el.getAttribute('aria-label') ||
                (el.getAttribute('aria-labelledby')||'').split(' ').map(id=>document.getElementById(id)?.textContent||'').join(' ').trim() ||
                [...(el.labels||[])].map(l=>l.innerText).join(' ').trim() || (el.innerText||'').trim() || el.getAttribute('title') || el.getAttribute('placeholder') || '';
            const controls = [...document.querySelectorAll('button,a[href],input,select,textarea,[role=radio],[role=switch],[role=tab],[role=checkbox]')]
                .filter(visible).map(el=>{
                    let hit=el;const lab=el.closest('label');if(lab && visible(lab))hit=lab;
                    const r=hit.getBoundingClientRect();
                    return {tag:el.tagName,role:el.getAttribute('role'),name:name(el).slice(0,150),
                        width:+r.width.toFixed(1),height:+r.height.toFixed(1),disabled:el.disabled||el.getAttribute('aria-disabled')==='true',
                        inViewport:r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth,
                        textClipped:el.scrollWidth>el.clientWidth+2&&getComputedStyle(el).overflowX==='hidden'};});
            return {width:innerWidth,height:innerHeight,rootFont:getComputedStyle(document.documentElement).fontSize,
                overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,
                excludedIntentionalHiddenRadixSelects:[...document.querySelectorAll('select')].filter(intendedHiddenRadixSelect).length,
                controls,headings:[...document.querySelectorAll('h1,h2,h3')].filter(visible).map(el=>el.textContent.trim()),
                enabledCommands:controls.filter(c=>!c.disabled&&c.name).length};
        }""")
        metrics['label'] = label
        metrics['issues'] = [dict(c, issue='unnamed') for c in metrics['controls'] if not c['name']]
        metrics['issues'] += [dict(c, issue='target-under-44') for c in metrics['controls']
                              if not c['disabled'] and (c['width'] < 43.9 or c['height'] < 43.9)]
        metrics['issues'] += [dict(c, issue='clipped-control-text') for c in metrics['controls'] if c['textClipped']]
        metrics['methodLimit'] = 'DOM heuristic, not full accessible-name computation, VoiceOver or human comprehension'
        self.audit.append(metrics)
        return {'layout': label, 'issueCount': len(metrics['issues']), 'metricsAreHeuristics': True,
                'horizontalOverflow': metrics['overflow'], 'namedNextActions': metrics['enabledCommands']}

    def quiz_result_heading(self, page, native=None):
        native = self.args.surface == 'native' if native is None else native
        title = self.native_result_heading if native else 'Resultados de tu perfil'
        return page.get_by_role('heading', name=title, exact=True)

    def quiz(self, page, transport, persona, index):
        self.go(page, '/matchrim')
        page.get_by_role('button', name='Comenzar el test', exact=True).click()
        visited = []
        for n in range(1, 21):
            expect(page.get_by_text(f'Pregunta {n} de 20', exact=True)).to_be_visible()
            expect(page.get_by_role('heading', name=re.compile(re.escape(QUIZ_PROMPTS[n - 1]), re.I))).to_be_visible()
            image = page.locator('.matchrim-native-quiz-image') if transport.native else page.get_by_role('img', name=re.compile(re.escape(QUIZ_PROMPTS[n - 1]), re.I))
            expect(image).to_be_visible()
            expect(image).to_have_js_property('complete', True)
            assert image.evaluate('(i) => i.naturalWidth > 0'), f'Image {n} not decoded'
            next_button = page.get_by_role('button', name='Ver mi perfil' if n == 20 else 'Siguiente', exact=True)
            if n == 1:
                if transport.native:
                    expect(next_button).to_be_disabled()
                self.layout(page, f'{persona["id"]}-quiz-start')
                if index < 5:
                    self.shot(page, f'{persona["id"]}-quiz-start')
            radio = page.get_by_role('radio', name=RADIOS[persona['answers'][str(n)]], exact=True) if transport.native else page.locator('#' + persona['answers'][str(n)])
            radio.click()
            if transport.native:
                expect(radio).to_be_checked()
                expect(page.get_by_text(f'Pregunta {n} de 20', exact=True)).to_be_visible()
                next_button.click()
            visited.append(n)
        expect(self.quiz_result_heading(page, transport.native)).to_be_visible()
        if transport.native:
            expect(page.get_by_text('Perfil guardado en tu cuenta.', exact=True)).to_be_visible()
        rows = [r for r in transport.tables['quiz_results'] if r['user_id'] == transport.owner]
        assert len(rows) == 1, f'Expected one persisted quiz, got {len(rows)}'
        actual = {a: rows[0][a] for a in AXES}
        assert actual == oracle(persona['answers']), {'actual': actual, 'expected': oracle(persona['answers'])}
        self.layout(page, f'{persona["id"]}-quiz-result')
        page.reload(wait_until='networkidle')
        expect(self.quiz_result_heading(page, transport.native)).to_be_visible()
        return {'questionClicks': visited, 'answerClicks': 20, 'continueClicks': 20 if transport.native else 0,
                'actualPersistedVector': actual, 'independentOracle': True, 'reloadResult': True,
                'surface': 'native-emulated' if transport.native else 'responsive-web'}

    def home(self, page, transport, persona):
        self.go(page, '/')
        self.skip_guide(page)
        expect(page.get_by_role('heading', name='\u00bfQu\u00e9 quieres elegir?', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Pregunta a aiRIM', exact=True)).to_be_visible()
        self.layout(page, persona['id'] + '-home')
        original_viewport = dict(page.viewport_size)
        nav = page.get_by_role('navigation', name='Navegaci\u00f3n principal', exact=True)
        for label, path in [('aiRIM', '/inteligencia-liquida'), ('Escanear', '/escanear'),
                            ('Bodega', '/my-wines'), ('Perfil', '/profile'), ('Inicio', '/')]:
            link = nav.get_by_role('link', name=label, exact=True)
            if not link.is_visible() and not transport.native:
                self.go(page, '/')
                page.set_viewport_size({'width': 700, 'height': 393})
                link = page.get_by_role('navigation', name='Navegaci\u00f3n principal').get_by_role('link', name=label, exact=True)
            expect(link).to_be_visible()
            box = link.bounding_box()
            assert box and box['width'] >= 44 and box['height'] >= 44, f'Navigation target {label}: {box}'
            link.click()
            expect(page).to_have_url(re.compile(re.escape(path) + r'(?:\?.*)?$') if path != '/' else self.args.base + '/')
            page.wait_for_timeout(100)
        page.set_viewport_size(original_viewport)
        return {'clickedFiveTabs': True, 'airimHomeVisible': True, 'nextActionAvailable': True}

    def airim(self, page, transport, persona):
        page.get_by_role('button', name='Pregunta a aiRIM', exact=True).click()
        page.get_by_label('Pregunta para aiRIM', exact=True).fill(f'Consulta {persona["id"]} sintetica: marisco, 25 euros')
        page.get_by_role('button', name='Abrir conversaci\u00f3n', exact=True).click()
        page.get_by_role('button', name='Enviar pregunta', exact=True).click()
        expect(page.get_by_text('Fixture SYN95:', exact=False)).to_be_visible()
        self.layout(page, persona['id'] + '-airim-response')
        page.get_by_role('button', name='Volver a aiRIM', exact=True).click()
        expect(page.get_by_role('heading', name='\u00bfQu\u00e9 necesitas decidir?', exact=True)).to_be_visible()
        return {'chatResponse': 'explicit synthetic fixture', 'backToWorkspace': True,
                'notCertified': ['hosted AI', 'quality of recommendation', 'human understanding']}

    def cellar(self, page, transport, persona):
        self.go(page, '/my-wines/collection')
        own = next(w for w in transport.own_wines() if w['status'] == 'collection')
        name = own['name']
        expect(page.get_by_text(name, exact=True)).to_be_visible()
        self.layout(page, persona['id'] + '-cellar')
        page.get_by_role('button', name=f'Guardar {name} en favoritos', exact=True).click()
        expect(page.get_by_role('button', name=f'Quitar {name} de favoritos', exact=True)).to_be_visible()
        assert own['is_favorite'] and own['status'] == 'collection' and own['rating'] == 'ok'
        self.tab(page, 'Favoritos')
        expect(page.get_by_text(name, exact=True)).to_be_visible()
        page.get_by_role('button', name='Me encanta', exact=True).click()
        expect(page.get_by_role('button', name='Quitar valoraci\u00f3n', exact=True)).to_be_enabled()
        assert own['rating'] == 'love' and own['quantity'] == 3, 'Editing rating consumed a bottle'
        toggle = page.get_by_role('switch', name=f'Usar {name} para entrenar perfil', exact=True)
        expect(toggle).to_be_checked()
        toggle.click()
        expect(toggle).not_to_be_checked()
        assert own['use_for_profile_training'] is False
        if transport.native:
            assert own['place_details']['matchrim_training_policy'] == 'excluded'
        page.get_by_role('button', name='Correcto', exact=True).click()
        page.wait_for_timeout(150)
        assert own['rating'] == 'ok'
        exclusion_survives = own['use_for_profile_training'] is False
        self.record(persona['id'] + '-training-optout-persists-on-rating-edit',
                    lambda: self.require(exclusion_survives, 'Explicit exclusion lost on rating edit'), page)
        if not toggle.is_checked():
            toggle.click()
        expect(toggle).to_be_checked()
        assert own['use_for_profile_training'] is True
        page.get_by_role('button', name='Quitar valoraci\u00f3n', exact=True).click()
        expect(page.get_by_role('button', name='Quitar valoraci\u00f3n', exact=True)).to_have_count(0)
        assert own['rating'] is None and own['use_for_profile_training'] is False and own['quantity'] == 3
        self.tab(page, 'Quiero Probar')
        wish = next(w for w in transport.own_wines() if w['status'] == 'wishlist')
        expect(page.get_by_text(wish['name'], exact=True)).to_be_visible()
        page.get_by_role('button', name='Me encanta', exact=True).click()
        page.wait_for_timeout(250)
        assert wish['status'] == 'tasted' and wish['rating'] == 'love', 'Wishlist rating did not become tasted'
        self.tab(page, 'Ya Probados')
        expect(page.get_by_text(wish['name'], exact=True)).to_be_visible()
        self.tab(page, 'No repetir')
        rejected = next(w for w in transport.own_wines() if w['rating'] == 'not_for_me')
        expect(page.get_by_text(rejected['name'], exact=True)).to_be_visible()
        return {'favoriteDidNotMoveOrRate': True, 'ratingEditQuantity': own['quantity'],
                'trainingExclusionPersistsOnEdit': exclusion_survives, 'ratingRemovalStopsTraining': True,
                'wishlistRatingMovesToTasted': True, 'rejectedView': True}

    def manual(self, page, transport, persona):
        self.go(page, '/my-wines')
        page.get_by_role('button', name=re.compile('A\u00f1adir manualmente')).click()
        name = 'Manual ' + persona['id']
        page.get_by_label('Nombre del Vino *', exact=True).fill(name)
        page.get_by_role('button', name='He revisado el nombre', exact=True).click()
        dialog = page.get_by_role('dialog')
        dialog.get_by_role('button', name='Mi Bodega', exact=True).click()
        page.get_by_role('button', name='Confirmar', exact=True).click()
        page.wait_for_timeout(250)
        rows = [w for w in transport.own_wines() if w['name'] == name]
        assert len(rows) == 1, f'Save count {len(rows)}'
        assert not rows[0].get('rating') and not rows[0].get('use_for_profile_training'), 'Save alone inferred taste'
        self.go(page, '/my-wines/collection')
        expect(page.get_by_text(name, exact=True)).to_be_visible()
        return {'manualIdentityConfirmationClicked': True, 'savedOnce': True, 'notRatedOrTrained': True}

    def history(self, page, transport, persona):
        self.go(page, '/profile')
        self.tab(page, 'Historial')
        expect(page.get_by_text('Historial de Tests', exact=True)).to_be_visible()
        assert 'No has realizado ning\u00fan test a\u00fan' not in page.locator('body').inner_text()
        self.layout(page, persona['id'] + '-quiz-history')
        return {'persistedQuizInHistory': True}

    def logout_isolation(self, page, transport, persona):
        self.go(page, '/profile')
        first_owner = transport.owner
        first_names = [w['name'] for w in transport.own_wines()]
        if transport.native:
            page.get_by_role('button', name='Ajustes de cuenta', exact=True).click()
        else:
            page.locator('button[aria-haspopup=menu]').first.click()
        page.get_by_role('menuitem', name=re.compile('Cerrar sesi\u00f3n', re.I)).click()
        page.wait_for_timeout(200)
        assert transport.active is None, 'Logout request not completed'
        # Only the synthetic cache in this newly-created context is inspected.
        cache = page.evaluate("Object.fromEntries(['matchrim_quiz_result','matchrim_quiz_answers','matchrim.scan_history.v1'].map(k=>[k,localStorage.getItem(k)]))")
        assert all(v is None for v in cache.values()), f'Private profile/scan cache survives: {cache}'
        page.reload(wait_until='networkidle')
        self.go(page, '/my-wines')
        expect(page.locator('input[type=email]')).to_be_visible()
        second = transport.sessions[1]
        page.locator('input[type=email]').fill(second['user']['email'])
        page.locator('input[autocomplete=current-password]').fill(PASSWORD)
        page.locator('button[type=submit]').click()
        expect(page.get_by_role('heading', name='Mis Vinos', exact=True)).to_be_visible()
        self.go(page, '/my-wines/collection')
        second_name = next(w['name'] for w in transport.own_wines() if w['status'] == 'collection')
        expect(page.get_by_text(second_name, exact=True)).to_be_visible()
        body = page.locator('body').inner_text()
        assert all(name not in body for name in first_names), 'Another owner wine appeared'
        self.go(page, '/profile')
        expect(page.get_by_text('No tienes un perfil a\u00fan', exact=True)).to_be_visible()
        assert transport.owner != first_owner
        return {'logoutCacheCleared': True, 'reloadRemainsSignedOut': True,
                'secondOwnerLoggedInThroughUI': True, 'noFirstOwnerWineOrQuiz': True,
                'notServerAuthorizationProof': True}

    def auth_controls(self, page, transport, persona):
        self.go(page, '/auth')
        submit = page.locator('button[type=submit]')
        before = len(transport.events)
        submit.click()
        assert not any(e['path'].endswith('/token') for e in transport.events[before:]), 'Empty login submitted'
        page.locator('input[type=email]').fill(transport.sessions[0]['user']['email'])
        page.locator('input[autocomplete=current-password]').fill(PASSWORD)
        page.get_by_role('button', name='Mostrar contrase\u00f1a', exact=True).click()
        expect(page.locator('input[autocomplete=current-password]')).to_have_attribute('type', 'text')
        page.get_by_role('button', name='Ocultar contrase\u00f1a', exact=True).click()
        transport.failure = 'login'
        submit.click()
        expect(page.get_by_text('Credenciales incorrectas.', exact=False).first).to_be_visible()
        expect(submit).to_be_enabled()
        assert transport.active is None
        self.layout(page, persona['id'] + '-login-error')
        self.dismiss_notices(page)
        transport.failure = 'unconfirmed'
        submit.click()
        expect(page.get_by_text('Debes confirmar tu email', exact=False).first).to_be_visible()
        assert transport.active is None
        transport.failure = None
        page.get_by_role('link', name=re.compile('olvid', re.I)).click()
        expect(page.locator('input[type=email]')).to_be_visible()
        page.reload(wait_until='networkidle')
        page.locator('input[type=email]').fill(f'recovery-{persona["id"]}@matchrim.invalid')
        transport.failure = 'recovery'
        page.locator('button[type=submit]').click()
        expect(page.get_by_role('status').filter(has_text='Error').first).to_be_visible(timeout=15000)
        expect(page.locator('input[type=email]')).to_be_visible()
        expect(page.locator('button[type=submit]')).to_be_enabled()
        error_body = page.locator('body').inner_text()
        self.record(persona['id'] + '-recovery-error-readable',
                    lambda: self.require('Error {}' not in error_body,
                                         'Recovery 503 renders Error {} with no explanation or retry guidance'), page)
        transport.failure = None
        page.locator('button[type=submit]').click()
        expect(page.locator('input[type=email]')).to_have_count(0)
        self.layout(page, persona['id'] + '-recovery-confirmation')
        self.go(page, '/reset-password')
        expect(page.locator('input[type=password]')).to_have_count(0)
        assert transport.active is None
        return {'requiredFieldsGate': True, 'passwordVisibilityToggle': True,
                'invalidCredentialsRecoverable': True, 'unconfirmedEmailGuidance': True,
                'recoveryFailureNoSuccess': True, 'recoveryMockAccepted': True,
                'invalidResetCannotChangePassword': True, 'emailNeverSent': True}

    def registration(self, page, transport, persona):
        self.go(page, '/registration')
        next_button = page.get_by_role('button', name='Continuar', exact=True)
        assert next_button.is_disabled(), 'Required basic details not gated'
        for selector, value in [('#firstName', 'Synthetic'), ('#lastName', persona['id']),
                                ('#email', f'register-{persona["id"]}@matchrim.invalid'),
                                ('#password', PASSWORD), ('input[type=tel]', '600000000')]:
            page.locator(selector).fill(value)
        self.layout(page, persona['id'] + '-registration-basic')
        next_button.click()
        expect(page.get_by_text('Preferencias de Vino', exact=True)).to_be_visible()
        page.get_by_role('button', name='Continuar', exact=True).click()
        complete = page.get_by_role('button', name='Completar Registro', exact=True)
        expect(complete).to_be_disabled()
        page.locator('#terms').check()
        expect(complete).to_be_disabled()
        page.locator('#privacy').check()
        expect(complete).to_be_enabled()
        transport.failure = 'signup'
        complete.click()
        expect(page.get_by_text('Error en el registro', exact=True).first).to_be_visible()
        expect(complete).to_be_enabled()
        assert page.get_by_text('Revisa tu email', exact=True).count() == 0
        self.layout(page, persona['id'] + '-registration-error')
        self.dismiss_notices(page)
        transport.failure = None
        complete.click()
        expect(page.get_by_text('Revisa tu email', exact=True)).to_be_visible(timeout=10000)
        assert transport.active is None
        self.layout(page, persona['id'] + '-registration-confirmation-required')
        page.get_by_role('button', name='Ir a iniciar sesion', exact=True).click()
        expect(page.locator('input[type=email]')).to_be_visible()
        return {'threeSteps': True, 'optionalPreferencesSkippable': True, 'eachConsentRequired': True,
                'signupFailureNoFalseConfirmation': True, 'confirmationNotAuthenticated': True,
                'emailDeliveryAndHostedRegistrationNotTested': True}

    def failed_mutations(self, page, transport, persona, failure):
        self.go(page, '/my-wines')
        row = next(w for w in transport.own_wines() if w['status'] == 'collection')
        name = row['name']
        expect(page.get_by_text(name, exact=True)).to_be_visible()
        transport.failure = failure
        favorite = page.get_by_role('button', name=f'Guardar {name} en favoritos', exact=True)
        favorite.click()
        expect(favorite).to_be_enabled()
        assert row['is_favorite'] is False
        assert page.get_by_text('A\u00f1adido a Mis vinos > Favoritos', exact=True).count() == 0
        page.get_by_role('button', name='Me encanta', exact=True).click()
        expect(page.get_by_role('button', name='Me encanta', exact=True)).to_be_enabled()
        assert row['rating'] == 'ok' and row['quantity'] == 3
        toggle = page.get_by_role('switch', name=f'Usar {name} para entrenar perfil', exact=True)
        toggle.click()
        expect(toggle).to_be_enabled()
        expect(toggle).to_be_checked()
        assert row['use_for_profile_training'] is True
        page.once('dialog', lambda dialog: dialog.accept())
        delete = page.get_by_role('button', name=f'Eliminar {name}', exact=True)
        delete.click()
        expect(delete).to_be_enabled()
        expect(page.get_by_text(name, exact=True)).to_be_visible()
        assert row in transport.own_wines()
        self.layout(page, persona['id'] + '-failed-mutations-' + failure)
        return {'injectedFailure': failure, 'favoriteNotFalselySaved': True,
                'ratingAndQuantityUnchanged': True, 'failedTrainingToggleRolledBack': True,
                'failedDeletionKeepsWine': True, 'allControlsUnlocked': True}

    def failed_save_retry(self, page, transport, persona):
        self.go(page, '/my-wines')
        page.get_by_role('button', name=re.compile('A\u00f1adir manualmente')).click()
        name = 'Retry ' + persona['id']
        page.get_by_label('Nombre del Vino *', exact=True).fill(name)
        page.get_by_role('button', name='He revisado el nombre', exact=True).click()
        page.get_by_role('dialog').get_by_role('button', name='Mi Bodega', exact=True).click()
        transport.failure = 'user_wines'
        page.get_by_role('button', name='Confirmar', exact=True).click()
        expect(page.get_by_text('Error al guardar el vino', exact=True)).to_be_visible()
        assert not any(w['name'] == name for w in transport.own_wines())
        expect(page.get_by_label('Nombre del Vino *', exact=True)).to_have_value(name)
        self.shot(page, persona['id'] + '-failed-save-remains-editable')
        transport.failure = None
        # Saving returns to the editable dialog after failure, so choose destination again.
        page.get_by_role('dialog').get_by_role('button', name='Mi Bodega', exact=True).click()
        page.get_by_role('button', name='Confirmar', exact=True).click()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(150)
        rows = [w for w in transport.own_wines() if w['name'] == name]
        assert len(rows) == 1 and not rows[0].get('rating')
        return {'errorNotSuccess': True, 'draftKept': True, 'retrySavedExactlyOnce': True}

    def failed_airim_retry(self, page, transport, persona):
        self.go(page, '/inteligencia-liquida')
        question = 'Consulta de fallo sintetico ' + persona['id']
        page.get_by_label('Pregunta para aiRIM', exact=True).fill(question)
        page.get_by_role('button', name='Abrir conversaci\u00f3n', exact=True).click()
        transport.failure = 'airim'
        page.get_by_role('button', name='Enviar pregunta', exact=True).click()
        expect(page.get_by_text('aiRIM no est\u00e1 disponible ahora. Tu pregunta no se ha perdido.', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Enviar pregunta', exact=True)).to_be_enabled()
        assert page.get_by_text('Fixture SYN95:', exact=False).count() == 0
        inputs = page.locator('textarea')
        expect(inputs).to_have_value(question)
        transport.failure = None
        page.get_by_role('button', name='Enviar pregunta', exact=True).click()
        expect(page.get_by_text('Fixture SYN95:', exact=False)).to_be_visible()
        return {'failureNoFalseAnswer': True, 'questionRetained': True, 'retryWorksWithMock': True}

    def network_sentinel(self, page, transport):
        page.evaluate("""() => {
            fetch('https://consumer95-network-sentinel.invalid/blocked', {method:'POST',body:'synthetic'}).catch(()=>{});
            window.qa95Sentinel=new WebSocket('wss://consumer95-network-sentinel.invalid/blocked');
            window.qa95Sentinel.onerror=()=>{};
        }""")
        page.wait_for_timeout(350)
        assert any(e['disposition'] == 'blocked-external' and e['host'].endswith('.invalid') for e in transport.events)
        assert any(e['disposition'] == 'blocked-websocket' for e in transport.events)
        page.evaluate("window.qa95Sentinel.close(1000, 'synthetic guard verified')")
        assert not transport.safety_errors, transport.safety_errors
        return {'httpBlocked': True, 'websocketBlockedWithoutConnectToServer': True,
                'continuedOrFetchedRequests': 0, 'existingBrowserStorageRead': False}

    def finish(self):
        current = {str(p.relative_to(self.build)): digest(p.read_bytes()) for p in self.build.rglob('*') if p.is_file()}
        for case, failures in [
            ('layout-no-horizontal-overflow', [a['label'] for a in self.audit if a['overflow']]),
            ('layout-clear-named-next-action', [a['label'] for a in self.audit if not a['enabledCommands']]),
            ('heuristic-controls-44px', [a['label'] for a in self.audit if any(i['issue'] == 'target-under-44' for i in a['issues'])]),
            ('heuristic-controls-accessible-names', [a['label'] for a in self.audit if any(i['issue'] == 'unnamed' for i in a['issues'])]),
        ]:
            self.results.append({'case': case, 'status': 'FAIL' if failures else 'PASS',
                                 'failureKind': 'DOM-heuristic-review-required' if failures else None,
                                 'affectedSnapshots': failures, 'notHumanComprehensionCertification': True})
        summary = {'runId': self.args.run_id, 'evidencePath': str(self.out),
                   'buildPath': str(self.build), 'frozenBuildUnchangedOnDisk': current == self.manifest,
                   'counts': dict(Counter(r['status'] for r in self.results)),
                   'results': self.results, 'contexts': len(self.sessions),
                   'distinctProvidedProfiles': len({s['persona'] for s in self.sessions if s['index'] < 50}),
                   'httpDispositionCounts': dict(Counter(e['disposition'] for s in self.sessions for e in s['transport'].events)),
                   'allNetworkRequestsIntercepted': True, 'remoteReads': 0, 'remoteWrites': 0,
                   'routeContinueCalls': 0, 'routeFetchCalls': 0, 'websocketServerConnections': 0,
                   'safetyErrors': [e for s in self.sessions for e in s['transport'].safety_errors],
                   'unmodeled': [e for s in self.sessions for e in s['transport'].unmodeled],
                   'limitations': ['Mocked browser E2E, not hosted auth or email delivery',
                       'Synthetic transport ownership filtering, not production RLS certification',
                       'DOM/layout heuristics and screenshot review are not human comprehension research',
                       'Native layout emulated in Chrome, not Apple simulator, device or VoiceOver',
                       '24px root font approximates large text, not actual iOS Dynamic Type',
                       'Provider intelligence is explicitly stubbed, not evaluated']}
        self.checkpoint()
        save_json(self.out / 'results.json', summary)
        issue_counts = Counter((i['issue'], i['name'], i['width'], i['height'])
                               for a in self.audit for i in a['issues'])
        save_json(self.out / 'ui-heuristic-summary.json', {
            'observations': len(self.audit), 'overflowCount': sum(a['overflow'] for a in self.audit),
            'issues': [{'issue': key[0], 'name': key[1], 'width': key[2], 'height': key[3], 'count': count}
                       for key, count in issue_counts.most_common()], 'notHumanComprehension': True})
        print(json.dumps({k: summary[k] for k in ['runId', 'counts', 'contexts', 'distinctProvidedProfiles',
                                                'httpDispositionCounts', 'safetyErrors', 'unmodeled']}, indent=2), flush=True)

    def run(self):
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, executable_path=CHROME,
                args=['--disable-background-networking', '--disable-component-update', '--disable-sync',
                      '--no-first-run', '--disable-quic', '--no-proxy-server',
                      '--host-resolver-rules=MAP * ~NOTFOUND'])
            try:
                if self.args.negative_only:
                    for index in range(5):
                        persona = self.profiles[index]
                        for label, fn in [('mutations-503', lambda pg, tr, pe: self.failed_mutations(pg, tr, pe, 'user_wines')),
                                          ('mutations-zero-row', lambda pg, tr, pe: self.failed_mutations(pg, tr, pe, 'zero-row')),
                                          ('manual-save-failure-retry', self.failed_save_retry),
                                          ('airim-failure-retry', self.failed_airim_retry)]:
                            ctx, page, tr, errors = self.context(browser, persona, index)
                            try:
                                self.record(persona['id'] + '-' + label, lambda fn=fn: fn(page, tr, persona), page, True)
                                self.record(persona['id'] + '-' + label + '-page-errors', lambda: self.assert_empty(errors), page)
                            finally:
                                ctx.close()
                    return
                for index in range(self.args.start, min(50, self.args.start + self.args.count)):
                    persona = self.profiles[index]
                    ctx, page, tr, errors = self.context(browser, persona, index)
                    prefix = persona['id']
                    try:
                        self.go(page, '/privacy')
                        self.record(prefix + '-network-sentinel', lambda: self.network_sentinel(page, tr), page)
                        for label, fn in [('quiz-20-clicks-result', self.quiz), ('home-five-tab-navigation', self.home),
                                          ('airim-question-back', self.airim), ('cellar-favorite-rating-training-status', self.cellar),
                                          ('manual-save-no-taste-inference', self.manual), ('quiz-history', self.history),
                                          ('logout-second-owner-isolation', self.logout_isolation)]:
                            if self.args.cases and label not in self.args.cases.split(','):
                                continue
                            callback = (lambda fn=fn: fn(page, tr, persona, index)) if fn == self.quiz else (lambda fn=fn: fn(page, tr, persona))
                            self.record(prefix + '-' + label, callback, page, evidence=index < 5)
                        self.record(prefix + '-no-uncaught-page-errors', lambda: self.assert_empty(errors), page)
                    finally:
                        ctx.close()
                    # Auth routes use another empty context, never the signed-in owner's storage.
                    if self.args.cases and self.args.cases != 'auth':
                        continue
                    ctx, page, tr, errors = self.context(browser, persona, index, authenticated=False)
                    try:
                        self.record(prefix + '-auth-recovery-error-controls', lambda: self.auth_controls(page, tr, persona), page, index < 5)
                        self.record(prefix + '-registration-consent-confirmation-errors', lambda: self.registration(page, tr, persona), page, index < 5)
                        self.record(prefix + '-anonymous-no-uncaught-page-errors', lambda: self.assert_empty(errors), page)
                    finally:
                        ctx.close()
            finally:
                browser.close()
                self.finish()

    @staticmethod
    def require(condition, message):
        assert condition, message
        return {'conditionMet': True}

    @staticmethod
    def assert_empty(errors):
        assert not errors, errors
        return {'uncaughtPageErrors': 0}


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default='http://127.0.0.1:4595')
    parser.add_argument('--build', choices=tuple(BUILD_PORTS), default=str(BUILD))
    parser.add_argument('--start', type=int, default=0)
    parser.add_argument('--count', type=int, default=50)
    parser.add_argument('--surface', choices=('native', 'web'), default='native')
    parser.add_argument('--native-result-heading', choices=('Resultados de tu perfil', 'Tu perfil'),
                        help='Exact native result title for the selected freeze; web keeps its legacy title')
    parser.add_argument('--cases', default='', help='Optional comma-separated main journey names; keeps network guard checks')
    parser.add_argument('--negative-only', action='store_true', help='Five display modes, four isolated failure/retry journeys each')
    parser.add_argument('--run-id', default=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    args = parser.parse_args()
    assert re.fullmatch(r'[A-Za-z0-9_.-]+', args.run_id), 'Unsafe evidence folder'
    assert urlparse(args.base).hostname in ('localhost', '127.0.0.1')
    assert urlparse(args.base).port == BUILD_PORTS[args.build], 'Do not touch parent/A preview ports'
    assert 0 <= args.start < 50 and 1 <= args.count <= 50
    Suite(args).run()


if __name__ == '__main__':
    main()
