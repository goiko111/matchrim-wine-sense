"""Reproducible Linux client gate: explicit runtime/browser/output and zero external app traffic."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime,timezone

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--output',type=Path,required=True)
p.add_argument('--browser',type=Path,help='Explicit Chromium executable; omitted uses Playwright installed browser')
p.add_argument('--python',default=sys.executable,help='Explicit Python with scripts/requirements-matchrim-cloud.txt installed')
p.add_argument('--memory-cycles',type=int,default=30)
p.add_argument('--production',action='store_true',help='Build and serve a local QA dist, never deploy')
a=p.parse_args()
if not 30<=a.memory_cycles<=300:p.error('--memory-cycles must be 30..300 (900-second harness cap)')
root=Path(__file__).resolve().parents[1];a.output=a.output.resolve();a.output.mkdir(parents=True,exist_ok=True)
browser_args=['--browser',str(a.browser.resolve(strict=True))] if a.browser else []
started=datetime.now(timezone.utc).isoformat();results=[]
env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','VITE_APP_ANALYTICS_ENABLED':'false','VITE_MATCHRIM_QA_FIXTURES':'false','VITE_SUPABASE_URL':'https://cbjynrbvrhcmpaojmqdp.matchrim-qa.invalid','VITE_SUPABASE_PUBLISHABLE_KEY':'qa-invalid-never-used-remotely','VITE_WINERIM_API_URL':'https://catalog.matchrim-qa.invalid'}
invalid=a.output/'runtime-inputs'/'synthetic-invalid.jpg';invalid.parent.mkdir(parents=True,exist_ok=True)
invalid.write_bytes(b'Synthetic malformed JPEG bytes for browser decode recovery. Not HEIC or owner photo evidence.\n')

def run(name,cmd):
    with (a.output/(name+'.log')).open('w') as log:
        status=subprocess.call(cmd,cwd=root,env=env,stdout=log,stderr=log)
    results.append({'name':name,'status':status,'passed':status==0})
    print(json.dumps(results[-1]),flush=True)
    save()
    return status

def save():
    (a.output/'gate.json').write_text(json.dumps({'scope':__doc__,'startedAt':started,'updatedAt':datetime.now(timezone.utc).isoformat(),'productionPreview':a.production,'memoryCyclesRequested':a.memory_cycles,'syntheticInvalidImageSha256':hashlib.sha256(invalid.read_bytes()).hexdigest(),'results':results},indent=2)+'\n')

# Prerequisites fail explicitly. No old Mac-only history/image check is certified.
run('contracts',['npm','run','test:cloud'])
run('test',['npm','test'])
run('typecheck',['npm','run','typecheck'])
run('lint',['npm','run','lint'])
if a.production:
    run('build',['npm','run','build'])
if any(not r['passed'] for r in results):raise SystemExit(1)
scenarios=[
    ('lifecycle','qa-matchrim-cloud-lifecycle.py',[]),
    ('menu-lifecycle','qa-matchrim-cloud-menu-lifecycle.py',[]),
    ('profile-lifecycle','qa-matchrim-cloud-profile-lifecycle.py',[]),
    ('layout','qa-matchrim-cloud-layout.py',[]),
    ('reading','qa-matchrim-cloud-reading.py',[]),
    ('overlay-dynamic','qa-matchrim-cloud-overlay-dynamic.py',[]),
    ('image-recovery','qa-matchrim-image-recovery-oct13.py',['--unsupported-image',str(invalid)]),
    ('identity','qa-matchrim-identity-notice-oct13.py',[]),
    ('memory','qa-matchrim-memory-oct13.py',['--seconds','900','--cycles',str(a.memory_cycles),'--gc-every','10','--bounded-waits','--dispose-chooser','--dispose-console','--clear-console']),
]
# Notifications use an explicit dev component page, excluded from dist.
if not a.production:scenarios.append(('notifications','qa-matchrim-notifications-oct13.py',[]))
for name,script,extra in scenarios:
    out=a.output/name
    command=[a.python,'scripts/qa-matchrim-local-server.py','--log',str(out/'server.log')]
    if a.production:command.append('--production')
    command+=['--',a.python,'scripts/'+script,'--url','http://127.0.0.1:4469','--output',str(out),*browser_args,*extra]
    run(name,command)
run('memory-regression',['node','scripts/check-matchrim-cloud-memory.mjs',str(a.output/'memory')])
raise SystemExit(1 if any(not r['passed'] for r in results) else 0)
