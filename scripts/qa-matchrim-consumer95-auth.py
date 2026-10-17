"""Auth95: actual built routes, existing D Transport only, no outbound connections."""
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import traceback

sys.dont_write_bytecode = True
os.umask(0o077)
REPO = Path('/Users/GOIKO/2matchrim76-recognition-20261008')
ROOT = Path('/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim95-eight-hours-20261017')
OUT = ROOT / 'A95/auth95'
RUN = OUT / (sys.argv[1] if len(sys.argv) > 1 else 'ui')
assert RUN.parent == OUT
RUN.mkdir(parents=True, exist_ok=False)
spec = importlib.util.spec_from_file_location('existing_d', REPO / 'scripts/qa-matchrim-consumer95-journeys.py')
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
frozen = {str(p.relative_to(OUT / 'build')): p.read_bytes() for p in (OUT / 'build').rglob('*') if p.is_file()}
persona = json.loads((ROOT / 'personas/synthetic-profiles.json').read_text())[0]
BASE = 'http://127.0.0.1:4695'
results, contexts = [], []


def audit(page, case, native):
    page.evaluate('''async () => {
      await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    }''')
    info = page.evaluate('''() => {
      const visible = el => {const r=el.getBoundingClientRect(),s=getComputedStyle(el);
        return r.width>1 && r.height>1 && s.display!=='none' && s.visibility!=='hidden' && !el.closest('[aria-hidden="true"]');};
      const issues=[], checked=[], fixedLayerIntersections=[];
      for(const el of document.querySelectorAll('button,a,input:not([type=hidden]),[role=tab]')) {
        if(!visible(el)||el.closest('[role=status],[data-sonner-toaster]')) continue;
        const r=el.getBoundingClientRect(), role=el.getAttribute('role');
        let target=el;
        if(role==='checkbox'||role==='radio') target=el.labels?.[0]||el.closest('label')||document.querySelector('label[for="'+el.id+'"]')||el;
        const hit=target.getBoundingClientRect();
        const name=el.getAttribute('aria-label')||el.textContent?.trim()||el.id||el.type;
        checked.push({name,role,width:r.width,height:r.height,hitWidth:hit.width,hitHeight:hit.height});
        const ownedQuiz=Boolean(el.closest('.matchrim-native-quiz-question'));
        if(hit.width<43.9||hit.height<43.9) issues.push({name,kind:'small-hit',width:hit.width,height:hit.height,ownedQuiz});
        if(r.left < -1 || r.right > innerWidth+1) issues.push({name,kind:'offscreen-x',left:r.left,right:r.right,ownedQuiz});
        if(role==='combobox') {
          const labelled=el.labels?.length||el.getAttribute('aria-labelledby')||el.getAttribute('aria-label');
          if(!el.id||!labelled) issues.push({name,kind:'missing-visible-label'});
        }
      }
      const hiddenSelects=[...document.querySelectorAll('select[aria-hidden=true]')].map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,clip:getComputedStyle(el).clip}));
      const globalOverflowElements=[...document.querySelectorAll('body *')].filter(el=>visible(el)&&getComputedStyle(el).opacity!=='0')
        .filter(el=>{const r=el.getBoundingClientRect();return r.left < -1 || r.right > innerWidth+1;})
        .map(el=>({tag:el.tagName,role:el.getAttribute('role'),name:el.textContent?.trim().slice(0,100),classes:el.getAttribute('class'),left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right})).slice(0,25);
      const quiz=document.querySelector('.matchrim-native-quiz-question');
      const ownedQuizOverflow=quiz ? quiz.scrollWidth>quiz.clientWidth+1 || quiz.getBoundingClientRect().right>innerWidth+1 : null;
      const targets=[...document.querySelectorAll('button,a')].filter(el=>visible(el)&&!el.closest('[role=status],[data-sonner-toaster]'));
      const layer=el=>{for(let p=el;p&&p!==document.body;p=p.parentElement)if(['fixed','sticky'].includes(getComputedStyle(p).position))return p;return document.body;};
      for(let i=0;i<targets.length;i++) for(let j=i+1;j<targets.length;j++) {
        const a=targets[i],b=targets[j];if(a.contains(b)||b.contains(a))continue;
        const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();
        if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>1&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>1) {
          const overlap={kind:'overlap',a:a.textContent?.trim()||a.getAttribute('aria-label'),b:b.textContent?.trim()||b.getAttribute('aria-label')};
          if(layer(a)===layer(b))issues.push(overlap);else fixedLayerIntersections.push(overlap);
        }
      }
      for(const option of document.querySelectorAll('[role=option]')) if(visible(option)&&option.getBoundingClientRect().height<43.9)
        issues.push({kind:'small-option',name:option.textContent?.trim(),height:option.getBoundingClientRect().height});
      return {width:innerWidth,rootFont:getComputedStyle(document.documentElement).fontSize,
        overflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)>innerWidth+1,
        checked,issues,hiddenSelects,fixedLayerIntersections,globalOverflowElements,ownedQuizOverflow};
    }''')
    page.screenshot(path=str(RUN / f'{case}.png'), full_page=True)
    page.screenshot(path=str(RUN / f'{case}.viewport.png'), full_page=False)
    (RUN / f'{case}.aria.txt').write_text(page.locator('body').aria_snapshot())
    results.append({'case': case, 'native': native, **info})
    if native:
        if case.endswith('-quiz') or case.endswith('-quiz-last'):
            assert not info['ownedQuizOverflow'], f'{case} owned QuizQuestion overflow'
        else:
            assert not info['overflow'], f'{case} horizontal overflow'
        owned_issues = [issue for issue in info['issues'] if issue.get('ownedQuiz', True)] if case.endswith(('-quiz','-quiz-last')) else info['issues']
        assert not owned_issues, f'{case}: {owned_issues}'


def label_tap(page, control_id):
    control = page.locator('#' + control_id)
    label = page.locator(f'label[for="{control_id}"]')
    control.scroll_into_view_if_needed()
    label.scroll_into_view_if_needed()
    rect = label.bounding_box()
    before = control.get_attribute('data-state')
    # Padding far from the 16px checkbox proves the associated label is the target.
    x, y = rect['x'] + rect['width'] - 4, rect['y'] + rect['height'] / 2
    assert page.evaluate('''([x,y,id])=>document.elementFromPoint(x,y)?.closest('label')?.htmlFor===id''', [x,y,control_id])
    page.mouse.click(x,y)
    d.expect(control).to_have_attribute('data-state', 'unchecked' if before == 'checked' else 'checked')
    box = control.bounding_box()
    assert abs(box['width']-16)<.2 and abs(box['height']-16)<.2, 'Only label hit area grows, not the checkbox'
    return {'id': control_id, 'labelHit': [rect['width'], rect['height']], 'checkbox': [box['width'], box['height']], 'actualPointHitLabel': True}


def run_case(browser, index, native, width, height, font):
    name = f'{"native" if native else "web"}-{width}x{height}-font{font}'
    tr = d.Transport(frozen, BASE, persona, index, authenticated=False)
    ctx = browser.new_context(viewport={'width':width,'height':height}, reduced_motion='reduce', locale='es-ES', service_workers='block')
    ctx.route('**/*', tr.route)
    ctx.route_web_socket(re.compile('.*'), tr.websocket)
    ctx.add_init_script('''(() => {const s=%s;
      if(s.native) window.CapacitorCustomPlatform={name:'ios'};
      document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize=s.font+'px';
        if(s.native){document.documentElement.style.setProperty('--matchrim-native-safe-top','59px');document.documentElement.style.setProperty('--matchrim-native-safe-bottom','34px');}});
    })();''' % json.dumps({'native':native,'font':font}))
    page = ctx.new_page()
    errors, taps = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    rec = {'case':name,'native':native,'viewport':[width,height],'font':font,'passed':False}
    contexts.append(rec)
    try:
        page.goto(BASE+'/auth', wait_until='networkidle')
        d.expect(page.get_by_role('tab',name='Iniciar Sesión',exact=True)).to_be_visible()
        audit(page,name+'-auth',native)
        page.get_by_role('tab',name='Registrarse',exact=True).click()
        audit(page,name+'-signup-tab',native)
        page.get_by_role('tab',name='Iniciar Sesión',exact=True).click()
        page.locator('input[type=email]').fill('auth95@matchrim.invalid')
        page.locator('input[type=password]').fill(d.PASSWORD)
        page.get_by_role('button',name='Mostrar contraseña',exact=True).click()
        d.expect(page.locator('input[autocomplete=current-password]')).to_have_attribute('type','text')
        tr.failure='login'
        page.get_by_role('button',name='Iniciar Sesión',exact=True).click()
        d.expect(page.get_by_role('button',name='Iniciar Sesión',exact=True)).to_be_enabled()
        page.locator('a[href="/forgot-password"]').click()
        page.wait_for_load_state('networkidle')
        page.locator('input[type=email]').fill('recover95@matchrim.invalid')
        audit(page,name+'-forgot',native)
        page.locator('form button[type=submit]').click()
        d.expect(page.locator('a[href="/auth"]')).to_be_visible()
        audit(page,name+'-forgot-sent',native)
        page.locator('a[href="/auth"]').click()
        d.expect(page.locator('input[type=email]')).to_be_visible()
        page.goto(BASE+'/registration',wait_until='networkidle')
        nxt=page.get_by_role('button',name='Continuar',exact=True)
        d.expect(nxt).to_be_disabled()
        email='a'*60+'@'+'b'*50+'.'+'c'*40+'.matchrim.invalid'
        for selector,value in [('#firstName','Synthetic'),('#lastName','Auth95'),('#email',email),('#password',d.PASSWORD),('input[type=tel]','600000000')]:
            page.locator(selector).fill(value)
        if native:
            assert page.get_by_text(re.compile('Google Places|API key|clé API')).count()==0
            for control_id in ['phoneDial','preferredLanguage','country']:
                select=page.locator('#'+control_id)
                expected_name={'phoneDial':'Teléfono *','preferredLanguage':'Idioma Preferido','country':'País'}[control_id]
                d.expect(page.get_by_role('combobox',name=expected_name,exact=True)).to_have_attribute('id',control_id)
                select.click()
                d.expect(page.get_by_role('listbox')).to_be_visible()
                audit(page,name+'-select-'+control_id,native)
                page.keyboard.press('Escape')
        audit(page,name+'-registration-basic',native)
        nxt.click()
        d.expect(page.get_by_text('Preferencias de Vino',exact=True)).to_be_visible()
        if native:
            taps.append(label_tap(page,'sin_sulfito'))
            taps.append(label_tap(page,'sin_sulfito'))
        audit(page,name+'-registration-preferences',native)
        page.get_by_role('button',name='Continuar',exact=True).click()
        complete=page.get_by_role('button',name='Completar Registro',exact=True)
        d.expect(complete).to_be_disabled()
        if native:
            taps.append(label_tap(page,'terms'))
        else:
            page.locator('#terms').check()
        d.expect(complete).to_be_disabled()
        if native:
            # Opening the legal link must not grant the other consent.
            with page.expect_popup() as popup:
                page.locator('a[href="/privacy"][target="_blank"]').click()
            popup.value.close()
            d.expect(page.locator('#privacy')).to_have_attribute('data-state','unchecked')
            taps.append(label_tap(page,'privacy'))
        else:
            page.locator('#privacy').check()
        d.expect(complete).to_be_enabled()
        audit(page,name+'-registration-final',native)
        tr.failure='signup'
        complete.click()
        d.expect(page.get_by_text('Error en el registro',exact=True).first).to_be_visible()
        d.expect(complete).to_be_enabled()
        audit(page,name+'-registration-error',native)
        tr.failure=None
        complete.click()
        d.expect(page.get_by_text('Revisa tu email',exact=True)).to_be_visible(timeout=10000)
        assert tr.active is None
        audit(page,name+'-registration-confirmation',native)
        if native:
            page.goto(BASE+'/matchrim',wait_until='networkidle')
            page.get_by_role('button',name='Comenzar el test',exact=True).click()
            d.expect(page.get_by_role('button',name='Salir del test',exact=True)).to_be_visible()
            fragments=page.locator('.matchrim-native-quiz-question button').evaluate_all('''buttons=>buttons.flatMap(button=>{
              const walker=document.createTreeWalker(button,NodeFilter.SHOW_TEXT),out=[];let node;
              while(node=walker.nextNode()) for(const match of node.textContent.matchAll(/\\S+/g)) {
                const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
                const lines=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);
                if(lines.length>1)out.push({word:match[0],lines:lines.map(r=>({x:r.x,y:r.y,width:r.width,height:r.height}))});
              } return out;
            })''')
            rec['quizWordFragments']=fragments
            assert not fragments, f'Quiz word fragmented: {fragments}'
            page.get_by_role('button',name='Siguiente',exact=True).scroll_into_view_if_needed()
            audit(page,name+'-quiz',native)
            page.get_by_role('radio',name='Me gusta',exact=True).check()
            d.expect(page.get_by_role('button',name='Siguiente',exact=True)).to_be_enabled()
            page.get_by_role('button',name='Siguiente',exact=True).click()
            previous=page.get_by_role('button',name='Anterior',exact=True)
            d.expect(previous).to_be_enabled()
            previous.click()
            d.expect(previous).to_be_disabled()
            for _ in range(19):
                page.get_by_role('radio',name='Me gusta',exact=True).check()
                page.get_by_role('button',name='Siguiente',exact=True).click()
            d.expect(page.get_by_role('button',name='Ver mi perfil',exact=True)).to_be_visible()
            d.expect(page.get_by_role('button',name='Ver mi perfil',exact=True)).to_be_disabled()
            page.get_by_role('radio',name='Me gusta',exact=True).check()
            d.expect(page.get_by_role('button',name='Ver mi perfil',exact=True)).to_be_enabled()
            profile_fragments=page.get_by_role('button',name='Ver mi perfil',exact=True).evaluate('''button=>{
              const node=[...button.childNodes].find(n=>n.nodeType===Node.TEXT_NODE),out=[];
              for(const m of node.textContent.matchAll(/\\S+/g)) {const r=document.createRange();r.setStart(node,m.index);r.setEnd(node,m.index+m[0].length);if(r.getClientRects().length>1)out.push(m[0]);}return out;
            }''')
            assert not profile_fragments, profile_fragments
            rec['quizLastWordFragments']=profile_fragments
            page.get_by_role('button',name='Ver mi perfil',exact=True).scroll_into_view_if_needed()
            audit(page,name+'-quiz-last',native)
            page.get_by_role('button',name='Salir del test',exact=True).click()
        assert not errors, errors
        assert not tr.safety_errors, tr.safety_errors
        assert not tr.unmodeled, tr.unmodeled
        rec['passed']=True
    except Exception as error:
        rec.update(error=str(error),traceback=traceback.format_exc())
        page.screenshot(path=str(RUN/(name+'-FAIL.png')),full_page=True)
    finally:
        rec.update(taps=taps,pageErrors=errors,transportEvents=tr.events,safetyErrors=tr.safety_errors,unmodeled=tr.unmodeled)
        ctx.close()
        (RUN/'results.json').write_text(json.dumps({'contexts':contexts,'layouts':results},indent=2)+'\n')
        print(json.dumps({k:v for k,v in rec.items() if k not in ('transportEvents','traceback','taps')}),flush=True)


with d.sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=d.CHROME,args=['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--disable-quic','--no-proxy-server','--host-resolver-rules=MAP * ~NOTFOUND'])
    try:
        modes=[(True,393,852,16),(True,320,740,16),(True,852,393,16),(True,393,852,24),(True,320,740,24),(True,393,852,32),(True,320,740,32),(False,393,852,16),(False,1200,900,16)]
        if '--critical' in sys.argv:
            modes=[(True,320,740,32)]
        for i,mode in enumerate(modes):
            run_case(browser,i,*mode)
    finally:
        browser.close()
assert all(case['passed'] for case in contexts), 'Auth95 controlled UI failures; see results.json'
assert not any(case['native'] and case['overflow'] for case in results), 'Global overflow outside owned QuizQuestion may remain; see globalOverflowElements, not waived'
