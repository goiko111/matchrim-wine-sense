"""Human-run, one-shot existing-QA login. Never stores or prints the password."""

import base64
import getpass
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import time
import urllib.error
import urllib.request
import warnings

ORIGIN = "https://cbjynrbvrhcmpaojmqdp.supabase.co"
EMAIL = "info@winerim.com"
USER_HASH = "dec0ce2e36d7642a3704f666fdbafa68e9aaabee17f077ef5a0ede86eea19c05"
PRIVATE = Path.home() / "Library/Application Support/Matchrim QA/session255"


def validate_session(session, expected_hash=USER_HASH):
    user = session.get("user", {})
    assert user.get("email") == EMAIL and user.get("is_anonymous") is not True
    assert session.get("is_anonymous") is not True
    assert hashlib.sha256(user.get("id", "").encode()).hexdigest() == expected_hash
    pieces = session.get("access_token", "").split(".")
    assert len(pieces) == 3
    claims = json.loads(base64.urlsafe_b64decode(pieces[1] + "=" * (-len(pieces[1]) % 4)))
    assert claims.get("sub") == user["id"] and claims.get("role") == "authenticated"
    assert claims.get("iss") == ORIGIN + "/auth/v1"
    assert claims.get("exp", 0) > time.time() + 120
    assert isinstance(session.get("refresh_token"), str) and len(session["refresh_token"]) >= 8
    return {"userIdSHA256": expected_hash, "expiresAt": claims["exp"]}


def save(name, value):
    file = PRIVATE / name
    fd = os.open(file, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        os.write(fd, (json.dumps(value) + "\n").encode())
        os.fsync(fd)
    finally:
        os.close(fd)
    directory = os.open(PRIVATE, os.O_RDONLY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)


class NoRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def main():
    assert sys.stdin.isatty() and sys.stderr.isatty(), "INTERACTIVE_TERMINAL_REQUIRED"
    repo = Path(__file__).resolve().parent.parent
    config = json.loads(subprocess.check_output(["node", "-e",
        "process.loadEnvFile('.env');process.stdout.write(JSON.stringify({url:process.env.VITE_SUPABASE_URL,key:process.env.VITE_SUPABASE_PUBLISHABLE_KEY}))"],
        cwd=repo, timeout=5, text=True))
    assert config.get("url") == ORIGIN and isinstance(config.get("key"), str)
    assert len(config["key"]) > 30
    for directory in [PRIVATE.parent, PRIVATE]:
        directory.mkdir(mode=0o700, exist_ok=True)
        info = directory.lstat()
        assert stat.S_ISDIR(info.st_mode) and stat.S_IMODE(info.st_mode) == 0o700
        assert info.st_uid == os.getuid()
    assert not any((PRIVATE / name).exists() for name in ["AUTH-STARTED.json", "PRIVATE-SESSION.json", "RESULT.json"]), "EXISTING_LOGIN_NO_RETRY"
    print("Matchrim QA - " + EMAIL)
    print("Solo inicio de sesion: 0 consultas de catalogo, 0 IA. La contrasena no se guarda.")
    with warnings.catch_warnings():
        warnings.simplefilter("error", getpass.GetPassWarning)
        password = getpass.getpass("Contrasena de esta cuenta QA (no se mostrara): ")
    assert 1 <= len(password) <= 1024 and not any(ord(char) < 32 or ord(char) == 127 for char in password)
    request = urllib.request.Request(ORIGIN + "/auth/v1/token?grant_type=password", method="POST",
        headers={"apikey": config["key"], "Content-Type": "application/json", "Accept": "application/json"},
        data=json.dumps({"email": EMAIL, "password": password}).encode())
    save("AUTH-STARTED.json", {"atUTC": time.time(), "maximumSubmissions": 1,
                              "catalogueReads": 0, "additionalEUR": 0})
    result = {"passed": False, "authSubmissions": 1, "catalogueReads": 0,
              "passwordStored": False, "additionalEUR": 0}
    try:
        opener = urllib.request.build_opener(NoRedirects)
        with opener.open(request, timeout=20) as response:
            result["authHTTP"] = response.status
            assert response.status == 200 and response.geturl() == request.full_url
            assert response.headers.get_content_type() == "application/json"
            raw = response.read(65537)
            assert len(raw) <= 65536
            assert password not in raw.decode("utf8")
            session = json.loads(raw)
        result.update(validate_session(session))
        save("PRIVATE-SESSION.json", session)
        result["passed"] = True
    except urllib.error.HTTPError as error:
        result["authHTTP"] = error.code
        error.close()
    except Exception:
        result["reason"] = "PRIVATE_AUTH_OR_VALIDATION_HOLD"
    finally:
        password = ""
        save("RESULT.json", result)
    print("SESION_QA_GUARDADA" if result["passed"] else "NO_VALIDADO: no se reintenta ni se consulta el catalogo.")
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (Exception, KeyboardInterrupt):
        print("QA255_PREFLIGHT_HOLD: sin detalles privados.", file=sys.stderr)
        sys.exit(1)
