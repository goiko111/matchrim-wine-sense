import json
import os
import runpy
from pathlib import Path
from playwright.sync_api import sync_playwright

m = runpy.run_path(str(Path(__file__).with_name('qa-integral-ui.py')))
OUT = Path(__file__).resolve().parents[2] / 'workflows'
OUT.mkdir(parents=True, exist_ok=True)
results = []

def run(browser, name, fn, **settings):
    context,page,wines,requests,errors = m['make_context'](browser, **settings)
    try:
        observed=fn(page,wines,requests)
        assert not errors,errors
        status='PASS'
    except Exception as error:
        observed=str(error)
        status='FAIL'
    page.screenshot(path=str(OUT/(name+'.png')),full_page=True)
    results.append({'case':name,'status':status,'observed':observed,'environment':'local browser; in-memory backend; no real accounts'})
    context.close()
    (OUT/'results.json').write_text(json.dumps(results,indent=2))
    print(name,status,observed,flush=True)

def login(page,wines,requests):
    m['go'](page,'/auth')
    page.locator('input[type=email]').fill('synthetic-login@matchrim.invalid')
    page.locator('input[type=password]').fill('Synthetic-not-real-72!')
    page.locator('button[type=submit]').click()
    page.get_by_role('heading',name='¿Qué quieres elegir?').wait_for()
    assert any(r['path']=='/auth/v1/token' for r in requests)
    return 'mock login and Home redirect; password never real'

def registration(page,wines,requests):
    m['go'](page,'/registration')
    for selector,value in [('#firstName','Prueba'),('#lastName','Sintetica'),('#email','qa-register@matchrim.invalid'),('#password','Synthetic-not-real-72!'),('input[type=tel]','600000000')]:
        page.locator(selector).fill(value)
    page.get_by_role('button',name='Continuar',exact=True).click()
    page.get_by_text('Preferencias de Vino',exact=True).wait_for()
    page.get_by_role('button',name='Continuar',exact=True).click()
    complete=page.get_by_role('button',name='Completar Registro')
    assert complete.is_disabled()
    page.locator('#terms').check(); page.locator('#privacy').check()
    complete.click()
    page.get_by_text('Revisa tu email',exact=True).wait_for()
    assert any(r['path']=='/auth/v1/signup' for r in requests)
    return '3 steps, optional preferences skipped, two legal consents gate, simulated email confirmation (none sent)'

def recovery(page,wines,requests):
    m['go'](page,'/forgot-password')
    page.locator('input[type=email]').fill('qa-recovery@matchrim.invalid')
    page.locator('button[type=submit]').click(); page.wait_for_timeout(300)
    assert any(r['path']=='/auth/v1/recover' for r in requests)
    m['go'](page,'/reset-password')
    assert page.locator('input[type=password]').count()==0
    return 'recovery request intercepted; invalid link cannot submit password'

def reset(page,wines,requests):
    m['go'](page,'/reset-password')
    page.locator('input[type=password]').fill('Synthetic-changed-72!')
    page.locator('button[type=submit]').click(); page.wait_for_timeout(1600)
    assert any(r['path']=='/auth/v1/user' and r['method']=='PUT' for r in requests)
    return 'password PUT in mock only; live recovery/deep link not certified'

def delete(page,wines,requests):
    m['go'](page,'/account/delete')
    submit=page.get_by_role('button',name='Solicitar eliminación',exact=True)
    assert submit.is_disabled()
    page.locator('input[type=checkbox]').check(); submit.click()
    page.get_by_text('Solicitud creada',exact=True).wait_for()
    assert any(r['path'].endswith('/account_deletion_requests') and r['method']=='POST' for r in requests)
    return 'local request only, not immediate deletion and no production deletion'

def account(page,wines,requests):
    m['go'](page,'/profile')
    page.get_by_role('button',name='Ajustes de cuenta').click()
    page.get_by_role('menuitem',name='Privacidad',exact=True).click()
    assert page.url.endswith('/privacy')
    m['go'](page,'/profile')
    page.get_by_role('button',name='Ajustes de cuenta').click()
    page.get_by_role('menuitem',name='Cerrar sesión',exact=True).click()
    page.wait_for_timeout(500)
    assert page.evaluate("localStorage.getItem('matchrim_quiz_result')") is None
    assert page.evaluate("localStorage.getItem('sb-matchrim-integral-auth-token')") is None
    page.reload(); page.wait_for_load_state('networkidle')
    assert page.evaluate("localStorage.getItem('sb-matchrim-integral-auth-token')") is None
    return 'native account access, logout, local cache cleared and remains signed out after reload'

def quiz(page,wines,requests):
    m['go'](page,'/matchrim')
    page.get_by_role('button',name='Comenzar el test',exact=True).click()
    for i in range(20):
        page.get_by_text(f'Pregunta {i+1} de 20',exact=True).wait_for()
        page.get_by_role('radio',name=['Sí','No','Indiferente'][i%3],exact=True).click()
        page.wait_for_timeout(75)
    page.wait_for_timeout(700)
    raw=page.evaluate("localStorage.getItem('matchrim_quiz_result')")
    answers=json.loads(page.evaluate("localStorage.getItem('matchrim_quiz_answers')"))
    assert raw and len(answers)==20
    page.reload(); page.wait_for_load_state('networkidle')
    assert page.get_by_role('button',name='Comenzar el test',exact=True).count()==0
    return {'answers':len(answers),'profile':json.loads(raw),'rapidAnswersWithoutStaleTimer':True,'persistedAnonymous':True}

def cellar(page,wines,requests):
    m['go'](page,'/my-wines')
    page.get_by_role('button',name='Guardar QA vino 0 en favoritos',exact=True).click()
    page.wait_for_timeout(250); assert wines[0]['is_favorite']
    page.get_by_label('Usar QA vino 0 para entrenar perfil',exact=True).click()
    page.wait_for_timeout(250); assert wines[0]['use_for_profile_training'] is False
    page.on('dialog',lambda dialog:dialog.accept())
    page.get_by_role('button',name='Eliminar QA vino 0',exact=True).click()
    page.wait_for_timeout(400); assert not wines
    return 'favorite, explicit learning opt-out, delete; all local mutations'

def manual(page,wines,requests):
    m['go'](page,'/my-wines/add')
    page.get_by_label('Nombre del Vino *',exact=True).fill('QA vino manual')
    page.get_by_role('button',name='He revisado el nombre',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='Mi Bodega',exact=True).click()
    page.get_by_role('button',name='Confirmar',exact=True).click()
    page.wait_for_timeout(500)
    assert any(w['name']=='QA vino manual' for w in wines)
    assert all('rating' not in w or w['rating'] is None for w in wines if w['name']=='QA vino manual')
    return 'manual verification, save without taste inference, optional place'

def guide_layout(page,wines,requests):
    m['go'](page,'/')
    dialog=page.get_by_role('dialog')
    dialog.wait_for()
    assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth')
    for step in range(2): dialog.get_by_role('button',name='Continuar',exact=True).click()
    button=dialog.get_by_role('button',name='Empezar',exact=True); button.scroll_into_view_if_needed()
    box=button.bounding_box(); assert box and box['height']>=44
    assert box['y']>=0 and box['y']+box['height']<=page.viewport_size['height']
    page.screenshot(path=str(OUT/f"guide-{page.viewport_size['width']}x{page.viewport_size['height']}.png"))
    return {'target':box,'largeText':True,'reducedMotion':True,'dialogScrollable':True}

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=m['CHROME'])
    try:
        for name,fn,auth,profile in [
          ('login',login,False,True),('registration',registration,False,True),('recovery-invalid',recovery,False,True),
          ('reset-mocked-session',reset,True,True),('deletion-consent',delete,True,True),('account-logout',account,True,True),
          ('quiz-20-rapid-answers',quiz,False,False),('cellar-favorite-training-delete',cellar,True,True),('manual-wine-save',manual,True,True),
        ]: run(browser,name,fn,authenticated=auth,profile=profile)
        for width,height in [(320,852),(393,852),(852,393)]:
            run(browser,f'guide-layout-{width}',guide_layout,authenticated=False,profile=False,width=width,height=height,large=True)
    finally: browser.close()
