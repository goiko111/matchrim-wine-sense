import json
import os
from pathlib import Path
import sqlite3
import sys


def require(condition):
    if not condition:
        raise ValueError('SESSION132_STORAGE_HOLD')


def seed(database, backup, value):
    database = Path(database)
    backup = Path(backup)
    require(database.name == 'localstorage.sqlite3' and database.is_file())
    require(not database.is_symlink() and not backup.exists())
    require(backup.parent.is_dir() and backup.parent.stat().st_mode & 0o777 == 0o700)
    session = json.loads(value)
    require(session['user']['email'] == 'info@winerim.com')
    require(isinstance(session['access_token'], str) and isinstance(session['refresh_token'], str))
    connection = sqlite3.connect(database, timeout=2)
    try:
        rows = dict(connection.execute('SELECT key,value FROM ItemTable'))
        require(set(rows) <= {'matchrim.local_profile_owner.v1', 'matchrim.scan_privacy_notice.openai-local.v4'})
        require(rows.get('matchrim.local_profile_owner.v1') == 'anonymous'.encode('utf-16-le'))
        require(connection.execute("SELECT sql FROM sqlite_master WHERE name='ItemTable'").fetchone()[0] == (
            'CREATE TABLE ItemTable (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB NOT NULL ON CONFLICT FAIL)'))
        target = sqlite3.connect(backup)
        try:
            connection.backup(target)
        finally:
            target.close()
        os.chmod(backup, 0o600)
        # Seed only the legitimate QA session, never a quiz/profile or an identity result.
        connection.execute('INSERT INTO ItemTable(key,value) VALUES(?,?)', (
            'sb-cbjynrbvrhcmpaojmqdp-auth-token', value.encode('utf-16-le')))
        connection.commit()
        require(connection.execute('SELECT count(*) FROM ItemTable').fetchone()[0] == len(rows) + 1)
    finally:
        connection.close()


if __name__ == '__main__':
    try:
        require(len(sys.argv) == 3)
        seed(sys.argv[1], sys.argv[2], sys.stdin.read())
        print('SESSION132_OWN_QA_GUEST_STORE_SEEDED')
    except Exception:
        print('SESSION132_STORAGE_HOLD', file=sys.stderr)
        sys.exit(1)
