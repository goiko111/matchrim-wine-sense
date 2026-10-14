"""Run one local-only QA command with Vite in the same Linux network namespace."""
import argparse
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--port', type=int, default=4469)
p.add_argument('--production', action='store_true', help='Serve the existing dist build with vite preview')
p.add_argument('--log', type=Path, required=True)
p.add_argument('command', nargs=argparse.REMAINDER)
a = p.parse_args()
if not 1024 <= a.port <= 65535 or not a.command:
    p.error('Use an unprivileged port and pass the QA command after --')
command = a.command[1:] if a.command[0] == '--' else a.command
root = Path(__file__).resolve().parents[1]
a.log.parent.mkdir(parents=True, exist_ok=True)
env = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1',
       'VITE_APP_ANALYTICS_ENABLED': 'false', 'VITE_MATCHRIM_QA_FIXTURES': 'false',
       'VITE_SUPABASE_URL': 'https://cbjynrbvrhcmpaojmqdp.matchrim-qa.invalid',
       'VITE_SUPABASE_PUBLISHABLE_KEY': 'qa-invalid-never-used-remotely',
       'VITE_MATCHRIM_SHARE_ORIGIN': 'https://matchrim-wine-sense.lovable.app',
       'VITE_WINERIM_API_URL': 'https://catalog.matchrim-qa.invalid'}
# QA commands must register HTTP and WS routes before creating/navigating pages.
# A synthetic hostname is defense in depth, not a substitute for interception.
with a.log.open('w') as log:
    server_args = ['node', 'node_modules/vite/bin/vite.js']
    if a.production:
        server_args.append('preview')
    server_args += ['--host', '127.0.0.1', '--port', str(a.port), '--strictPort']
    server = subprocess.Popen(server_args, cwd=root, env=env, stdout=log, stderr=log)
    try:
        for _ in range(200):
            if server.poll() is not None:
                raise RuntimeError('Local server exited; inspect the explicit log')
            try:
                urllib.request.urlopen(f'http://127.0.0.1:{a.port}', timeout=1)
                break
            except OSError:
                time.sleep(.1)
        else:
            raise RuntimeError('Local server unavailable after 20 seconds')
        sys.exit(subprocess.call(command, cwd=root, env=env))
    finally:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()
