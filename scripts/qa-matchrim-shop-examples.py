"""Local selection/reflow checks only; never submits a shop/model request."""
import argparse, json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--url',default='http://127.0.0.1:4445')
p.add_argument('--output',type=Path,required=True)
args=p.parse_args();args.output.mkdir(parents=True,exist_ok=True)
EXAMPLES=[
    'Quiero comprar un vino que me vaya a gustar, menos de 20€, y probar una región nueva.',
    'Tengo una cena con pescado y quiero llevar una botella fácil de acertar.',
    'Me gusta Predicador de Rioja. Recomiéndame algo parecido pero con otro carácter.',
    'Quiero una botella un poco más atrevida para aprender, sin pasarme de 30€.',
]
VARIANTS=[('393-base',393,852,100),('320-base',320,852,100),('320-text135',320,852,135),('320-text200',320,852,200),('852-text200',852,393,200)]
MEASURE="""e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);const ranges=[];const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);while(w.nextNode()){if(!w.currentNode.textContent.trim())continue;const q=document.createRange();q.selectNodeContents(w.currentNode);for(const t of q.getClientRects())ranges.push({x:t.x,y:t.y,right:t.right,bottom:t.bottom})}return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,fontSize:s.fontSize,whiteSpace:s.whiteSpace,overflow:s.overflow,textOverflow:s.textOverflow,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,textRects:ranges,textFits:ranges.every(t=>t.x>=r.x-1&&t.right<=r.right+1&&t.y>=r.y-1&&t.bottom<=r.bottom+1)}}"""
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for name,width,height,scale in VARIANTS:
        context=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,device_scale_factor=1,reduced_motion='reduce')
        context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};localStorage.setItem('matchrim.local_profile_owner.v1','anonymous');localStorage.setItem('matchrim.scan_privacy_notice.v2','accepted');localStorage.setItem('matchrim.onboarding.v2:anonymous',JSON.stringify({version:2,result:'skipped'}));")
        requests=[];errors=[];failures=[];controls=[]
        def intercept(route):
            parsed=urlparse(route.request.url)
            if parsed.netloc==urlparse(args.url).netloc:return route.continue_()
            requests.append({'method':route.request.method,'path':parsed.path})
            route.fulfill(status=200,content_type='application/json',body='{}')
        context.route('**/*',intercept)
        page=context.new_page();page.set_default_timeout(5000);page.on('pageerror',lambda e:errors.append(str(e)))
        def position(locator):
            locator.evaluate('(e)=>window.scrollTo(0,scrollY+e.getBoundingClientRect().top-12)')
            page.wait_for_timeout(40)
        try:
            page.goto(args.url+'/escanear/encontrar-vino',wait_until='networkidle')
            page.locator('#shop-intent').wait_for()
            page.add_style_tag(content=f'html {{ font-size: {scale}% !important; }}')
            page.wait_for_timeout(100)
            initial=page.evaluate("({innerWidth,innerHeight,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,rootFont:getComputedStyle(document.documentElement).fontSize,visualWidth:visualViewport.width,visualScale:visualViewport.scale})")
            buttons=page.locator('#shop-intent').locator('..').locator('button')
            if buttons.count()!=4:raise AssertionError('expected exactly four example controls')
            position(buttons.first);page.screenshot(path=str(args.output/(name+'-examples.png')))
            for i,expected in enumerate(EXAMPLES):
                button=buttons.nth(i);position(button)
                before=button.evaluate(MEASURE)
                visible=button.inner_text();accessible=button.aria_snapshot()
                named=page.get_by_role('button',name=expected,exact=True).count()==1
                matches=[]
                for mode in ['click','touch','Enter','Space']:
                    page.locator('#shop-intent').fill('')
                    position(button)
                    if mode=='click':button.click()
                    elif mode=='touch':button.tap()
                    else:button.focus();button.press(mode)
                    actual=page.locator('#shop-intent').input_value()
                    matches.append({'mode':mode,'matches':actual==expected,'input':actual})
                controls.append({'expected':expected,'visible':visible,'accessible':accessible,'completeName':named,'geometry':before,'selections':matches})
                if visible!=expected or not named:failures.append(f'example{i+1}: incomplete visible/accessibility text')
                if before['height']<44 or before['width']<44:failures.append(f'example{i+1}: target below44px')
                if not before['textFits']:failures.append(f'example{i+1}: text outside button')
                if before['x']<0 or before['right']>width+1:failures.append(f'example{i+1}: outside viewport')
                if not all(x['matches'] for x in matches):failures.append(f'example{i+1}: selection value mismatch')
            cta=page.get_by_role('button',name='Encontrar mi vino',exact=True)
            position(cta)
            cta_geometry=cta.evaluate(MEASURE)
            nav=page.locator('nav.fixed').bounding_box()
            cta_reachable=cta.evaluate('(e)=>{const r=e.getBoundingClientRect();const t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return t===e||e.contains(t)}')
            form_controls={selector:page.locator(selector).evaluate(MEASURE) for selector in ['#shop-intent','#shop-url','#shop-budget']}
            headings=page.locator('main h1,main h3').evaluate_all("els=>els.map(e=>({text:e.textContent,width:e.getBoundingClientRect().width,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}))")
            page.screenshot(path=str(args.output/(name+'-cta.png')))
            for selector,geometry in form_controls.items():
                if geometry['x']<0 or geometry['right']>width+1:failures.append(selector+': outside viewport')
                if geometry['height']<44:failures.append(selector+': target below44px')
            if cta_geometry['height']<44 or not cta_geometry['textFits']:failures.append('CTA target/text clipping')
            if not cta_reachable or (nav and cta_geometry['bottom']>nav['y']+1):failures.append('CTA obscured by navigation')
            if initial['innerWidth']!=width or initial['scrollWidth']>width or initial['visualScale']!=1:failures.append('page expands beyond layout viewport')
            if any('/functions/' in r['path'] for r in requests):failures.append('unexpected function request')
            if errors:failures.append('browser runtime error')
            results.append({'variant':name,'passed':not failures,'failures':failures,'viewport':initial,'examples':controls,'cta':cta_geometry,'ctaReachable':cta_reachable,'nav':nav,'formControls':form_controls,'headings':headings,'requests':requests,'errors':errors})
        except Exception as error:
            page.screenshot(path=str(args.output/(name+'-exception.png')))
            results.append({'variant':name,'passed':False,'error':str(error),'failures':failures,'examples':controls,'requests':requests,'errors':errors})
        context.close();print(name,'PASS' if results[-1]['passed'] else 'FAIL',flush=True)
    browser.close()
(args.output/'results.json').write_text(json.dumps({'scope':__doc__,'remoteCalls':0,'variants':results},ensure_ascii=False,indent=2))
raise SystemExit(0 if all(x['passed'] for x in results) else 1)
