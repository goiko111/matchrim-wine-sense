#!/usr/bin/env python3
"""Private, loopback-only QA95 sidecar. Never a proxy or a product server.

freeze --build FROZEN_DIR --out PRIVATE_NEW_DIR
serve --manifest MANIFEST --manifest-sha256 SHA --out PRIVATE_NEW_DIR
self-test --out PRIVATE_NEW_DIR

Only the three sibling QA95 harness sources and private evidence are authored by
this task. Native installation/build/simulator control belongs to the parent.
"""

import argparse
import ast
import base64
import copy
import hashlib
import html
from html.parser import HTMLParser
import http.client
from http.server import BaseHTTPRequestHandler, HTTPServer
import importlib.abc
import importlib.util
import json
import mimetypes
import os
from pathlib import Path
import re
import socket
import socketserver
import sys
import threading
import uuid
from urllib.parse import parse_qs, unquote, urlsplit

sys.dont_write_bytecode = True
REPO = Path('/Users/GOIKO/2matchrim76-recognition-20261008')
PRIVATE = Path('/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim95-eight-hours-20261017/native-synthetic95')
CLOSURE_PRIVATE = Path('/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim95-closure-20261018/native-D')
PRIVATE_ROOTS = (PRIVATE, CLOSURE_PRIVATE)
PROFILES = Path('/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim95-eight-hours-20261017/personas/synthetic-profiles.json')
PROFILES_SHA256 = '00061bd5b722b9e62f12337c64fc17cbf7342f93dd19e9a5623987b39c34272c'
SOURCE = REPO / 'scripts/qa-matchrim-consumer95-journeys.py'
BOOTSTRAP = REPO / 'scripts/matchrim95-native-synthetic-bootstrap.js'
BUNDLE = 'wine.matchrim.qa95synthetic'
SIMULATOR = 'B18822EF-BFBD-4A6A-89B2-33539BDE4127'
ORIGIN = 'http://127.0.0.1:4605'
BACKEND = 'cbjynrbvrhcmpaojmqdp.supabase.co'
REPRESENTATIVES = (0, 31, 32, 40, 49)
CSP = "; ".join(("default-src 'self'", "script-src 'self'", "connect-src 'self'",
    "img-src 'self' data: blob:", "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:", "worker-src 'none'", "frame-src 'none'",
    "object-src 'none'", "base-uri 'none'", "form-action 'self'",
    "frame-ancestors 'none'", "manifest-src 'self'"))


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return json.dumps(value, ensure_ascii=True, sort_keys=True, separators=(',', ':')).encode()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def private_path(value):
    path = Path(value).resolve()
    require(any(path.is_relative_to(root) and path != root for root in PRIVATE_ROOTS),
            'Evidence must be below an exact private QA95 directory')
    return path


def fresh_directory(value):
    path = private_path(value)
    path.mkdir(parents=True, mode=0o700, exist_ok=False)
    next(root for root in PRIVATE_ROOTS if path.is_relative_to(root)).chmod(0o700)
    path.chmod(0o700)
    return path


def save(path, value):
    path = private_path(path)
    with path.open('xb') as stream:
        stream.write(encoded(value) + b'\n')
    path.chmod(0o600)


def install_network_fence():
    # Also fences future edits to the imported transport. No DNS, subprocess,
    # external client sockets, or non-loopback listeners exist in this process.
    def audit(event, args):
        if event in ('socket.connect', 'socket.bind'):
            require(args[1] == ('127.0.0.1', 4605), 'QA95 network fence: only 127.0.0.1:4605')
        if event == 'socket.getaddrinfo':
            require(args[0] == '127.0.0.1' and args[1] == 4605, 'QA95 DNS forbidden')
        if event in ('socket.gethostbyname', 'socket.gethostbyaddr', 'socket.sendto',
                     'subprocess.Popen', 'os.system', 'os.posix_spawn'):
            raise PermissionError('QA95 external/child-process operation forbidden')
        if event == 'open':
            name, mode, flags = args
            if isinstance(name, (str, bytes, os.PathLike)) and flags & (os.O_WRONLY | os.O_RDWR | os.O_CREAT):
                target = Path(os.fsdecode(name)).resolve()
                require(any(target.is_relative_to(root) and target != root for root in PRIVATE_ROOTS),
                        'QA95 writes restricted to exact private evidence roots')
    sys.addaudithook(audit)


class TransportLoader(importlib.abc.Loader):
    """Reuse exact AST definitions without importing Playwright or its driver."""
    NAMES = {'BACKEND', 'AUTH_KEY', 'AXES', 'QUIZ_WEIGHTS', 'QUIZ_PROMPTS', 'RADIOS',
             'FIXED_TIME', 'PASSWORD', 'digest', 'oracle', 'make_session', 'wine', 'Transport'}

    def __init__(self, source):
        tree = ast.parse(source, filename=str(SOURCE))
        nodes = []
        found = set()
        for node in tree.body:
            names = ({node.name} if isinstance(node, (ast.FunctionDef, ast.ClassDef)) else
                     {t.id for t in node.targets if isinstance(t, ast.Name)} if isinstance(node, ast.Assign) else set())
            if names & self.NAMES:
                require(names <= self.NAMES, 'Unexpected combined transport assignment')
                nodes.append(node)
                found |= names
        require(found == self.NAMES, 'Transport source contract changed; review before repinning')
        imports = ast.parse('import base64, hashlib, json, math, mimetypes\nfrom pathlib import Path\nfrom urllib.parse import parse_qs, unquote, urlparse\n').body
        self.code = compile(ast.fix_missing_locations(ast.Module(body=imports + nodes, type_ignores=[])), str(SOURCE), 'exec')

    def create_module(self, spec):
        return None

    def exec_module(self, module):
        exec(self.code, module.__dict__)


def load_fixture(source_bytes, profile_bytes):
    require(sha(profile_bytes) == PROFILES_SHA256, 'Original immutable 20261017 profile fixture SHA256 required')
    loader = TransportLoader(source_bytes)
    spec = importlib.util.spec_from_loader('qa95_frozen_transport', loader)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    require(module.BACKEND == BACKEND, 'Unexpected backend mapping')
    profiles = json.loads(profile_bytes)
    require(len(profiles) == 50 and len({p['id'] for p in profiles}) == 50, 'Exactly 50 immutable profiles required')
    for profile in profiles:
        require(profile['synthetic'] is True and profile['realPerson'] is False, 'Synthetic profiles only')
        require(set(profile['answers'].values()) <= set(module.RADIOS), 'Unsupported quiz answer')
        require(module.oracle(profile['answers']) == profile['expectedQuiz'], 'Independent quiz oracle mismatch')
    return module, profiles


class GateIndex(HTMLParser):
    """Preserve HTML bytes except script start tags and first-head injection."""
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source, self.edits, self.heads, self.scripts = source, [], 0, 0
        self.lines = [0]
        for match in re.finditer('\n', source):
            self.lines.append(match.end())

    def handle_starttag(self, tag, attributes):
        line, column = self.getpos()
        offset = self.lines[line - 1] + column
        raw = self.get_starttag_text()
        attrs = dict(attributes)
        require(len(attrs) == len(attributes), 'Duplicate HTML attributes refused')
        if tag == 'head':
            self.heads += 1
            self.edits.append((offset + len(raw), offset + len(raw), '<script src="/__qa95/bootstrap.js"></script>'))
        if tag == 'script':
            require(self.heads == 1 and attrs.get('src'), 'Inline or pre-head scripts not supported')
            require(set(attrs) <= {'type', 'src', 'crossorigin', 'defer', 'async', 'integrity', 'nomodule'}, 'Unreviewed script attributes')
            require(attrs.get('type', 'text/javascript') in ('module', 'text/javascript'), 'Unreviewed script type')
            url = urlsplit(attrs['src'])
            require(not url.scheme and not url.netloc and attrs['src'].startswith('/assets/'), 'Only frozen local app scripts')
            rewritten = {'type': 'application/x-qa95-held', 'data-qa95-src': attrs.pop('src'),
                         'data-qa95-type': attrs.pop('type', 'text/javascript'), **attrs}
            text = '<script ' + ' '.join(f'{key}="{html.escape(value or "", quote=True)}"' for key, value in rewritten.items()) + '>'
            self.edits.append((offset, offset + len(raw), text))
            self.scripts += 1
        if tag == 'base' or (tag == 'meta' and attrs.get('http-equiv', '').lower() in ('refresh', 'content-security-policy')):
            raise ValueError('Base, refresh and competing CSP refused')

    def render(self):
        self.feed(self.source)
        self.close()
        require(self.heads == 1 and self.scripts > 0, 'Frozen index requires one head and app script')
        result = self.source
        for start, end, replacement in sorted(self.edits, reverse=True):
            result = result[:start] + replacement + result[end:]
        return result.encode()


def read_assets(build):
    require(build.is_dir() and not build.is_symlink(), 'Explicit frozen build directory required')
    assets = {}
    for path in sorted(build.rglob('*')):
        require(not path.is_symlink(), 'Symlinks forbidden in frozen build')
        if path.is_file():
            key = path.relative_to(build).as_posix()
            require(not key.startswith('__qa95/') and '\\' not in key, 'Reserved asset name')
            require(not any(part.startswith('.') for part in Path(key).parts), 'Hidden files are not frozen web assets')
            require(path.suffix.lower() not in ('.pem', '.key', '.p12', '.pfx', '.mobileprovision'), 'Credential material is not a frozen web asset')
            assets[key] = path.read_bytes()
    require('index.html' in assets, 'Missing frozen index')
    return assets


def freeze(build, out):
    assets = read_assets(build)
    source, profile_bytes, bootstrap = SOURCE.read_bytes(), PROFILES.read_bytes(), BOOTSTRAP.read_bytes()
    load_fixture(source, profile_bytes)
    served_index = GateIndex(assets['index.html'].decode()).render()
    manifest = {'schema': 'qa95-native-synthetic-v1', 'buildPath': str(build),
        'files': {key: sha(value) for key, value in assets.items()},
        'servedIndexSha256': sha(served_index), 'bootstrapSha256': sha(bootstrap),
        'transportSha256': sha(source), 'profilesSha256': sha(profile_bytes),
        'serverSha256': sha(Path(__file__).read_bytes()), 'profileCount': 50,
        'origin': ORIGIN, 'bundle': BUNDLE, 'scope': 'Synthetic transport and native UI only; no recognition/model/provider/auth/RLS claim'}
    save(out / 'manifest.json', manifest)
    return sha((out / 'manifest.json').read_bytes())


class FakeRequest:
    def __init__(self, path, method, headers, body):
        self.url = 'https://' + BACKEND + path
        self.method, self.headers = method, {k.lower(): v for k, v in headers.items()}
        self.post_data = body.decode() if body else None
        self.post_data_json = json.loads(body) if body else None
        self.resource_type = 'fetch'

    def is_navigation_request(self):
        return False


class FakeRoute:
    def __init__(self, request):
        self.request, self.result = request, None

    def fulfill(self, status=200, body='', headers=None, content_type='application/json'):
        require(self.result is None, 'Transport completed more than once')
        self.result = (status, body.encode() if isinstance(body, str) else body, headers or {}, content_type)

    def abort(self, unused='blockedbyclient'):
        self.fulfill(status=502, body=encoded({'error': 'Blocked/unmodeled synthetic request'}))


class Harness:
    def __init__(self, manifest_path, manifest_sha, out, limit=5):
        manifest_bytes = private_path(manifest_path).read_bytes()
        require(sha(manifest_bytes) == manifest_sha, 'Exact manifest SHA256 required')
        self.manifest = json.loads(manifest_bytes)
        m = self.manifest
        require(m['schema'] == 'qa95-native-synthetic-v1' and m['origin'] == ORIGIN and m['bundle'] == BUNDLE, 'Wrong QA95 manifest')
        require(sha(Path(__file__).read_bytes()) == m['serverSha256'], 'Server changed since freeze')
        self.assets = read_assets(Path(m['buildPath']))
        require({k: sha(v) for k, v in self.assets.items()} == m['files'], 'Frozen assets changed or file set differs')
        self.index = GateIndex(self.assets['index.html'].decode()).render()
        require(sha(self.index) == m['servedIndexSha256'], 'Served index transform changed')
        source, profile_bytes, self.bootstrap = SOURCE.read_bytes(), PROFILES.read_bytes(), BOOTSTRAP.read_bytes()
        for key, data in [('transportSha256', source), ('profilesSha256', profile_bytes), ('bootstrapSha256', self.bootstrap)]:
            require(sha(data) == m[key], key + ' changed; review and refreeze')
        self.module, self.profiles = load_fixture(source, profile_bytes)
        self.out, self.manifest_sha = out, manifest_sha
        self.run = str(uuid.uuid4())
        self.indices = list(range(50)) if limit == 50 else list(REPRESENTATIVES)
        self.active = None
        self.generation, self.transport = None, None
        self.receipts, self.blocks, self.storage, self.boots = [], [], {}, 0
        self.counter = 0
        save(out / 'run-contract.json', self.health())

    def record(self, value):
        self.counter += 1
        save(self.out / f'{self.counter:07d}.json', value)

    def health(self):
        return {'schema': 'qa95-native-synthetic-v1', 'origin': ORIGIN, 'bundle': BUNDLE,
            'ownedSimulator': SIMULATOR, 'run': self.run, 'manifestSha256': self.manifest_sha,
            'transportSha256': self.manifest['transportSha256'], 'profilesSha256': self.manifest['profilesSha256'],
            'profileCount': 50, 'indices': self.indices, 'sequentialOnly': True, 'externalForwardCount': 0}

    def select(self, payload):
        require(set(payload) == {'persona', 'reset'} and payload['reset'] is True, 'Explicit persona + reset:true required')
        index = payload['persona']
        require(type(index) is int and index in self.indices, 'Persona must be an enabled integer index 0..49')
        if self.transport is not None:
            self.record({'event': 'closed-persona', **self.receipt()})
        self.active, self.generation = index, str(uuid.uuid4())
        self.transport = self.module.Transport({}, 'http://frozen-assets.invalid', copy.deepcopy(self.profiles[index]), index, True, False)
        self.transport.native = True
        self.receipts, self.blocks, self.storage, self.boots = [], [], {}, 0
        self.record({'event': 'selection', 'persona': index, 'resetNonce': self.generation})
        return self.receipt()

    def config(self):
        require(self.transport is not None, 'POST /__qa95/select before app launch')
        return {'origin': ORIGIN, 'backend': 'https://' + BACKEND, 'bundle': BUNDLE,
            'persona': self.active, 'run': self.run, 'resetNonce': self.generation,
            'authKey': self.module.AUTH_KEY, 'initialSession': self.transport.sessions[0],
            'allowedTokens': [s['access_token'] for s in self.transport.sessions],
            'owner': self.transport.sessions[0]['user']['id']}

    def receipt(self):
        if self.transport is None:
            return {'selected': False}
        tr, persona = self.transport, self.profiles[self.active]
        uid = tr.sessions[0]['user']['id']
        quiz = [r for r in tr.tables['quiz_results'] if r.get('user_id') == uid]
        actual = [{axis: r.get(axis) for axis in self.module.AXES} for r in quiz]
        return {'selected': True, 'persona': self.active, 'profileId': persona['id'], 'resetNonce': self.generation,
            'currentOwner': tr.owner, 'primaryOwner': uid, 'secondaryOwner': tr.sessions[1]['user']['id'],
            'answers': persona['answers'], 'prompts': self.module.QUIZ_PROMPTS,
            'expectedQuiz': self.module.oracle(persona['answers']), 'quizResults': actual,
            'expectedQuizCount': 1, 'actualQuizCount': len(quiz),
            'quizReceiptMatches': len(quiz) == 1 and actual[0] == self.module.oracle(persona['answers']),
            'userWines': copy.deepcopy(tr.tables['user_wines']),
            'secondaryQuizCount': sum(r.get('user_id') == tr.sessions[1]['user']['id'] for r in tr.tables['quiz_results']),
            'requests': copy.deepcopy(self.receipts), 'blocked': self.blocks[:], 'storage': self.storage.copy(),
            'bootCount': self.boots, 'safetyErrors': tr.safety_errors[:], 'unmodeled': copy.deepcopy(tr.unmodeled),
            'externalForwardCount': 0}

    def backend(self, path, method, headers, body):
        require(self.transport is not None, 'No selected persona')
        require(headers.get('X-QA95-Run') == self.run and headers.get('X-QA95-Reset') == self.generation, 'Stale or missing QA95 context')
        require(headers.get('X-QA95-Persona') == str(self.active), 'Wrong persona context')
        require(method in ('GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'), 'Unsupported mock method')
        url = urlsplit(path)
        require(not url.scheme and not url.netloc and not url.fragment and '\\' not in path, 'No absolute backend URLs')
        require(url.path.startswith(('/rest/v1/', '/auth/v1/', '/functions/v1/')), 'Unmodeled namespace')
        require('..' not in unquote(url.path).split('/'), 'Traversal refused')
        payload = json.loads(body) if body else None
        tr = self.transport
        safe_headers = {k: v for k, v in headers.items() if k.lower() in ('accept', 'content-type', 'prefer', 'range', 'range-unit')}
        authorization = headers.get('Authorization', '')
        tokens = {'Bearer ' + s['access_token'] for s in tr.sessions}
        require(not authorization or authorization in tokens, 'Only invalid-signature synthetic bearer tokens accepted')
        if authorization:
            safe_headers['authorization'] = authorization
        if url.path.startswith('/auth/v1/'):
            endpoint = url.path.rsplit('/', 1)[-1]
            require(endpoint in ('token', 'logout', 'user', 'signup', 'recover'), 'Unmodeled auth operation')
            if isinstance(payload, dict):
                if 'email' in payload:
                    require(payload['email'] in {s['user']['email'] for s in tr.sessions}, 'Only the selected .invalid fixture accounts')
                if 'password' in payload:
                    require(payload['password'] == self.module.PASSWORD, 'Only the public synthetic password')
                if 'refresh_token' in payload:
                    require(payload['refresh_token'] in {s['refresh_token'] for s in tr.sessions}, 'Only synthetic refresh tokens')
            if endpoint == 'token':
                require(isinstance(payload, dict) and ('email' in payload or 'refresh_token' in payload), 'Explicit synthetic identity required')
        request = FakeRequest(path, method, safe_headers, body)
        route = FakeRoute(request)
        before = copy.deepcopy(tr.tables)
        before_owner = tr.owner
        uid = tr.uid_for_request(request)
        tr.route(route)
        require(route.result is not None, 'Mock did not complete request')
        status, response, unused, content_type = route.result
        table = url.path.rsplit('/', 1)[-1] if url.path.startswith('/rest/v1/') and method != 'OPTIONS' else None
        expected_owner = before_owner
        if status < 400 and url.path == '/auth/v1/logout':
            expected_owner = None
        if status < 400 and url.path == '/auth/v1/token':
            expected_session = next((s for s in tr.sessions if s['user']['email'] == (payload or {}).get('email')
                                     or s['refresh_token'] == (payload or {}).get('refresh_token')), None)
            expected_owner = expected_session['user']['id'] if expected_session else None
        counts = {'expectedResponses': 1, 'actualResponses': int(route.result is not None),
            'expectedOwner': expected_owner, 'actualOwner': tr.owner,
            'matches': expected_owner == tr.owner}
        if table in tr.tables:
            prior, after = before[table], tr.tables[table]
            actual_delta = len(after) - len(prior)
            returned = json.loads(response) if response else None
            actual_returned = len(returned) if isinstance(returned, list) else int(isinstance(returned, dict) and status < 400)
            # Expected effect is derived from the request and pre-request rows,
            # independently of Transport's returned mutation receipt.
            query = parse_qs(url.query)
            def matches(row):
                if row.get('user_id', uid) != uid or (table == 'profiles' and row.get('id') != uid):
                    return False
                for field, values in query.items():
                    for value in values:
                        actual_value = str(row.get(field)).lower() if row.get(field) is not None else 'null'
                        if value.startswith('eq.') and actual_value != value[3:].lower():
                            return False
                        if value == 'not.is.null' and row.get(field) is None or value == 'is.null' and row.get(field) is not None:
                            return False
                return True
            expected_selected = sum(matches(row) for row in prior)
            if method == 'POST':
                expected_selected = len(payload) if isinstance(payload, list) else 1
            successful = status < 400
            expected_delta = (expected_selected if method == 'POST' else -expected_selected if method == 'DELETE' else 0) if successful else 0
            expected_returned = expected_selected
            if method != 'POST':
                expected_returned = max(0, expected_returned - int(query.get('offset', ['0'])[0]))
                expected_returned = min(expected_returned, int(query.get('limit', [str(expected_returned)])[0]))
            if 'vnd.pgrst.object' in request.headers.get('accept', ''):
                expected_returned = min(1, expected_returned)
            if method == 'HEAD' or not successful:
                expected_returned = 0
            foreign_before = [r for r in prior if r.get('user_id', uid) != uid]
            foreign_after = [r for r in after if r.get('user_id', uid) != uid]
            counts.update({'before': len(prior), 'after': len(after), 'expectedDelta': expected_delta,
                'actualDelta': actual_delta, 'expectedReturned': expected_returned, 'actualReturned': actual_returned,
                'foreignRowsUnchanged': foreign_before == foreign_after,
                'matches': counts['matches'] and expected_delta == actual_delta and expected_returned == actual_returned and foreign_before == foreign_after})
        receipt = {'sequence': len(self.receipts) + 1, 'method': method, 'path': url.path,
            'requestBodySha256': sha(body), 'status': status, 'counts': counts,
            'responseBodySha256': sha(response), 'owner': uid, 'disposition': tr.events[-1]['disposition']}
        self.receipts.append(receipt)
        self.record({'event': 'synthetic-request', 'persona': self.active, **receipt})
        # Never reuse the transport's wildcard CORS headers.
        exposed = {k: v for k, v in unused.items() if k.lower() == 'content-range'}
        return status, response, exposed, content_type


class Handler(BaseHTTPRequestHandler):
    server_version = 'QA95Synthetic/1'
    protocol_version = 'HTTP/1.0'

    def log_message(self, *unused):
        pass

    def respond(self, status, body, content_type='application/json', extra=None):
        self.send_response(status)
        for key, value in {'Content-Type': content_type, 'Content-Length': str(len(body)),
            'Content-Security-Policy': CSP, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()', **(extra or {})}.items():
            self.send_header(key, value)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def handle_request(self):
        h = self.server.harness
        path = ''
        try:
            require(self.client_address[0] == '127.0.0.1', 'Loopback clients only')
            require(self.headers.get_all('Host') == ['127.0.0.1:4605'], 'Exact loopback Host required')
            require(self.headers.get('Origin', ORIGIN) == ORIGIN, 'Cross-origin control blocked')
            require(self.headers.get('Sec-Fetch-Site', 'none') != 'cross-site', 'Cross-site request refused')
            url = urlsplit(self.path)
            require(not url.scheme and not url.netloc and not url.fragment, 'Absolute request targets refused')
            path = unquote(url.path)
            require(path.startswith('/') and '..' not in path.split('/') and '\\' not in path and '\x00' not in path, 'Unsafe path')
            require(not self.headers.get('Transfer-Encoding'), 'Chunked control bodies not supported')
            lengths = self.headers.get_all('Content-Length') or ['0']
            require(len(lengths) == 1 and lengths[0].isdigit() and int(lengths[0]) <= 1048576, 'Invalid body length')
            body = self.rfile.read(int(lengths[0]))
            require(len(body) == int(lengths[0]), 'Truncated body')
            result = self.dispatch(h, path, url.query, body)
            status, data, headers, content_type = result
            h.record({'event': 'http', 'method': self.command, 'path': path, 'status': status,
                      'servedSha256': sha(data), 'bytes': len(data)})
            self.respond(status, data, content_type, headers)
        except Exception as error:
            # No payload, credentials, full URL, query, or header is persisted.
            h.record({'event': 'denied', 'method': self.command, 'pathSha256': sha(path.encode()), 'reason': str(error)[:200]})
            self.respond(403, encoded({'error': 'QA95 fail-closed request rejected'}))

    def dispatch(self, h, path, query, body):
        def result(value, status=200):
            return status, encoded(value), {}, 'application/json'
        if path == '/__qa95/health' and self.command == 'GET':
            return result(h.health())
        if path == '/__qa95/select' and self.command == 'POST':
            require(self.headers.get('X-QA95-Control') == BUNDLE, 'Explicit QA95 control header required')
            return result(h.select(json.loads(body)))
        if path == '/__qa95/state' and self.command == 'GET':
            return result(h.receipt())
        if path == '/__qa95/fault' and self.command == 'POST':
            require(self.headers.get('X-QA95-Control') == BUNDLE and h.transport is not None, 'Explicit selected QA95 control required')
            payload = json.loads(body)
            require(set(payload) == {'fault', 'enabled'} and payload['fault'] in ('login', 'user_wines') and type(payload['enabled']) is bool, 'Only controlled login/cellar faults')
            h.transport.failure = payload['fault'] if payload['enabled'] else None
            h.record({'event': 'fault', 'persona': h.active, **payload})
            return result({'ok': True})
        if path == '/__qa95/bootstrap.js' and self.command in ('GET', 'HEAD'):
            marker = b'/*__QA95_CONFIGURATION__*/ null'
            require(h.bootstrap.count(marker) == 1, 'Missing bootstrap configuration sentinel')
            return 200, h.bootstrap.replace(marker, encoded(h.config())), {}, 'text/javascript'
        if path in ('/__qa95/boot', '/__qa95/storage', '/__qa95/blocked') and self.command == 'POST':
            require(self.headers.get('X-QA95-Run') == h.run and self.headers.get('X-QA95-Reset') == h.generation, 'Stale diagnostic context')
            payload = json.loads(body)
            if path == '/__qa95/boot':
                require(set(payload) == {'persona', 'storageReset'} and payload['persona'] == h.active and type(payload['storageReset']) is bool, 'Invalid boot diagnostic')
                h.boots += 1
            elif path == '/__qa95/storage':
                require(set(payload) == {'quizResultPresent', 'quizAnswersPresent', 'scanHistoryPresent', 'authPresent'}, 'Only cache presence diagnostics')
                require(all(type(v) is bool for v in payload.values()), 'Only boolean diagnostics')
                h.storage = payload
            else:
                require(set(payload) == {'kind'} and payload['kind'] in ('fetch', 'xhr', 'beacon', 'websocket', 'eventsource', 'worker', 'webrtc', 'navigation', 'csp', 'bootstrap'), 'Only classified block counts')
                h.blocks.append(payload['kind'])
            h.record({'event': path.rsplit('/', 1)[-1], 'persona': h.active, **payload})
            return result({'ok': True})
        if path.startswith('/__qa95/backend/'):
            return h.backend(path[len('/__qa95/backend'):]+('?' + query if query else ''), self.command, self.headers, body)
        require(not path.startswith('/__qa95/'), 'Unknown QA95 endpoint')
        require(self.command in ('GET', 'HEAD') and not body, 'No asset mutation')
        require(h.active is not None, 'Select a persona before loading the app')
        key = path.lstrip('/')
        if key in h.assets and key != 'index.html':
            return 200, h.assets[key], {}, mimetypes.guess_type(key)[0] or 'application/octet-stream'
        navigation = self.headers.get('Sec-Fetch-Dest') == 'document' or 'text/html' in self.headers.get('Accept', '')
        if path in ('/', '/index.html') or navigation and not Path(path).suffix:
            return 200, h.index, {}, 'text/html; charset=utf-8'
        return 404, b'Frozen QA95 asset not found', {}, 'text/plain'

    do_GET = do_HEAD = do_POST = do_PATCH = do_DELETE = do_OPTIONS = do_PUT = do_CONNECT = do_TRACE = handle_request


class LoopbackServer(HTTPServer):
    def server_bind(self):
        # HTTPServer's default bind does reverse DNS even for a numeric host.
        socketserver.TCPServer.server_bind(self)
        self.server_name, self.server_port = '127.0.0.1', 4605

    def get_request(self):
        client, address = super().get_request()
        client.settimeout(5)
        return client, address


def make_server(harness):
    server = LoopbackServer(('127.0.0.1', 4605), Handler)
    server.harness = harness
    server.timeout = 2
    return server


def self_test(out):
    build = out / 'fixture-build'
    (build / 'assets').mkdir(parents=True)
    (build / 'index.html').write_bytes(b'<!doctype html><html><head><script type="module" src="/assets/main.js"></script></head><body><div id="root"></div></body></html>')
    (build / 'assets/main.js').write_bytes(b'/* inert frozen fixture, not the product */')
    frozen = out / 'freeze'
    frozen.mkdir()
    digest = freeze(build, frozen)
    evidence = out / 'http'
    evidence.mkdir()
    h = Harness(frozen / 'manifest.json', digest, evidence, 50)
    server = make_server(h)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    tests = []
    def request(method, path, payload=None, headers=None):
        conn = http.client.HTTPConnection('127.0.0.1', 4605, timeout=5)
        try:
            conn.request(method, path, body=encoded(payload) if payload is not None else None,
                         headers={'Content-Type': 'application/json', **(headers or {})})
            response = conn.getresponse()
            data, response_headers = response.read(), dict(response.getheaders())
            return response.status, data, response_headers
        finally:
            conn.close()
    def check(name, condition):
        require(condition, 'Self-test failed: ' + name)
        tests.append(name)
    try:
        check('unselected index denied', request('GET', '/')[0] == 403)
        check('strict host', request('GET', '/__qa95/health', headers={'Host': 'localhost:4605'})[0] == 403)
        check('cross-origin denied', request('POST', '/__qa95/select', {'persona': 0, 'reset': True}, {'Origin': 'https://outside.invalid'})[0] == 403)
        for value in [-1, 50, True, '0']:
            check('invalid persona ' + repr(value), request('POST', '/__qa95/select', {'persona': value, 'reset': True}, {'X-QA95-Control': BUNDLE})[0] == 403)
        check('no asset mutation', request('POST', '/assets/main.js', {})[0] == 403)
        check('no absolute proxy', request('GET', 'https://outside.invalid/a')[0] == 403)
        for index in range(50):
            selected = request('POST', '/__qa95/select', {'persona': index, 'reset': True}, {'X-QA95-Control': BUNDLE})
            require(selected[0] == 200, 'Selection failed')
            tr = h.transport
            headers = {'X-QA95-Run': h.run, 'X-QA95-Reset': h.generation,
                'X-QA95-Persona': str(index), 'Authorization': 'Bearer ' + tr.sessions[0]['access_token']}
            expected = h.module.oracle(h.profiles[index]['answers'])
            payload = {'user_id': tr.owner, **expected}
            status, data, unused = request('POST', '/__qa95/backend/rest/v1/quiz_results', payload, headers)
            check(f'persona {index}: oracle backend receipt', status == 200 and h.receipt()['quizReceiptMatches'])
            foreign = tr.sessions[1]['user']['id']
            check(f'persona {index}: foreign query empty', json.loads(request('GET', '/__qa95/backend/rest/v1/user_wines?user_id=eq.' + foreign, headers=headers)[1]) == [])
            check(f'persona {index}: foreign insert blocked', request('POST', '/__qa95/backend/rest/v1/quiz_results', {'user_id': foreign, **expected}, headers)[0] == 502)
            check(f'persona {index}: counts match', all(r['counts'] is None or r['counts']['matches'] for r in h.receipts))
        status, data, headers = request('GET', '/')
        check('held bundles before bootstrap', status == 200 and data.index(b'/__qa95/bootstrap.js') < data.index(b'application/x-qa95-held'))
        check('strict CSP no external connect', headers['Content-Security-Policy'] == CSP and "connect-src 'self'" in CSP)
        check('byte exact asset', request('GET', '/assets/main.js')[1] == h.assets['assets/main.js'])
        check('missing asset no SPA fallthrough', request('GET', '/assets/missing.js')[0] == 404)
        check('traversal denied', request('GET', '/%2e%2e/secrets')[0] == 403)
        check('stale reset rejected', request('GET', '/__qa95/backend/rest/v1/user_wines', headers={'X-QA95-Run': h.run, 'X-QA95-Reset': 'stale', 'X-QA95-Persona': str(h.active)})[0] == 403)
        check('no transport unknown fallback', request('GET', '/__qa95/backend/provider/raw', headers={'X-QA95-Run': h.run, 'X-QA95-Reset': h.generation, 'X-QA95-Persona': str(h.active)})[0] == 403)
        headers = {'X-QA95-Run': h.run, 'X-QA95-Reset': h.generation, 'X-QA95-Persona': str(h.active),
                   'Authorization': 'Bearer ' + h.transport.sessions[0]['access_token']}
        owner_wine = next(w for w in h.transport.own_wines() if w['status'] == 'collection')
        check('controlled cellar fault enabled', request('POST', '/__qa95/fault', {'fault': 'user_wines', 'enabled': True}, {'X-QA95-Control': BUNDLE})[0] == 200)
        check('failed cellar mutation has exact unchanged receipt', request('PATCH', '/__qa95/backend/rest/v1/user_wines?id=eq.' + owner_wine['id'], {'is_favorite': True}, headers)[0] == 503 and owner_wine['is_favorite'] is False and h.receipts[-1]['counts']['matches'])
        check('controlled fault disabled', request('POST', '/__qa95/fault', {'fault': 'user_wines', 'enabled': False}, {'X-QA95-Control': BUNDLE})[0] == 200)
        check('logout receipt', request('POST', '/__qa95/backend/auth/v1/logout', {}, headers)[0] == 200 and h.transport.owner is None)
        request('POST', '/__qa95/fault', {'fault': 'login', 'enabled': True}, {'X-QA95-Control': BUNDLE})
        login = {'email': h.transport.sessions[1]['user']['email'], 'password': h.module.PASSWORD}
        check('controlled invalid login remains signed out', request('POST', '/__qa95/backend/auth/v1/token?grant_type=password', login, headers)[0] == 400 and h.transport.owner is None and h.receipts[-1]['counts']['matches'])
        request('POST', '/__qa95/fault', {'fault': 'login', 'enabled': False}, {'X-QA95-Control': BUNDLE})
        check('second synthetic account login', request('POST', '/__qa95/backend/auth/v1/token?grant_type=password', login, headers)[0] == 200 and h.transport.owner == h.transport.sessions[1]['user']['id'])
        check('real-email dummy blocked before adapter', request('POST', '/__qa95/backend/auth/v1/token', {'email': 'not-a-person@example.com', 'password': h.module.PASSWORD}, headers)[0] == 403)
        check('non-synthetic dummy bearer blocked before adapter', request('GET', '/__qa95/backend/rest/v1/user_wines', headers={**headers, 'Authorization': 'Bearer DUMMY-NOT-A-TOKEN'})[0] == 403)
        check('mock OPTIONS is in memory', request('OPTIONS', '/__qa95/backend/rest/v1/user_wines', headers=headers)[0] == 200 and h.receipts[-1]['counts']['matches'])
        try:
            Harness(frozen / 'manifest.json', '0' * 64, evidence, 50)
            raise AssertionError('Wrong manifest pin accepted')
        except ValueError:
            tests.append('wrong manifest pin refused')
        (build / 'assets/main.js').write_bytes(b'tampered private fixture')
        try:
            Harness(frozen / 'manifest.json', digest, evidence, 50)
            raise AssertionError('Tampered frozen asset accepted')
        except ValueError:
            tests.append('tampered frozen asset refused')
        finally:
            (build / 'assets/main.js').write_bytes(h.assets['assets/main.js'])
        for address in [('192.0.2.1', 443), ('127.0.0.1', 4606)]:
            sock = socket.socket()
            try:
                try:
                    sock.connect(address)
                    raise AssertionError('Fence unexpectedly allowed connection')
                except ValueError:
                    tests.append('network fence ' + repr(address))
            finally:
                sock.close()
        check('external forwarding absent', h.health()['externalForwardCount'] == 0)
        result = {'status': 'PASS', 'tests': tests, 'profileCount': 50,
            'scope': 'Controlled HTTP and fake request adapter only; no app, simulator, model or real provider run',
            'manifestSha256': digest, 'profilesSha256': h.manifest['profilesSha256'],
            'transportSha256': h.manifest['transportSha256']}
        save(out / 'self-test.json', result)
        print(json.dumps({'status': 'PASS', 'checks': len(tests), 'evidence': str(out)}))
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()


def main():
    os.umask(0o077)
    install_network_fence()
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    f = commands.add_parser('freeze')
    f.add_argument('--build', required=True, type=Path)
    f.add_argument('--out', required=True)
    s = commands.add_parser('serve')
    s.add_argument('--manifest', required=True, type=Path)
    s.add_argument('--manifest-sha256', required=True)
    s.add_argument('--out', required=True)
    s.add_argument('--limit-profiles', type=int, choices=(5, 50), default=5)
    t = commands.add_parser('self-test')
    t.add_argument('--out', required=True)
    args = parser.parse_args()
    out = fresh_directory(args.out)
    if args.command == 'freeze':
        print(json.dumps({'manifest': str(out / 'manifest.json'), 'sha256': freeze(args.build.resolve(), out)}))
    elif args.command == 'self-test':
        self_test(out)
    else:
        h = Harness(args.manifest, args.manifest_sha256, out, args.limit_profiles)
        server = make_server(h)
        print(json.dumps(h.health()), flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            h.record({'event': 'shutdown', **h.receipt()})
            server.server_close()


if __name__ == '__main__':
    main()
