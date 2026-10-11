"""Local bottom-navigation text/targets/order/routes/safe-space QA, with remote traffic intercepted."""
import argparse
import base64
import json
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4441')
p.add_argument('--output', type=Path, required=True)
p.add_argument('--cases')
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
UID = '00000000-0000-4000-8000-000000000080'
enc = lambda v: base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
user = {'id': UID, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa@matchrim.invalid', 'app_metadata': {'provider': 'email'}, 'user_metadata': {}}
session = {'user': user, 'access_token': enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': UID, 'exp': 1900000000}) + '.' + enc('synthetic-invalid'),
           'refresh_token': 'synthetic', 'expires_at': 1900000000, 'expires_in': 86400, 'token_type': 'bearer'}
wine = {'id': 'wine-local', 'user_id': UID, 'name': 'Vino QA local', 'status': 'collection', 'quantity': 1, 'rating': None,
        'is_favorite': False, 'sensory_attributes': None, 'created_at': '2026-10-01T00:00:00Z'}
variants = []
for native in [True, False]:
    for width, height in [(320, 852), (393, 852), (852, 393)]:
        for size in [100, 135]:
            variants.append((f'{"native" if native else "web"}-{width}-{size}', native, True, width, height, size, (0,0,0)))
variants += [('native-safe-bottom', True, True, 393, 852, 135, (0,0,34)),
             ('native-safe-landscape', True, True, 852, 393, 135, (44,16,21)),
             ('native-320-200', True, True, 320, 852, 200, (0,0,34)),
             ('native-scan-200', True, False, 320, 852, 200, (0,0,34)),
             ('native-landscape-200', True, True, 852, 393, 200, (44,16,21)),
             ('native-anonymous', True, False, 320, 852, 135, (0,0,34)),
             ('web-anonymous', False, False, 320, 852, 135, (0,0,0))]
LABELS = ['Inicio', 'aiRIM', 'Escanear', 'Bodega', 'Perfil']
PATHS = ['/', '/inteligencia-liquida', '/escanear', '/my-wines', '/profile']
MEASURE = """nav => {
 const box=r=>({x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom});
 const bounds=nav.getBoundingClientRect(),issues=[];
 const links=[...nav.querySelectorAll('a')].map(a=>{
  const b=a.getBoundingClientRect(),label=a.getAttribute('aria-label');
  const span=[...a.querySelectorAll('span')].find(s=>s.textContent.trim()===label&&!s.querySelector('svg'));
  const s=span&&getComputedStyle(span),r=span?.getBoundingClientRect();
  const text=[];
  if(span){const range=document.createRange();range.selectNodeContents(span);for(const t of range.getClientRects())if(t.width&&t.height)text.push(box(t));}
  if(!span||!text.length)issues.push(label+': no visible label');
  if(span&&span.scrollWidth>span.clientWidth+1)issues.push(label+': label overflow/ellipsis');
  for(const t of text){
   if(t.x<b.x-1||t.right>b.right+1||t.y<b.y-1||t.bottom>b.bottom+1)issues.push(label+': text outside target');
   if(t.x<bounds.x-1||t.right>bounds.right+1||t.y<bounds.y-1||t.bottom>bounds.bottom+1)issues.push(label+': text outside nav');
   for(let el=span;el&&el!==document.body;el=el.parentElement){const st=getComputedStyle(el),er=el.getBoundingClientRect();if(['hidden','clip','auto'].includes(st.overflowX)&&(t.x<er.x-1||t.right>er.right+1))issues.push(label+': ancestor clips text');}
  }
  const hit=[[.5,.5],[.2,.5],[.8,.5]].map(([x,y])=>a.contains(document.elementFromPoint(b.x+b.width*x,b.y+b.height*y)));
  if(!hit.every(Boolean))issues.push(label+': hit-test failed');
  if(b.width<43.5||b.height<43.5)issues.push(label+': target below44');
  if(b.y<bounds.y-1||b.bottom>bounds.bottom+1)issues.push(label+': target outside nav');
  return {label,box:box(b),text,textOverflow:s?.textOverflow,fontSize:s?.fontSize,hit,current:a.getAttribute('aria-current'),href:a.getAttribute('href')};
 });
 for(let i=0;i<links.length;i++)for(let j=i+1;j<links.length;j++){const a=links[i].box,b=links[j].box;if(Math.min(a.right,b.right)>Math.max(a.x,b.x)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.y,b.y)+1)issues.push('intersecting targets');}
 const visual=[...links].sort((a,b)=>a.box.x-b.box.x).map(a=>a.label),dom=links.map(a=>a.label);
 if(visual.join('|')!==dom.join('|'))issues.push('DOM/keyboard order differs from visual order');
 return {box:box(bounds),links,domOrder:dom,visualOrder:visual,issues:[...new Set(issues)],paddingBottom:getComputedStyle(document.querySelector('.App')).paddingBottom};
}"""
results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for name, native, authenticated, width, height, size, safe in variants:
        if args.cases and name not in args.cases.split(','): continue
        context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, reduced_motion='reduce')
        seed = {'matchrim.local_profile_owner.v1': UID if authenticated else 'anonymous', 'matchrim.onboarding.v2:' + (UID if authenticated else 'anonymous'): json.dumps({'version': 2, 'result': 'skipped'})}
        if authenticated: seed['sb-cbjynrbvrhcmpaojmqdp-auth-token'] = json.dumps(session)
        context.add_init_script(("window.CapacitorCustomPlatform={name:'ios'};" if native else '') + "for(const [k,v] of Object.entries(%s))localStorage.setItem(k,v);document.addEventListener('DOMContentLoaded',()=>{const s=document.documentElement.style;s.fontSize='%spx';s.setProperty('--matchrim-native-safe-top','20px');s.setProperty('--matchrim-native-safe-bottom','%spx');s.setProperty('--matchrim-safe-left','%spx');s.setProperty('--matchrim-safe-right','%spx');});" % (json.dumps(seed), 16*size/100, safe[2], safe[0], safe[1]))
        requests, errors, failures, destinations, measurements = [], [], [], [], {}
        def handler(route):
            req=route.request;url=urlparse(req.url)
            if url.netloc==urlparse(args.url).netloc:return route.continue_()
            requests.append({'path':url.path,'method':req.method})
            data={}
            if '/auth/v1/user' in url.path:data=user
            elif '/rest/v1/user_wines' in url.path:data=[wine]
            elif '/rest/v1/quiz_results' in url.path:data=None
            elif '/rest/v1/' in url.path:data=[]
            route.fulfill(status=200,content_type='application/json',body=json.dumps(data))
        context.route('**/*',handler)
        page=context.new_page();page.set_default_timeout(6000)
        page.on('pageerror',lambda e:errors.append(str(e)))
        nav=page.get_by_role('navigation',name='Navegación principal',exact=True)
        def open_start():
            page.goto(args.url+('/my-wines/collection' if authenticated else '/escanear'),wait_until='networkidle')
        try:
            open_start()
            if not native and width>=768:
                assert not nav.is_visible(), 'desktop breakpoint unexpectedly exposes bottom nav'
                assert float(page.locator('.App').evaluate('(e)=>getComputedStyle(e).paddingBottom').removesuffix('px'))==0
                measurements={'desktopBottomNavHidden':True}
            else:
                nav.wait_for();page.wait_for_timeout(100)
                measurements=nav.evaluate(MEASURE);failures+=measurements['issues']
                assert measurements['visualOrder']==LABELS, 'visual destination order changed'
                assert measurements['box']['x']>=-1 and measurements['box']['right']<=width+1, 'page layout viewport exceeds requested width'
                assert abs(measurements['box']['bottom']-height)<1, 'bar is not anchored to viewport bottom'
                assert abs(float(measurements['paddingBottom'].removesuffix('px'))-measurements['box']['height'])<1, 'content reserve differs from bar height'
                for entry in measurements['links']:
                    if entry['box']['x']<safe[0]-1 or entry['box']['right']>width-safe[1]+1:failures.append(entry['label']+': outside horizontal safearea')
                page.screenshot(path=str(args.output/(name+'-nav.png')))
                nav.get_by_role('link',name='Inicio',exact=True).focus()
                focused=['Inicio']
                for _ in range(4):
                    page.keyboard.press('Tab')
                    focused.append(page.evaluate('document.activeElement.getAttribute("aria-label")'))
                if focused!=LABELS:failures.append('keyboard sequence: '+str(focused))
                if authenticated:
                    last=page.get_by_role('button',name='No va',exact=True).last
                    page.evaluate("window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'})")
                    page.wait_for_timeout(100)
                    b=last.bounding_box();n=nav.bounding_box()
                    if b['y']<20 or b['y']+b['height']>n['y']-3:failures.append('last Bodega control obstructed at document end')
                    if not last.evaluate('(e)=>{const b=e.getBoundingClientRect();return e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))}'):failures.append('last control hit-test failed')
                    measurements['lastControl']={'box':b,'nav':n}
                    page.screenshot(path=str(args.output/(name+'-content-end.png')))
                if name in ['native-320-135','web-320-135','native-anonymous','web-anonymous']:
                    for label,path in zip(LABELS,PATHS):
                        open_start();link=nav.get_by_role('link',name=label,exact=True);link.focus();page.keyboard.press('Enter')
                        expected='/auth' if not authenticated and label in ['Bodega','Perfil'] else path
                        page.wait_for_url('**'+expected+('?**' if expected=='/auth' else ''))
                        q=parse_qs(urlparse(page.url).query)
                        if expected=='/auth':
                            assert q.get('redirect')==[path], 'auth return target changed'
                            assert not nav.count(), 'auth unexpectedly retains bottom nav'
                            assert page.evaluate("!document.body.classList.contains('has-native-app-nav')&&!document.body.classList.contains('has-mobile-app-nav')&&!document.body.style.getPropertyValue('--matchrim-bottom-nav-height')"), 'unmounted nav left content reserve'
                        elif nav.is_visible():assert nav.get_by_role('link',name=label,exact=True).get_attribute('aria-current')=='page', 'active destination mismatch'
                        destinations.append({'label':label,'path':urlparse(page.url).path,'query':q})
                    if authenticated:
                        for path,label in [('/my-wines/wishlist','Bodega'),('/escanear/etiqueta','Escanear'),('/matchrim','Perfil')]:
                            page.goto(args.url+path,wait_until='networkidle')
                            assert nav.get_by_role('link',name=label,exact=True).get_attribute('aria-current')=='page'
                            destinations.append({'nested':path,'active':label})
                if name=='native-safe-landscape':
                    page.set_viewport_size({'width':393,'height':852});page.wait_for_timeout(150)
                    rotated=nav.evaluate(MEASURE);measurements['rotated']=rotated;failures+=rotated['issues']
                    page.screenshot(path=str(args.output/(name+'-rotated.png')))
                assert not any(r['method'] in ['POST','PATCH','DELETE'] and ('/user_wines' in r['path'] or '/functions/' in r['path']) for r in requests), 'navigation performed mutation/analysis'
            assert not errors, errors
            results.append({'case':name,'passed':not failures,'failures':failures,'measurements':measurements,'destinations':destinations,'requests':requests,'pageErrors':errors})
        except Exception as error:
            page.screenshot(path=str(args.output/(name+'-error.png')))
            results.append({'case':name,'passed':False,'failures':failures,'error':str(error),'measurements':measurements,'destinations':destinations,'requests':requests,'pageErrors':errors})
        context.close();print(name,'PASS' if results[-1]['passed'] else 'FAIL',flush=True)
    browser.close()
(args.output/'results.json').write_text(json.dumps({'scope':'local intercepted UI; viewport/auth/safearea variants, not people or physical accessibility','results':results},indent=2))
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
