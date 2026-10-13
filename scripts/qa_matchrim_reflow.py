"""Content-specific assertions for the two enlarged-text routes; no remote mutations."""
from urllib.parse import urlparse
import re

TEXT_BOUNDS = """main=>{
 const issues=[],texts=[],walker=document.createTreeWalker(main,NodeFilter.SHOW_TEXT);
 const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
 for(let n=walker.nextNode();n;n=walker.nextNode()){
  if(!n.textContent.trim())continue;
  const el=n.parentElement,b=box(el),s=getComputedStyle(el);
  if(!b.width||!b.height||el.closest('.sr-only,[aria-hidden="true"]'))continue;
  const range=document.createRange();range.selectNode(n);
  const rects=[...range.getClientRects()].filter(r=>r.width&&r.height);
  const errors=[];
  for(const r of rects){
   if(r.x<b.x-1||r.right>b.right+1)errors.push('text exceeds own horizontal bounds');
   const control=el.closest('button,a,[role="tab"]');
   if(control){const c=box(control);if(r.x<c.x-1||r.right>c.right+1||r.y<c.y-2||r.bottom>c.bottom+2)errors.push('text exceeds control');}
   for(let p=el;p&&p!==main.parentElement;p=p.parentElement){
    const ps=getComputedStyle(p),pb=box(p);
    if(['hidden','clip','auto'].includes(ps.overflowX)&&(r.x<pb.x-1||r.right>pb.right+1))errors.push('ancestor clips horizontally');
    if(['hidden','clip'].includes(ps.overflowY)&&(r.y<pb.y-2||r.bottom>pb.bottom+2))errors.push('ancestor clips vertically');
   }
  }
  if(s.textOverflow==='ellipsis'&&el.scrollWidth>el.clientWidth+1)errors.push('ellipsis');
  const result={text:n.textContent.trim(),tag:el.tagName,box:b,errors:[...new Set(errors)]};texts.push(result);
  if(errors.length)issues.push(result);
 }
 return {texts,issues};
}"""

def check_content(page, nav, authenticated, output, name, base_url):
    main=page.locator('main').first
    results={'text':main.evaluate(TEXT_BOUNDS),'controls':[],'destinations':[],'failures':[]}
    results['failures'] += [i['text']+': '+','.join(i['errors']) for i in results['text']['issues']]
    if not authenticated:
        main.get_by_role('button').first.focus()
        order=[]
        for index in range(5):
            order.append(page.evaluate('document.activeElement.textContent.trim()'))
            if index<4:page.keyboard.press('Tab')
        expected=['Carta de vinos','Etiqueta de vino','Menú de comida','Plato','Encontrar vino']
        if not all(text.startswith(label) for text,label in zip(order,expected)):results['failures'].append('scan option keyboard order')
        results['keyboardOrder']=order
    # Measure every visible control, but only activate read-only navigation below.
    controls=main.locator('button,input,a,[role="tab"]')
    for index in range(controls.count()):
        control=controls.nth(index)
        if not control.is_visible():continue
        control.evaluate("e=>{const r=e.getBoundingClientRect(),nav=document.querySelector('nav[aria-label=\"Navegación principal\"]');const n=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().height:0;window.scrollTo({top:window.scrollY+r.y+r.height/2-(innerHeight-n)/2,behavior:'instant'})}")
        data=control.evaluate("""e=>{const b=e.getBoundingClientRect();return {text:e.getAttribute('aria-label')||e.textContent.trim()||e.getAttribute('placeholder'),role:e.getAttribute('role'),documentTop:b.y+scrollY,box:{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom},hit:[.2,.5,.8].map(x=>e.contains(document.elementFromPoint(b.x+b.width*x,b.y+b.height/2)))}}""")
        if data['box']['width']<43.5 or data['box']['height']<43.5:results['failures'].append(data['text']+': below44')
        if not all(data['hit']):results['failures'].append(data['text']+': hit-test')
        results['controls'].append(data)
        if authenticated and control.get_attribute('role')=='tab':
            page.screenshot(path=str(output/(name+'-tab-'+str(index)+'.png')))
        if authenticated and (data['text'] in ['Añadir vino','Escanear algo','Puntuar pendientes','Busca vino o bodega...'] or data['text'].startswith('Mi BodegaTengo')):
            page.screenshot(path=str(output/(name+'-control-'+str(index)+'.png')))
        if not authenticated:
            page.screenshot(path=str(output/(name+'-option-'+str(index)+'.png')))
    for index,a in enumerate(results['controls']):
        for b in results['controls'][index+1:]:
            if min(a['box']['right'],b['box']['right'])>max(a['box']['x'],b['box']['x'])+1 and min(a['documentTop']+a['box']['height'],b['documentTop']+b['box']['height'])>max(a['documentTop'],b['documentTop'])+1:
                results['failures'].append(a['text']+' overlaps '+b['text'])
    if authenticated:
        for label,path in [('Mi Bodega','collection'),('Quiero Probar','wishlist'),('Ya Probados','tasted'),('Favoritos','favorites'),('No repetir','no-repetir')]:
            tab=page.get_by_role('tab',name=label,exact=False)
            tab.focus();page.keyboard.press('Enter')
            page.wait_for_url('**/my-wines/'+path)
            assert tab.get_attribute('aria-selected')=='true'
            results['destinations'].append({'label':label,'path':urlparse(page.url).path})
    else:
        options=[('Carta de vinos','carta-vinos'),('Etiqueta de vino','etiqueta'),('Menú de comida','menu-comida'),('Plato','plato'),('Encontrar vino','encontrar-vino')]
        for label,path in options:
            page.goto(base_url+'/escanear',wait_until='networkidle')
            option=page.get_by_role('button',name=re.compile('^'+re.escape(label)+r'\b'))
            option.focus();page.keyboard.press('Enter')
            page.wait_for_url('**/escanear/'+path)
            assert page.locator('#scan-privacy-title').is_visible()
            assert page.get_by_role('button',name='Entiendo y continuar',exact=True).is_disabled()
            assert page.evaluate("localStorage.getItem('matchrim.scan_privacy_notice.v2')") is None
            results['destinations'].append({'label':label,'path':urlparse(page.url).path,'privacyGate':'unaccepted'})
    return results
