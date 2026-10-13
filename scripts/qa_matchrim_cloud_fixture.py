"""Safe public-pixel/recorded-payload client fixture, registered before navigation."""
import ast
import base64
import hashlib
import json
import re
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[1]
PHOTO=ROOT/'qa-fixtures/food-menu/commons-restaurant-menu-2026-08-25-2000.jpg'
CONTRACT=ROOT/'scripts/qa-multi-wine-ui.py'
PHOTO_HASH='9980c5e6b9d5e52f1783e2f26d1a97e22c0c2e1556e9e72919dd26fc34ece9a9'
CONTRACT_HASH='f2aa2924e48c8c2f6f0cbe45011e6ef92bda3cb17be14a645659b70a0343ae40'
AUTH='sb-cbjynrbvrhcmpaojmqdp-auth-token'
OWNER='00000000-0000-4000-8000-000000000080'
SOURCE_PATHS=['src/components/wine-import/MultiWineLabelScanner.tsx','src/components/wine-import/WineMenuScanner.tsx','src/utils/imageAnalysis.ts','src/components/wine-import/WineComparisonWorkspace.tsx','src/index.css','src/pages/Scan.tsx','src/utils/screenOverlayPins.ts','src/hooks/useOverlayViewport.ts']
SOURCE_HASHES={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in SOURCE_PATHS}

def label_payloads():
    assert hashlib.sha256(PHOTO.read_bytes()).hexdigest()==PHOTO_HASH
    assert hashlib.sha256(CONTRACT.read_bytes()).hexdigest()==CONTRACT_HASH
    scope={}; tree=ast.parse(CONTRACT.read_text())
    exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['candidate','function_response']],type_ignores=[]),str(CONTRACT),'exec'),scope)
    return {'detect':scope['function_response']('detect-wine-regions',SimpleNamespace(post_data_json={})), 'analyze':{rid:scope['function_response']('analyze-wine-region',SimpleNamespace(post_data_json={'region_id':rid})) for rid in ['region-1','region-2','region-3','region-4','region-5']}}

def fake_session(owner=OWNER):
    enc=lambda v:base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
    user={'id':owner,'aud':'authenticated','role':'authenticated','email':'qa@matchrim.invalid','app_metadata':{'provider':'email'},'user_metadata':{}}
    return {'user':user,'access_token':enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':owner,'exp':1900000000})+'.'+enc('synthetic-invalid'),'refresh_token':'synthetic-invalid','expires_at':1900000000,'expires_in':86400,'token_type':'bearer'}

class ClientFixture:
    def __init__(self,browser,url,**options):
        parsed=urlparse(url)
        assert parsed.scheme=='http' and parsed.hostname in ['127.0.0.1','localhost','::1']
        self.url=url; self.origin=parsed.netloc; self.responses=label_payloads()
        menu_path=ROOT/'qa/fixtures/menu-food-evidence-oct8.json'
        self.menu=json.loads(menu_path.read_text())['cases'][0]['calls']
        self.provenance={'publicPhotoSha256':PHOTO_HASH,'labelPayloadContractSha256':CONTRACT_HASH,'menuPayloadSha256':hashlib.sha256(menu_path.read_bytes()).hexdigest(),'profile':None,'catalog':[],'sourceHashes':SOURCE_HASHES,'scope':'UI on public food-menu pixels with old intercepted wine payloads; not recognition'}
        self.owner=OWNER;self.profile_mode='missing';self.profile_held=[]
        self.seen=[];self.handled=[];self.sockets=[];self.requests=[];self.errors=[];self.unexpected=[]
        self.context=browser.new_context(service_workers='block',reduced_motion='reduce',**options)
        self.context.route('**/*',self.intercept)
        self.context.route_web_socket('**/*',self.socket)
        self.context.on('request',lambda req:self.seen.append(req.url) if urlparse(req.url).netloc!=self.origin else None)
        seed={AUTH:json.dumps(fake_session()),'matchrim.scan_privacy_notice.v2':'accepted','matchrim.local_profile_owner.v1':OWNER,'matchrim.onboarding.v2:'+OWNER:json.dumps({'version':2,'result':'skipped'})}
        self.context.add_init_script("for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);"%json.dumps(seed))
    def mobile_surface(self):
        self.context.add_init_script("window.CapacitorCustomPlatform={name:'ios'}")
    def reply(self,route,payload):
        route.fulfill(status=200,content_type='application/json',body=json.dumps(payload),headers={'Access-Control-Allow-Origin':'*'})
    def intercept(self,route):
        req=route.request;u=urlparse(req.url)
        if u.scheme=='http' and u.netloc==self.origin:return route.continue_()
        self.handled.append(req.url)
        body=req.post_data_json if req.method=='POST' and req.post_data else {}
        row={'method':req.method,'path':u.path}
        if isinstance(body,dict):row['imageSha256']=hashlib.sha256(body['image'].encode()).hexdigest() if isinstance(body.get('image'),str) else None
        self.requests.append(row)
        if req.method in ['PUT','PATCH','DELETE'] or (req.method=='POST' and '/rest/v1/' in u.path):
            self.unexpected.append(row);return route.abort('blockedbyclient')
        if '/auth/v1/user' in u.path:return self.reply(route,fake_session(self.owner)['user'])
        if '/rest/v1/quiz_results' in u.path:
            if self.profile_mode=='held':self.profile_held.append(route);return
            if self.profile_mode=='error':return route.fulfill(status=503,content_type='application/json',body=json.dumps({'error':'Synthetic profile read unavailable'}))
            return self.reply(route,None)
        endpoint=re.sub(r'-v\d+$','',u.path.rstrip('/').split('/')[-1])
        if '/functions/v1/' in u.path:
            if endpoint=='detect-wine-regions':return self.reply(route,self.responses['detect'])
            if endpoint=='analyze-wine-region':return self.reply(route,self.responses['analyze'][body['region_id']])
            if endpoint=='search-wines':return self.reply(route,{'wines':[]})
            if endpoint=='scan-wine-menu':
                tile=body.get('scan_region',{}).get('id','full')
                return self.reply(route,next((c['payload'] for c in self.menu if c['scan_region']['id']==tile),{'vinos':[]}))
            self.unexpected.append(row);return route.abort('blockedbyclient')
        if '/rest/v1/' in u.path and req.method=='GET':return self.reply(route,[])
        if req.method=='OPTIONS':return self.reply(route,{})
        self.unexpected.append(row);return route.abort('blockedbyclient')
    def socket(self,ws):
        u=urlparse(ws.url);local=u.scheme=='ws' and u.netloc==self.origin
        self.sockets.append({'local':local,'blocked':not local})
        if local:ws.connect_to_server()
        else:ws.close(code=1008,reason='Local-only Matchrim client QA')
    def page(self):
        page=self.context.new_page();page.set_default_timeout(10000)
        page.on('pageerror',lambda error:self.errors.append(str(error)))
        return page
    def finish(self):
        return {'provenance':self.provenance,'requests':self.requests,'sockets':self.sockets,'externalIntercepted':sorted(self.seen)==sorted(self.handled),'unexpected':self.unexpected,'runtimeErrors':self.errors,'sourcesUnchanged':all(hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==expected for name,expected in SOURCE_HASHES.items())}
