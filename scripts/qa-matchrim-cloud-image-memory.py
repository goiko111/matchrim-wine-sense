"""Image preparation alone, original public canary; distinguishes pixel resources from React/network UI."""
import argparse,ast,hashlib,json,os,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from qa_matchrim_runtime import add_browser_options,launch_browser
from qa_matchrim_cloud_fixture import PHOTO,PHOTO_HASH,ROOT
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',default='http://127.0.0.1:4469');p.add_argument('--output',type=Path,required=True);p.add_argument('--cycles',type=int,default=60);p.add_argument('--purge-diagnostic',action='store_true');add_browser_options(p)
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
# Use the exact namespace-scoped RSS function from the scanner harness without
# importing/running its CLI. The helper's source hash remains in the evidence.
source=ROOT/'scripts/qa-matchrim-memory-oct13.py';tree=ast.parse(source.read_text());scope={'Path':Path,'os':os,'re':__import__('re')}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='chromium_process_memory'],type_ignores=[]),str(source),'exec'),scope)
rows=[];errors=[];external=[];started=time.monotonic()
with sync_playwright() as pw:
 b=launch_browser(pw,a);c=b.new_context(service_workers='block',reduced_motion='reduce');c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(a.url+'/') else (external.append(r.request.url),r.abort())[1]);c.route_web_socket('**/*',lambda ws:ws.connect_to_server() if ws.url.startswith(a.url.replace('http:','ws:')+'/') else ws.close(code=1008))
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(a.url+'/scripts/qa-pages/cloud-image-lifetime.html',wait_until='networkidle');cdp=c.new_cdp_session(page);cdp.send('Performance.enable')
 for cycle in range(a.cycles):
  page.locator('input').set_input_files(str(PHOTO));expect(page.locator('#status')).to_have_text('Preparada',timeout=15000);page.get_by_role('button',name='Liberar resultado',exact=True).click();expect(page.locator('#status')).to_have_text('Sin imagen');cdp.send('Runtime.discardConsoleEntries');cdp.send('HeapProfiler.collectGarbage')
  metrics={r['name']:r['value'] for r in cdp.send('Performance.getMetrics')['metrics'] if r['name'] in ['Nodes','JSEventListeners','JSHeapUsedSize']};rss=scope['chromium_process_memory']()
  assert not errors and not external and page.locator('img[src]').count()==0
  rows.append({'cycle':cycle,'metrics':metrics,'rss':rss,'elapsedSeconds':time.monotonic()-started})
  (a.output/'results.json').write_text(json.dumps({'scope':__doc__,'photoSha256':PHOTO_HASH,'imageAnalysisSha256':hashlib.sha256((ROOT/'src/utils/imageAnalysis.ts').read_bytes()).hexdigest(),'rssHelperSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'cycles':rows,'errors':errors,'externalRequests':external},indent=2)+'\n')
  if (cycle+1)%10==0:print(json.dumps({'cycles':cycle+1,'rssKiB':rss['sumRssKiB'],'nodes':metrics['Nodes']}),flush=True)
 if a.purge_diagnostic:
  diagnostic={'scope':'Artificial Chromium leak-detection purge; not ordinary application behavior','before':scope['chromium_process_memory']()}
  try:
   diagnostic['nativeCountersBefore']=cdp.send('Memory.getDOMCountersForLeakDetection')
   cdp.send('Memory.prepareForLeakDetection');cdp.send('HeapProfiler.collectGarbage')
   diagnostic['nativeCountersAfter']=cdp.send('Memory.getDOMCountersForLeakDetection')
   diagnostic['after']=scope['chromium_process_memory']()
  except Exception as error:diagnostic['unsupported']=str(error)
  (a.output/'purge-diagnostic.json').write_text(json.dumps(diagnostic,indent=2)+'\n')
 page.screenshot(path=str(a.output/'final.png'));c.close();b.close()
