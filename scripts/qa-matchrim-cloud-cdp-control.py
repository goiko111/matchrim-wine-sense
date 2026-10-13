"""Minimal CDP control arm without Playwright's Network agent/DOM handles. Public pixels, mock responses only."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.request
from datetime import datetime,timezone
import select
from qa_matchrim_cloud_fixture import PHOTO,PHOTO_HASH,label_payloads,AUTH,OWNER,fake_session,SOURCE_HASHES,ROOT

p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',default='http://127.0.0.1:4469');p.add_argument('--browser',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--cycles',type=int,default=30);p.add_argument('--launch-flags-file',type=Path,required=True)
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
assert a.url.startswith('http://127.0.0.1:') and 1<=a.cycles<=300
responses=label_payloads();counts={'profile':0,'detect':0,'analyze':0,'search':0};rows=[];blocked=[];runtime_errors=[];failure=None
class PipeConnection:
 def __init__(self,read_fd,write_fd):self.read_fd=read_fd;self.write_fd=write_fd;self.buffer=b''
 def send(self,text):
  data=text.encode()+b'\0'
  while data:data=data[os.write(self.write_fd,data):]
 def recv(self):
  while b'\0' not in self.buffer:
   if not select.select([self.read_fd],[],[],60)[0]:raise TimeoutError('CDP pipe response timeout')
   chunk=os.read(self.read_fd,1024*1024)
   if not chunk:raise RuntimeError('Chromium CDP pipe closed')
   self.buffer+=chunk
  result,self.buffer=self.buffer.split(b'\0',1);return result.decode()
 def close(self):os.close(self.read_fd);os.close(self.write_fd)

class CDP:
 def __init__(self,connection):self.ws=connection;self.seq=0;self.session=None;self.replies={}
 def send(self,method,params=None,session=True,wait=True):
  self.seq+=1;request={'id':self.seq,'method':method,'params':params or {}}
  if session and self.session:request['sessionId']=self.session
  self.ws.send(json.dumps(request));idx=self.seq
  if not wait:return idx
  while idx not in self.replies:self.receive()
  response=self.replies.pop(idx)
  if 'error' in response:raise RuntimeError(method+': '+str(response['error']))
  return response.get('result',{})
 def receive(self):
  message=json.loads(self.ws.recv())
  if 'id' in message:self.replies[message['id']]=message;return
  method=message.get('method');event=message.get('params',{})
  if method=='Runtime.exceptionThrown':runtime_errors.append(event['exceptionDetails'].get('text'))
  if method=='Fetch.requestPaused':
   req=event['request'];url=req['url'];rid=event['requestId']
   if url.startswith(a.url+'/'):self.send('Fetch.continueRequest',{'requestId':rid},wait=False);return
   path=url.split('/functions/v1/')[-1].split('?')[0];endpoint=re.sub(r'-v\d+$','',path)
   body=json.loads(req.get('postData','{}'));payload={}
   if req['method']=='OPTIONS':payload={}
   elif '/auth/v1/user' in url:payload=fake_session()['user']
   elif '/rest/v1/quiz_results' in url:counts['profile']+=1;payload=None
   elif '/functions/v1/' in url and endpoint=='detect-wine-regions':counts['detect']+=1;payload=responses['detect']
   elif '/functions/v1/' in url and endpoint=='analyze-wine-region':counts['analyze']+=1;payload=responses['analyze'][body['region_id']]
   elif '/functions/v1/' in url and endpoint=='search-wines':counts['search']+=1;payload={'wines':[]}
   elif '/rest/v1/' in url and req['method']=='GET':payload=[]
   else:
    blocked.append({'method':req['method'],'endpoint':endpoint})
    self.send('Fetch.failRequest',{'requestId':rid,'errorReason':'BlockedByClient'},wait=False);return
   self.send('Fetch.fulfillRequest',{'requestId':rid,'responseCode':200,'responseHeaders':[{'name':'Content-Type','value':'application/json'},{'name':'Access-Control-Allow-Origin','value':'*'},{'name':'Access-Control-Allow-Methods','value':'GET, POST, OPTIONS'},{'name':'Access-Control-Allow-Headers','value':'authorization, apikey, content-type, x-client-info, x-supabase-api-version'}],'body':base64.b64encode(json.dumps(payload).encode()).decode()},wait=False)
 def evaluate(self,expression):
  result=self.send('Runtime.evaluate',{'expression':expression,'returnByValue':True,'awaitPromise':True})
  if 'exceptionDetails' in result:raise RuntimeError(str(result['exceptionDetails']))
  return result.get('result',{}).get('value')
 def wait(self,expression,timeout=45):
  started=time.monotonic()
  while time.monotonic()-started<timeout:
   if self.evaluate(expression):return
   # A DOM/state poll, never time-padding a development session.
   time.sleep(.03)
  raise RuntimeError('Timed out waiting for real client state: '+expression[:100])
 def click(self,selector):
  expression='(async()=>{const e=SELECTOR;if(!e)return false;e.scrollIntoView({block:"center"});const a=e.getBoundingClientRect();await new Promise(r=>setTimeout(r,40));const b=e.getBoundingClientRect();const x=b.left+b.width/2,y=b.top+b.height/2;const hit=document.elementFromPoint(x,y);return Math.abs(a.top-b.top)<.25&&Math.abs(a.left-b.left)<.25&&x>=0&&y>=0&&y<=innerHeight&&!!hit&&(hit===e||e.contains(hit))})()'
  self.wait(expression.replace('SELECTOR',selector))
  pos=self.evaluate('(()=>{const e='+selector+';const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()')
  for kind in ['mousePressed','mouseReleased']:self.send('Input.dispatchMouseEvent',{'type':kind,'x':pos['x'],'y':pos['y'],'button':'left','clickCount':1})

def process_memory():
 # Same PID namespace only; native RSS is not a retained-object proof.
 namespace=os.stat('/proc/self/ns/pid').st_ino;own=int(os.readlink('/proc/self'));records={}
 for proc in Path('/proc').iterdir():
  if not proc.name.isdecimal():continue
  try:
   if os.stat(proc/'ns'/'pid').st_ino!=namespace:continue
   fields=dict(line.split(':',1) for line in (proc/'status').read_text().splitlines() if ':' in line);records[int(proc.name)]=(int(fields['PPid']),fields,proc)
  except (OSError,ValueError,KeyError):continue
 descendants={own}
 while True:
  expanded=descendants|{pid for pid,(parent,_,_) in records.items() if parent in descendants}
  if expanded==descendants:break
  descendants=expanded
 out=[]
 for pid in descendants-{own}:
  if pid not in records:continue
  _,fields,proc=records[pid]
  try:
   text=(proc/'cmdline').read_text().replace('\x00',' ')
   if 'chromium' not in text.split(' ',1)[0]:continue
   kind=re.search(r'(?:^| )--type(?:=| +)([a-z-]+)',text)
   out.append({'pid':pid,'type':kind.group(1) if kind else 'browser','rssKiB':int(fields.get('VmRSS','0').split()[0])})
  except (OSError,ValueError):continue
 return {'processes':out,'sumRssKiB':sum(r['rssKiB'] for r in out),'available':bool(out)}

started=time.monotonic();started_at=datetime.now(timezone.utc).isoformat()
profile=a.output/'runtime-profile';profile.mkdir(exist_ok=True)
with (a.output/'browser.log').open('w') as log:
 browser_read,browser_write=os.pipe();driver_read,driver_write=os.pipe()
 def wire_pipe():os.dup2(browser_read,3);os.dup2(driver_write,4)
 flags=json.loads(a.launch_flags_file.read_text())
 browser=subprocess.Popen([str(a.browser),*flags,'--no-startup-window','--remote-debugging-pipe','--user-data-dir='+str(profile.resolve())],stdout=log,stderr=log,pass_fds=tuple({3,4,browser_read,driver_write}),preexec_fn=wire_pipe)
 os.close(browser_read);os.close(driver_write)
 connection=PipeConnection(driver_read,browser_write)
 try:
  bootstrap=CDP(connection);version=bootstrap.send('Browser.getVersion',session=False)
  version['Browser']=version['product']
  (a.output/'protocol-provenance.json').write_text(json.dumps({'transport':'CDP pipe, matched Playwright Chromium flags','browser':version['Browser'],'networkAgentEnabled':False},indent=2)+'\n')

  cdp=bootstrap;target=cdp.send('Target.createTarget',{'url':'about:blank'},session=False)['targetId'];cdp.session=cdp.send('Target.attachToTarget',{'targetId':target,'flatten':True},session=False)['sessionId']
  cdp.send('Page.enable');cdp.send('Runtime.enable');cdp.send('Performance.enable')
  # No Network.enable here: this is the independent agent-buffer control.
  cdp.send('Fetch.enable',{'patterns':[{'urlPattern':'*'}]})
  seed={AUTH:json.dumps(fake_session()),'matchrim.scan_privacy_notice.v2':'accepted','matchrim.local_profile_owner.v1':OWNER,'matchrim.onboarding.v2:'+OWNER:json.dumps({'version':2,'result':'skipped'})}
  init="window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);"%json.dumps(seed)
  init+='''const NativeWS=WebSocket;window.WebSocket=class extends NativeWS{constructor(url,...args){const u=new URL(url,location.href);if(u.host!==location.host)throw Error('External WebSocket blocked by local QA');super(url,...args)}};if(navigator.serviceWorker)navigator.serviceWorker.register=()=>Promise.reject(Error('Service workers blocked by local QA'));'''
  cdp.send('Page.addScriptToEvaluateOnNewDocument',{'source':init});cdp.send('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':'reduce'}]});cdp.send('Emulation.setDeviceMetricsOverride',{'width':393,'height':852,'deviceScaleFactor':1,'mobile':True});cdp.send('Page.navigate',{'url':a.url+'/escanear/etiqueta'})
  cdp.wait('!![...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="Elegir de galería")')
  native=True
  try:cdp.send('Memory.startSampling',{'samplingInterval':32768,'suppressRandomness':True})
  except Exception as error:native=False;(a.output/'native-sampling-unavailable.json').write_text(json.dumps({'error':str(error)}))
  for cycle in range(a.cycles):
   before=counts.copy();doc=cdp.send('DOM.getDocument')['root']['nodeId'];input_node=cdp.send('DOM.querySelector',{'nodeId':doc,'selector':'input[type=file]:not([capture])'})['nodeId'];cdp.send('DOM.setFileInputFiles',{'nodeId':input_node,'files':[str(PHOTO)]})
   cdp.wait('document.body.innerText.includes("Lote listo para revisar")')
   cdp.click('document.querySelector("[data-testid=region-pin-2]")');cdp.wait('!!document.querySelector("[role=dialog]")')
   cdp.click('[...document.querySelectorAll("[role=dialog] button")].find(e=>e.textContent.trim()==="Confirmar este candidato")')
   cdp.click('[...document.querySelectorAll("[role=dialog] button")].find(e=>e.textContent.trim()==="Cerrar")');cdp.wait('!document.querySelector("[role=dialog]")')
   cdp.click('document.querySelector("button[aria-label=\\"Cerrar análisis\\"]")');cdp.wait('!![...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="Elegir de galería")')
   cdp.send('DOM.disable');cdp.send('Runtime.discardConsoleEntries');cdp.send('HeapProfiler.collectGarbage')
   metrics={m['name']:m['value'] for m in cdp.send('Performance.getMetrics')['metrics'] if m['name'] in ['Nodes','JSEventListeners','JSHeapUsedSize','Documents']}
   live=cdp.evaluate('({nodes:document.querySelectorAll("*").length,images:document.images.length,canvases:document.querySelectorAll("canvas").length,dialogs:document.querySelectorAll("[role=dialog]").length})')
   assert live['images']==live['canvases']==live['dialogs']==0 and not runtime_errors and not blocked
   rows.append({'cycle':cycle,'metricsAfterGc':metrics,'liveDom':live,'rss':process_memory(),'requests':{k:counts[k]-before[k] for k in counts},'elapsedSeconds':time.monotonic()-started})
   (a.output/'results.json').write_text(json.dumps({'scope':__doc__,'startedAt':started_at,'sourceHashes':SOURCE_HASHES,'publicPhotoSha256':PHOTO_HASH,'browser':version['Browser'],'cycles':rows,'failure':None,'networkAgentEnabled':False,'paidCalls':0,'realWrites':0,'realAppHttpCalls':0,'runtimeErrors':runtime_errors,'blockedUnexpectedRequests':blocked},indent=2)+'\n')
   if (cycle+1)%10==0:print(json.dumps({'cycles':cycle+1,'metrics':metrics,'rssKiB':rows[-1]['rss']['sumRssKiB']}),flush=True)
  if native:(a.output/'final-native-sampling.json').write_text(json.dumps(cdp.send('Memory.getSamplingProfile'),indent=2)+'\n');cdp.send('Memory.stopSampling')
  screenshot=cdp.send('Page.captureScreenshot',{'format':'png'})['data'];(a.output/'final.png').write_bytes(base64.b64decode(screenshot))
 except Exception as error:
  failure=str(error);(a.output/'failure.json').write_text(json.dumps({'error':failure,'cyclesCompleted':len(rows)},indent=2)+'\n');raise
 finally:
  if connection:connection.close()
  browser.terminate()
  try:browser.wait(timeout=10)
  except subprocess.TimeoutExpired:browser.kill();browser.wait()
