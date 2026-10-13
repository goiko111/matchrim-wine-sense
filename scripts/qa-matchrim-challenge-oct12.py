"""New-image local QA with annotated synthetic proposals, never live recognition."""
import argparse
import base64
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4447')
p.add_argument('--corpus', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--cases', choices=['negative', 'all'], default='all')
p.add_argument('--pixels', action='store_true')
p.add_argument('--explicit-negative', action='store_true', help='Contract variant: no candidates, explicit not_wine fallback')
args = p.parse_args(); args.output.mkdir(parents=True, exist_ok=True)
annotations = json.loads((args.corpus / 'annotations.json').read_text())
sources = json.loads((args.corpus / 'sources.json').read_text())
paths = {s['id']: args.corpus / s['local_copy'] for s in sources['sources'] if s.get('local_copy')}
paths['owner-shelf'] = args.corpus / sources['owner']['path']
scenes = {s['id']: s for s in annotations['scenes']}
results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    names = ['oct12-public-5'] if args.cases == 'negative' else ['oct12-public-5', 'oct12-public-3', 'owner-shelf']
    for name in names:
        scene = scenes[name]
        for orientation, width, height in [('portrait', 393, 852), ('landscape', 852, 393)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, device_scale_factor=1, reduced_motion='reduce')
            context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};localStorage.setItem('matchrim.local_profile_owner.v1','anonymous');localStorage.setItem('matchrim.scan_privacy_notice.v2','accepted');localStorage.setItem('matchrim.onboarding.v2:anonymous',JSON.stringify({version:2,result:'skipped'}));")
            calls, errors, failures = [], [], []
            objects = scene['objects']
            def intercept(route):
                req = route.request
                parsed = urlparse(req.url)
                if parsed.netloc == urlparse(args.url).netloc: return route.continue_()
                endpoint = parsed.path.split('/functions/v1/')[-1]
                body = req.post_data_json if req.method == 'POST' else {}
                payload = [] if '/rest/v1/' in parsed.path else {}
                if '/functions/v1/' in parsed.path:
                    calls.append({'endpoint': endpoint, 'region': body.get('region_index')})
                if endpoint.startswith('detect-wine-regions'):
                    payload = {'regions': [{'object_type': o.get('object_type', 'bottle'), 'box': dict(zip(['x','y','width','height'], [o['box'][0]/scene['width']*100,o['box'][1]/scene['height']*100,o['box'][2]/scene['width']*100,o['box'][3]/scene['height']*100])), 'confidence': .9, 'quality': {'glare':'medium','occlusion':o.get('occlusion','low'),'legibility':o['legibility']}} for o in objects], 'coverage': {'status':'reported_complete','estimated_visible_objects':len(objects),'confidence':.9}}
                elif endpoint.startswith('analyze-wine-region'):
                    if name == 'oct12-public-5': payload = {'candidates':[], 'fallback':{'code':'not_wine'}} if args.explicit_negative else {'candidates':[{'name':'Aperol','producer':'Fratelli Barbieri','type':'aperitivo','confidence':.99,'evidence':['APEROL','APERITIVO','DAL 1919']}]}
                    elif name == 'oct12-public-3':
                        o = objects[(body.get('region_index') or 1)-1]
                        payload = {'candidates':[{'name':o['cuvee']+' Hugel','producer':o['producer'],'confidence':.9,'evidence':o['literal'],'vintage':None}]}
                    else: payload = {'candidates':[],'fallback':{'code':'insufficient_visible_text','message':'Contrato QA: sin identidad; no es una lectura del modelo.'}}
                elif '/functions/' in parsed.path: payload = {'wines':[]}
                route.fulfill(status=200, content_type='application/json', body=json.dumps(payload), headers={'Access-Control-Allow-Origin':'*'})
            context.route('**/*', intercept)
            page = context.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
            page.set_default_timeout(5000)
            try:
                page.goto(args.url+'/escanear/etiqueta', wait_until='networkidle')
                page.locator('input[type=file]').nth(1).set_input_files(str(paths[name]))
                page.get_by_text('Lote listo para revisar', exact=True).wait_for(timeout=45000)
                if name == 'owner-shelf' and '28 regiones' not in page.locator('body').inner_text(): failures.append('Annotated edge bottle lost during normalization')
                page.get_by_role('tab', name='Vinos', exact=False).first.click()
                if name == 'oct12-public-5':
                    if page.get_by_role('button', name='Abrir detalle de Aperol', exact=True).count(): failures.append('Aperol accepted as a wine candidate')
                    if any(c['endpoint'].startswith('search-wines') for c in calls): failures.append('Non-wine sent for catalog matching')
                if name == 'oct12-public-3':
                    if page.get_by_role('button', name='Abrir detalle de', exact=False).count() != 4: failures.append('Four Hugel references not retained separately')
                if name == 'oct12-public-5':
                    review = page.get_by_role('button', name='Revisar región', exact=False).first
                    if review.count():
                        if 'Otra bebida' not in review.inner_text(): failures.append('Non-wine state not described accurately')
                        review.click()
                        page.get_by_text('La referencia leida corresponde a otra bebida, no a un vino. No se calcula afinidad.', exact=True).last.wait_for(timeout=2000)
                        if page.get_by_text('Primero, una identidad verificable', exact=True).count(): failures.append('Generic insufficient-text guidance contradicts non-wine classification')
                    else: failures.append('No non-wine review path')
                    if page.locator('[data-testid="scan-affinity-value"]').count(): failures.append('Non-wine affinity slot rendered')
                geometry = page.evaluate('({innerWidth,scrollWidth:document.documentElement.scrollWidth})')
                if geometry['innerWidth'] != width or geometry['scrollWidth'] > width: failures.append('horizontal overflow')
                if errors: failures.append('runtime error')
                page.screenshot(path=str(args.output/(name+'-'+orientation+'.png')))
                results.append({'scene':name,'orientation':orientation,'passed':not failures,'failures':failures,'calls':calls,'errors':errors,'geometry':geometry,'testKind':'intercepted annotated proposals and synthetic candidates; no model result'})
            except Exception as error:
                page.screenshot(path=str(args.output/(name+'-'+orientation+'-exception.png')))
                results.append({'scene':name,'orientation':orientation,'passed':False,'error':str(error),'failures':failures,'calls':calls,'errors':errors})
            context.close()
    if args.pixels:
        context = browser.new_context(); context.route('**/*', lambda route: route.continue_() if urlparse(route.request.url).netloc == urlparse(args.url).netloc else route.fulfill(status=200,content_type='application/json',body='{}'))
        page = context.new_page(); page.goto(args.url, wait_until='networkidle')
        metrics = []
        for name, file in paths.items():
            scene = scenes[name]; data = base64.b64encode(file.read_bytes()).decode()
            metric = page.evaluate('''async ({data,scene})=>{
              const img=await import('/src/utils/imageAnalysis.ts');
              const scan=await import('/src/utils/multiWineScan.ts');
              const policy=await import('/src/utils/scanAnalysisPolicy.ts');
              const binary=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
              const prepared=await img.prepareImageForAnalysis(new File([binary],'qa.jpg',{type:'image/jpeg'}));
              const proposals=scene.objects??[];
              const regions=scan.normalizeDetectedRegions({regions:proposals.map(o=>({object_type:o.object_type??'bottle',box:{x:o.box[0]/scene.width*100,y:o.box[1]/scene.height*100,width:o.box[2]/scene.width*100,height:o.box[3]/scene.height*100},confidence:.9,quality:{legibility:o.legibility,glare:'medium',occlusion:o.occlusion??'low'}}))});
              const plan=policy.planRegionAnalysis(regions,prepared.width,prepared.height);
              const crops=[];
              for(const o of proposals){const b=o.label??o.box;const box={x:b[0]/scene.width*100,y:b[1]/scene.height*100,width:b[2]/scene.width*100,height:b[3]/scene.height*100};const crop=await img.cropImageRegionWithQuality(prepared.dataUrl,box,0);crops.push({id:o.id,geometry:crop.geometry,quality:crop.quality});}
              return {sourcePixels:prepared.quality,preparedSize:{width:prepared.width,height:prepared.height},rejected:img.shouldRejectTextAnalysis(prepared.quality),annotatedProposals:proposals.length,retainedByNormalizer:regions.length,automatic:plan.automatic.length,deferred:plan.deferred.map(r=>({index:r.index,reason:r.deferral.code})),crops,method:'Real pixel preparation and annotation-fed geometry/policy; detection precision/recall unknown'};
            }''', {'data':data,'scene':scene})
            metrics.append({'scene':name,**metric})
        (args.output/'pixel-policy.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2)+'\n')
        context.close()
    browser.close()
(args.output/'results.json').write_text(json.dumps({'paidCalls':0,'remoteAppCalls':0,'results':results},ensure_ascii=False,indent=2)+'\n')
print(json.dumps([{'scene':r['scene'],'orientation':r['orientation'],'passed':r['passed'],'failures':r.get('failures'),'error':r.get('error')} for r in results],ensure_ascii=False))
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
