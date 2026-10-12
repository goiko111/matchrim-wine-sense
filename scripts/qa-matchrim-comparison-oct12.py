"""Active comparator QA on frozen Hugel image; synthetic response variants, zero live vision."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4449')
p.add_argument('--corpus', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--cases', default='basic-portrait,basic-landscape,duplicate-portrait,boundary-portrait,boundary-landscape')
args = p.parse_args(); args.output.mkdir(parents=True, exist_ok=True)
annotation_file = args.corpus / 'annotations.json'
scene = next(s for s in json.loads(annotation_file.read_text())['scenes'] if s['id'] == 'oct12-public-3')
source = next(s for s in json.loads((args.corpus/'sources.json').read_text())['sources'] if s['id'] == scene['id'])
image = args.corpus / source['local_copy']
assert hashlib.sha256(image.read_bytes()).hexdigest() == source['sha256']
base = [{'name': o['cuvee']+' Hugel', 'producer':o['producer'], 'confidence':.9, 'evidence':o['literal'], 'vintage':None} for o in scene['objects']]
partials = [{'name':name,'producer':base[0]['producer'],'confidence':.55,'evidence':[literal], 'uncertainty_reasons':['Lectura parcial del rótulo; referencia por confirmar'],'vintage':None} for name,literal in [('Pinot Gris','PINOT GRIS'),('Vendange Tardive','VENDANGE TARDIVE')]]
variants = {'basic':base,'duplicate':base+[base[0]],'boundary':base+partials}
(args.output/'response-variants.json').write_text(json.dumps({'scope':'Four real photographed labels. Duplicate/partial candidates and five/six grid proposals are synthetic comparator stress responses, not extra photographed bottles or vision outputs.', 'sourceSha256':source['sha256'],'annotationSha256':hashlib.sha256(annotation_file.read_bytes()).hexdigest(),'variants':variants},ensure_ascii=False,indent=2)+'\n')
results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for case in args.cases.split(','):
        variant,orientation = case.split('-'); width,height = (393,852) if orientation=='portrait' else (852,393)
        candidates = variants[variant]
        context = browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,device_scale_factor=1,reduced_motion='reduce',service_workers='block')
        context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};localStorage.setItem('matchrim.local_profile_owner.v1','anonymous');localStorage.setItem('matchrim.scan_privacy_notice.v2','accepted');localStorage.setItem('matchrim.onboarding.v2:anonymous',JSON.stringify({version:2,result:'skipped'}));")
        requests,errors,console_errors,failures,steps = [],[],[],[],[]
        def intercept(route):
            req=route.request; parsed=urlparse(req.url)
            if parsed.netloc==urlparse(args.url).netloc:return route.continue_()
            endpoint=parsed.path.split('/functions/v1/')[-1]
            body=req.post_data_json if req.method=='POST' else {}
            requests.append({'method':req.method,'path':parsed.path})
            payload=[] if '/rest/v1/' in parsed.path else {}
            if endpoint.startswith('detect-wine-regions'):
                boxes=[dict(zip(['x','y','width','height'],[o['box'][0]/scene['width']*100,o['box'][1]/scene['height']*100,o['box'][2]/scene['width']*100,o['box'][3]/scene['height']*100])) for o in scene['objects']] if variant=='basic' else [{'x':2+i*(96/len(candidates)),'y':2,'width':(96/len(candidates))-2,'height':92} for i in range(len(candidates))]
                payload={'regions':[{'object_type':'label','box':box,'confidence':.9,'quality':{'glare':'low','occlusion':'low','legibility':'good'}} for box in boxes],'coverage':{'status':'reported_complete','estimated_visible_objects':len(boxes),'confidence':.9}}
            elif endpoint.startswith('analyze-wine-region'):
                payload={'candidates':[candidates[(body.get('region_index') or 1)-1]]}
            elif '/functions/' in parsed.path:payload={'wines':[]}
            route.fulfill(status=200,content_type='application/json',body=json.dumps(payload),headers={'Access-Control-Allow-Origin':'*'})
        context.route('**/*',intercept)
        page=context.new_page();page.set_default_timeout(5000)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:console_errors.append(re.sub(r'https?://\S+','<REMOTE_URL>',m.text)) if m.type=='error' else None)
        def check(name,condition,detail=None):
            steps.append({'name':name,'passed':bool(condition),'detail':detail})
            if not condition:failures.append(name)
        def snapshot():
            values=page.evaluate('Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))')
            return {'keys':list(values),'sha256':hashlib.sha256(json.dumps(values,sort_keys=True).encode()).hexdigest()}
        try:
            page.goto(args.url+'/escanear/etiqueta',wait_until='networkidle')
            page.locator('input[type=file]').nth(1).set_input_files(str(image))
            page.get_by_text('Lote listo para revisar',exact=True).wait_for(timeout=45000)
            page.get_by_role('tab',name='Vinos',exact=False).click()
            if variant=='duplicate':check('Exact duplicate retains region count',page.get_by_text('2 regiones agrupadas',exact=False).count()==1)
            initial_requests=len(requests);initial_storage=snapshot()
            page.get_by_role('tab',name='Comparar',exact=True).click()
            section=page.locator('section[aria-labelledby="wine-comparison-title"]')
            section.wait_for();section.scroll_into_view_if_needed()
            choices=section.get_by_role('checkbox'); expected_count=6 if variant=='boundary' else 4
            check('Active comparison offers expected references',choices.count()==expected_count,choices.count())
            def selected():return [c.get_attribute('aria-label') for c in choices.all() if c.get_attribute('aria-checked')=='true']
            def select(names):
                desired={'Comparar '+name for name in names}
                for c in choices.all():
                    if c.get_attribute('aria-checked')=='true' and c.get_attribute('aria-label') not in desired:c.click()
                for name in names:
                    c=section.get_by_role('checkbox',name='Comparar '+name,exact=True)
                    if c.get_attribute('aria-checked')!='true':c.click()
            names=[c['name'] for c in base]
            select(names[:2]);check('Select two actual literal references',len(selected())==2,selected())
            check('No affinity number generated',section.locator('tr').filter(has=page.get_by_text('Afinidad',exact=True)).locator('td').all_inner_texts()==['-','-'])
            section.locator('#comparison-priority').click()
            check('Affinity priority disabled without data',page.get_by_role('option',name='Mayor afinidad',exact=True).get_attribute('aria-disabled')=='true')
            page.keyboard.press('Escape')
            section.screenshot(path=str(args.output/(case+'-two.png')))
            select(names);check('Select four distinct same-producer references',len(selected())==4,selected())
            select(names[:1]);check('Withdraw to one shows abstention',section.get_by_text('Selecciona al menos dos vinos para comparar.',exact=True).count()==1)
            page.get_by_role('tab',name='Escena',exact=True).click()
            page.get_by_role('tab',name='Comparar',exact=True).click()
            check('Edited one-item selection survives tab switch',len(selected())==1,selected())
            select(names);check('Reselect four after returning',len(selected())==4,selected())
            tile=section.get_by_role('checkbox',name='Comparar '+names[0],exact=True).locator('..')
            box=tile.bounding_box();check('Choice tile has at least44px target',box['width']>=44 and box['height']>=44)
            before_touch=section.get_by_role('checkbox',name='Comparar '+names[0],exact=True).get_attribute('aria-checked')
            tile.tap();check('Full choice tile responds to touch',section.get_by_role('checkbox',name='Comparar '+names[0],exact=True).get_attribute('aria-checked')!=before_touch)
            tile.tap()
            if variant=='boundary':
                check('Partial references labelled before selection',section.get_by_text('Referencia por confirmar',exact=True).count()==2)
                descriptions=[section.get_by_role('checkbox',name='Comparar '+c['name'],exact=True).get_attribute('aria-describedby') for c in partials]
                check('Partial status exposed through accessible description',all(descriptions) and all(page.locator('[id="'+i+'"]').inner_text()=='Referencia por confirmar' for i in descriptions))
                select(names+[partials[0]['name']]);check('Five-reference limit reached',len(selected())==5)
                sixth=section.get_by_role('checkbox',name='Comparar '+partials[1]['name'],exact=True)
                check('Sixth entry disabled at five',sixth.is_disabled())
                select(names[1:]+[partials[0]['name'],partials[1]['name']]);check('Removal frees a slot for sixth candidate',len(selected())==5 and sixth.get_attribute('aria-checked')=='true')
                section.screenshot(path=str(args.output/(case+'-five.png')))
                select([c['name'] for c in partials]);check('Partial-only choice remains provisional',section.get_by_text('Opcion provisional: confirma los datos',exact=True).count()==1)
                check('Partial-only affinity unavailable',section.locator('tr').filter(has=page.get_by_text('Afinidad',exact=True)).locator('td').all_inner_texts()==['-','-'])
            else:section.get_by_role('button',name='Servicio',exact=True).click()
            long_choice=section.get_by_role('checkbox',name='Comparar '+names[3],exact=True).locator('..')
            label=long_choice.locator('span.block').first
            geometry=label.evaluate('(e)=>({width:e.clientWidth,scrollWidth:e.scrollWidth,whiteSpace:getComputedStyle(e).whiteSpace,textOverflow:getComputedStyle(e).textOverflow,text:e.textContent})')
            check('Longest literal remains fully visible',geometry['scrollWidth']<=geometry['width'],geometry)
            page_geometry=page.evaluate('({innerWidth,scrollWidth:document.documentElement.scrollWidth})')
            check('No page horizontal expansion',page_geometry['innerWidth']==width and page_geometry['scrollWidth']<=width,page_geometry)
            check('Comparison sends no new requests',len(requests)==initial_requests)
            check('Comparison changes no storage or learning keys',snapshot()==initial_storage)
            check('No save/training/database write',not any('/rest/v1/' in r['path'] and r['method'] in ['POST','PATCH','DELETE','PUT'] for r in requests))
            check('No runtime/console errors',not errors and not console_errors,{'runtime':errors,'console':console_errors})
            section.screenshot(path=str(args.output/(case+'-final.png')))
            results.append({'case':case,'passed':not failures,'failures':failures,'steps':steps,'requests':requests,'comparisonNewRequests':len(requests)-initial_requests,'storageBefore':initial_storage,'storageAfter':snapshot(),'errors':errors,'consoleErrors':console_errors})
        except Exception as error:
            page.screenshot(path=str(args.output/(case+'-exception.png')))
            results.append({'case':case,'passed':False,'error':str(error),'failures':failures,'steps':steps,'requests':requests,'errors':errors,'consoleErrors':console_errors})
        context.close();print(case,'PASS' if results[-1]['passed'] else 'FAIL',flush=True)
    browser.close()
(args.output/'results.json').write_text(json.dumps({'scope':__doc__,'realPhotographedScenes':1,'actualPhotographedLabels':4,'syntheticResponseVariants':3,'paidCalls':0,'realAppRemoteCalls':0,'results':results},ensure_ascii=False,indent=2)+'\n')
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
