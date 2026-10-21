import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile

spec = importlib.util.spec_from_file_location('storage132', Path(__file__).with_name('matchrim-session132-storage.py'))
storage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(storage)
session = json.dumps({'user': {'email': 'info@winerim.com'}, 'access_token': 'synthetic', 'refresh_token': 'synthetic'})
schema = 'CREATE TABLE ItemTable (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB NOT NULL ON CONFLICT FAIL)'
with tempfile.TemporaryDirectory(prefix='matchrim132-mock-') as folder:
    root = Path(folder)
    root.chmod(0o700)
    for number, extra in enumerate([None, 'sb-cbjynrbvrhcmpaojmqdp-auth-token', 'unrelated-private-key']):
        directory = root / str(number)
        directory.mkdir(mode=0o700)
        database = directory / 'localstorage.sqlite3'
        connection = sqlite3.connect(database)
        connection.execute(schema)
        connection.execute('INSERT INTO ItemTable VALUES(?,?)', ('matchrim.local_profile_owner.v1', 'anonymous'.encode('utf-16-le')))
        if extra:
            connection.execute('INSERT INTO ItemTable VALUES(?,?)', (extra, b'synthetic'))
        connection.commit()
        connection.close()
        backup = directory / 'PRIVATE-GUEST-BACKUP.sqlite3'
        if extra:
            try:
                storage.seed(database, backup, session)
                raise RuntimeError('Existing or unrelated storage must not be overwritten')
            except AssertionError:
                assert not backup.exists()
        else:
            storage.seed(database, backup, session)
            assert backup.is_file() and backup.stat().st_mode & 0o777 == 0o600
            connection = sqlite3.connect(database)
            value = connection.execute('SELECT value FROM ItemTable WHERE key=?', ('sb-cbjynrbvrhcmpaojmqdp-auth-token',)).fetchone()[0]
            assert value.decode('utf-16-le') == session
            connection.close()
            connection = sqlite3.connect(backup)
            assert connection.execute('SELECT count(*) FROM ItemTable').fetchone()[0] == 1
            connection.close()
print('PASS session132 storage: own guest seeding, backup, existing-token and unrelated-key rejection; synthetic temporary databases only')
