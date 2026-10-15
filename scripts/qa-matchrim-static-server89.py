"""Serve an explicit local candidate only while a bounded QA child runs."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess
import threading
from urllib.parse import unquote, urlparse

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--dist', type=Path, required=True)
p.add_argument('command', nargs=argparse.REMAINDER)
a = p.parse_args()
dist = a.dist.resolve(strict=True)
assert (dist / 'index.html').is_file()


class SPA(SimpleHTTPRequestHandler):
    def do_GET(self):
        file = (dist / unquote(urlparse(self.path).path).lstrip('/')).resolve()
        if not file.is_relative_to(dist):
            self.send_error(403)
            return
        if not file.is_file():
            self.path = '/index.html'
        super().do_GET()

    def log_message(self, *_):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SPA, directory=str(dist)))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
try:
    command = a.command[1:] if a.command[0] == '--' else a.command
    status = subprocess.call([*command, '--url', 'http://127.0.0.1:' + str(server.server_port)])
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)
raise SystemExit(status)
