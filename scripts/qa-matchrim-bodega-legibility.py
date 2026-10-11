"""Bodega control bounds, clipping, hit testing and destinations; all remote traffic intercepted."""
import argparse
import base64
import json
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4440')
p.add_argument('--output', type=Path, required=True)
p.add_argument('--cases')
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
UID = '00000000-0000-4000-8000-000000000080'
NAME = 'Reserva Especial de la Familia del Valle de las Montanas'
PRODUCER = 'Bodega de Prueba y Tradicion Familiar'
enc = lambda v: base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
user = {'id': UID, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa@matchrim.invalid', 'app_metadata': {'provider': 'email'}, 'user_metadata': {}}
session = {'user': user, 'access_token': enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': UID, 'exp': 1900000000}) + '.' + enc('synthetic-invalid'),
           'refresh_token': 'synthetic', 'expires_at': 1900000000, 'expires_in': 86400, 'token_type': 'bearer'}
base = {'id': 'wine-long', 'user_id': UID, 'name': NAME, 'producer': PRODUCER, 'vintage': 2018, 'region': 'Ribera del Duero', 'country': 'Espana',
        'status': 'collection', 'quantity': 1, 'is_favorite': False, 'rating': 'love', 'use_for_profile_training': True,
        'sensory_attributes': {'potencia': 3, 'acidez': 3, 'dulzura': 2, 'taninos': 2, 'afrutado': 4},
        'grape_varieties': ['Cabernet Sauvignon', 'Tempranillo'], 'created_at': '2026-10-01T00:00:00Z'}
variants = [('portrait-100', 393, 852, 16, False), ('portrait-135', 393, 852, 21.6, False),
            ('landscape-100', 852, 393, 16, False), ('landscape-135', 852, 393, 21.6, False),
            ('narrow-135', 320, 852, 21.6, False), ('empty-landscape-135', 852, 393, 21.6, True)]

# Text ranges expose clipped anonymous flex text that page.scrollWidth cannot detect.
MEASURE = """e => {
 const rect = r => ({x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom});
 const box = e.getBoundingClientRect(); const issues=[];const texts=[];
 const parent=e.parentElement.getBoundingClientRect();
 if(box.left<parent.left-1||box.right>parent.right+1)issues.push('control exceeds its own panel');
 const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);
 let n;while(n=walker.nextNode()){
  if(!n.textContent.trim() || n.parentElement.closest('svg'))continue;
  const range=document.createRange();range.selectNodeContents(n);
  for(const r of range.getClientRects()){
   if(!r.width||!r.height)continue;
   texts.push({text:n.textContent.trim(),rect:rect(r)});
   if(r.left<box.left-1||r.right>box.right+1||r.top<box.top-1||r.bottom>box.bottom+1)issues.push('text outside control: '+n.textContent.trim());
   for(let a=n.parentElement;a&&a!==document.body;a=a.parentElement){
    const s=getComputedStyle(a),b=a.getBoundingClientRect();
    if(['hidden','clip','auto','scroll'].includes(s.overflowX)&&(r.left<b.left-1||r.right>b.right+1))issues.push('ancestor clips x: '+n.textContent.trim());
    if(['hidden','clip','auto','scroll'].includes(s.overflowY)&&(r.top<b.top-1||r.bottom>b.bottom+1))issues.push('ancestor clips y: '+n.textContent.trim());
   }
  }
 }
 const points=[[.5,.5],[.2,.5],[.8,.5]].map(([x,y])=>{const hit=document.elementFromPoint(box.x+box.width*x,box.y+box.height*y);return !!hit&&e.contains(hit)});
 const nav=document.querySelector('nav[aria-label="Navegación principal"]')?.getBoundingClientRect();
 if(box.top<20-1||box.bottom>(nav?.top??innerHeight)-4)issues.push('outside safe visible area');
 if(!points.every(Boolean))issues.push('control is occluded at hit-test points');
 if(e.matches('button,input')&&(box.height<43.5||box.width<43.5))issues.push('touch target below44');
 const s=getComputedStyle(e);
 return {box:rect(box),parent:rect(parent),issues:[...new Set(issues)],texts,hitTests:points,nav:nav?rect(nav):null,animation:s.animationName,transform:s.transform,scrollY};
}"""
results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for name, width, height, font, empty in variants:
        if args.cases and name not in args.cases.split(','): continue
        context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, reduced_motion='reduce')
        seed = {'sb-cbjynrbvrhcmpaojmqdp-auth-token': json.dumps(session), 'matchrim.local_profile_owner.v1': UID,
                'matchrim.onboarding.v2:' + UID: json.dumps({'version': 2, 'result': 'skipped'})}
        context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const [k,v] of Object.entries(%s))localStorage.setItem(k,v);document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize='%spx';document.documentElement.style.setProperty('--matchrim-native-safe-top','20px');document.documentElement.style.setProperty('--matchrim-native-safe-bottom','20px')});" % (json.dumps(seed), font))
        requests, errors, failures, measures, destinations = [], [], [], {}, []
        def handler(route):
            req = route.request
            url = urlparse(req.url)
            if url.netloc == urlparse(args.url).netloc: return route.continue_()
            requests.append({'path': url.path, 'method': req.method})
            data = {}
            if '/auth/v1/user' in url.path: data = user
            elif '/rest/v1/user_wines' in url.path:
                data = [] if empty else [base, {**base, 'id': 'wine-no-attrs', 'name': 'Vino sin ficha sensorial', 'sensory_attributes': None, 'use_for_profile_training': False}]
            elif '/rest/v1/' in url.path: data = []
            route.fulfill(status=200, content_type='application/json', body=json.dumps(data))
        context.route('**/*', handler)
        page = context.new_page()
        page.set_default_timeout(6000)
        page.on('pageerror', lambda e: errors.append(str(e)))
        def button(label): return page.get_by_role('button', name=re.compile('^' + re.escape(label))).first
        def inspect(key, locator):
            locator.evaluate("e=>e.scrollIntoView({block:'center',behavior:'instant'})")
            page.wait_for_timeout(70)
            measure = locator.evaluate(MEASURE)
            measures[key] = measure
            failures.extend(key + ': ' + problem for problem in measure['issues'])
            if measure['box']['x'] < 0 or measure['box']['right'] > width + 1: failures.append(key + ': control outside viewport width')
            if measure['animation'] != 'none' or measure['transform'] != 'none': failures.append(key + ': reduced-motion control moves')
            page.screenshot(path=str(args.output / (name + '-' + key + '.png')))
        def home():
            page.goto(args.url + '/my-wines/collection', wait_until='networkidle')
            button('Escanear etiqueta').wait_for()
        try:
            home()
            for key, label in [('label', 'Escanear etiqueta'), ('menu', 'Escanear carta'), ('manual', 'Añadir manualmente')]: inspect(key, button(label))
            search = page.get_by_placeholder('Busca vino o bodega...', exact=True)
            inspect('catalog-title', page.get_by_text('Buscar catálogo', exact=True))
            inspect('catalog', search)
            search.click()
            assert search.evaluate('(e)=>e===document.activeElement')
            inspect('learning', button('Puntuar pendientes'))
            if not empty:
                inspect('fit', button('¿Por qué encaja?'))
                inspect('similar', button('Buscar parecido'))
                first, second = button('¿Por qué encaja?'), button('Buscar parecido')
                bounds = [x.bounding_box() for x in [first, second]]
                a,b=bounds
                if min(a['x']+a['width'],b['x']+b['width'])>max(a['x'],b['x'])+1 and min(a['y']+a['height'],b['y']+b['height'])>max(a['y'],b['y'])+1: failures.append('aiRIM controls intersect')
                first.focus();page.keyboard.press('Tab')
                assert second.evaluate('(e)=>e===document.activeElement'), 'aiRIM keyboard order changed'
                if name == 'landscape-135':
                    inspect('fit-noattrs', page.get_by_role('button', name='¿Por qué encaja?', exact=True).nth(1))
                    inspect('similar-noattrs', page.get_by_role('button', name='Buscar parecido', exact=True).nth(1))
            button('Escanear etiqueta').focus()
            for expected in [button('Escanear carta'), button('Añadir manualmente'), search]:
                page.keyboard.press('Tab')
                assert expected.evaluate('(e)=>e===document.activeElement'), 'top action keyboard order changed'
            # Follow real controls without choosing photos, submitting prompts or saving content.
            targets = [('Escanear etiqueta','/escanear/etiqueta'), ('Escanear carta','/escanear/carta-vinos'),
                       ('Añadir manualmente','/my-wines/add'), ('Puntuar pendientes','/my-wines/wishlist')]
            if not empty: targets += [('¿Por qué encaja?', '/inteligencia-liquida'), ('Buscar parecido','/inteligencia-liquida')]
            for label, path in targets:
                home()
                if label == 'Puntuar pendientes':
                    button(label).focus()
                    page.keyboard.press('Enter')
                else:
                    button(label).click()
                page.wait_for_url('**' + path + ('?**' if 'inteligencia' in path else ''))
                query = parse_qs(urlparse(page.url).query)
                if label in ['¿Por qué encaja?', 'Buscar parecido']:
                    assert query.get('function') == ['wine-fit' if label == '¿Por qué encaja?' else 'similar-wine']
                    assert NAME in query.get('wine', [''])[0] and PRODUCER in query.get('wine', [''])[0], 'wine context lost'
                destinations.append({'control': label, 'path': urlparse(page.url).path, 'query': query})
            if name == 'landscape-135':
                for label, intent in [('¿Por qué encaja?', 'wine-fit'), ('Buscar parecido', 'similar-wine')]:
                    home()
                    page.get_by_role('button', name=label, exact=True).nth(1).click()
                    page.wait_for_url('**/inteligencia-liquida?**')
                    query = parse_qs(urlparse(page.url).query)
                    assert query.get('function') == [intent] and 'Vino sin ficha sensorial' in query.get('wine', [''])[0]
                    destinations.append({'control': label + ' (no sensory attributes)', 'path': urlparse(page.url).path, 'query': query})
            assert not any(r['method'] in ['POST','PATCH','DELETE'] and ('/user_wines' in r['path'] or '/functions/' in r['path']) for r in requests), 'navigation triggered mutation or analysis'
            assert not errors, errors
            results.append({'case': name, 'passed': not failures, 'failures': failures, 'measurements': measures, 'destinations': destinations, 'requests': requests, 'pageErrors': errors})
        except Exception as error:
            results.append({'case': name, 'passed': False, 'failures': failures, 'error': str(error), 'measurements': measures, 'destinations': destinations, 'requests': requests, 'pageErrors': errors})
            page.screenshot(path=str(args.output / (name + '-error.png')))
        context.close()
        print(name, 'PASS' if results[-1]['passed'] else 'FAIL', flush=True)
    browser.close()
(args.output / 'results.json').write_text(json.dumps({'scope': 'six viewport/content variants, not people or native accessibility', 'results': results}, indent=2))
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
