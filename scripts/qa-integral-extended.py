"""Scoped final regressions. All responses and identities are local fixtures."""
import json
import os
import runpy
from pathlib import Path
from playwright.sync_api import sync_playwright

m = runpy.run_path(str(Path(__file__).with_name('qa-integral-ui.py')))
OUT = Path(__file__).resolve().parents[2] / ('extended-' + os.environ.get('QA_EXTENDED_PHASE', 'final'))
OUT.mkdir(parents=True, exist_ok=True)
results = []
wine_text = 'Fixture local, no recomendacion real.\n' + '\n'.join(
    f'### {i}. QA alternativa {i}\n\n**Recomendación:** QA alternativa {i}\n- **Tipo:** Blanco\n- **Bodega:** Ficticia\n- **Región:** QA\n- **País:** QA\n- **Precio aproximado:** No verificado\n\n**Por qué funciona:** Hipotesis de acidez. Faltan ficha y validacion humana.\n'
    for i in range(1, 4))
pairing_text = '**Puntuación del maridaje:** 6/10\n\n**Evaluación general:** Fixture, no juicio sensorial real\n\n**Aspectos positivos:**\n- Acidez\n\n**Aspectos a considerar:**\n- Faltan datos\n\n**Alternativas si no es ideal:** QA alternativa'

def sse(route, text):
    route.fulfill(status=200, content_type='text/event-stream',
      body='data: ' + json.dumps({'choices':[{'delta':{'content':text}}]}) + '\n\ndata: [DONE]\n\n',
      headers={'Access-Control-Allow-Origin':'*'})

def run(browser, name, fn, **settings):
    context,page,wines,requests,errors=m['make_context'](browser, **settings)
    try:
        observed=fn(context,page,wines,requests)
        assert not errors, errors
        status='PASS'
    except Exception as error:
        observed=str(error); status='FAIL'
    page.screenshot(path=str(OUT/(name+'.png')),full_page=True)
    results.append({'case':name,'status':status,'observed':observed,'environment':'local final browser; mock/SSE fixtures; zero real backend'})
    (OUT/'results.json').write_text(json.dumps(results,indent=2))
    print(name,status,observed,flush=True)
    context.close()

def guided(kind):
    def check(context,page,wines,requests):
        payloads=[]
        def handler(route):
            payloads.append(route.request.post_data_json)
            sse(route,pairing_text if kind=='pairing-check' else wine_text)
        page.route('**/functions/v1/ai-wine-chat',handler)
        m['go'](page,'/inteligencia-liquida?function='+kind)
        analyze=page.get_by_role('button',name='Analizar',exact=True)
        assert analyze.is_disabled()
        page.locator('#airim-guided-input-1').fill('QA vino' if kind!='wine-for-dish' else 'QA plato con salsa')
        if kind=='pairing-check':
            assert analyze.is_disabled()
            page.locator('#airim-guided-input-2').fill('QA plato')
        analyze.click()
        page.get_by_role('button',name='Nuevo',exact=True).wait_for()
        assert payloads[0]['functionType']==kind
        assert 'Código Matchrim' in payloads[0]['context']
        assert page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth')
        page.get_by_role('button',name='Nuevo',exact=True).click()
        assert page.locator('#airim-guided-input-1').input_value()==''
        page.get_by_role('button',name='Volver a aiRIM',exact=True).click()
        page.get_by_role('heading',name='¿Qué necesitas decidir?').wait_for()
        return {'function':kind,'profileSentToLocalFixture':True,'clearAndBack':True,'sensoryValidity':False}
    return check

def occasion(context,page,wines,requests):
    payloads=[]
    def handler(route):
        payloads.append(route.request.post_data_json); sse(route,wine_text)
    page.route('**/functions/v1/ai-wine-chat',handler)
    m['go'](page,'/inteligencia-liquida?function=special-moments')
    page.get_by_role('button',name='Cena con amigos',exact=True).press('Enter')
    for option in ['3-4 personas','Mariscos','Expertos / Sommeliers','Sorprender moderadamente','15 € - 30 €']:
        page.get_by_role('button',name=option,exact=True).click()
    page.get_by_text('QA alternativa 1',exact=True).first.wait_for()
    assert payloads[0]['eventDetails']['budget']=='15 € - 30 €'
    page.get_by_role('button',name='Volver a preguntas',exact=True).click()
    page.get_by_text('Pregunta 5 de 5',exact=True).wait_for()
    return {'questions':5,'budgetCaptured':True,'keyboardSelection':True,'personalProfileIncluded':False}

def empty_stream(context,page,wines,requests):
    page.route('**/functions/v1/ai-wine-chat',lambda route:sse(route,''))
    m['go'](page,'/inteligencia-liquida?function=wine-for-dish')
    page.locator('#airim-guided-input-1').fill('QA plato')
    page.get_by_role('button',name='Analizar',exact=True).click()
    page.get_by_text('No se pudo procesar tu consulta. Inténtalo de nuevo.',exact=True).first.wait_for(timeout=2500)
    assert page.locator('#airim-guided-input-1').input_value()=='QA plato'
    return 'empty provider stream shows actionable error; input preserved'

def cancel(context,page,wines,requests):
    page.add_init_script("""(() => {
      const original=window.fetch;
      window.fetch=(url,options={}) => String(url).includes('/ai-wine-chat') ? new Promise((resolve,reject) => {
        options.signal.addEventListener('abort',() => reject(new DOMException('Aborted','AbortError')),{once:true});
      }) : original(url,options);
    })();""")
    m['go'](page,'/inteligencia-liquida')
    page.locator('#airim-quick-question').fill('QA consulta cancelada')
    page.get_by_role('button',name='Abrir conversación',exact=True).click()
    page.get_by_role('button',name='Enviar pregunta',exact=True).click()
    page.get_by_role('button',name='Cancelar consulta',exact=True).click()
    page.wait_for_timeout(400)
    assert page.locator('#airim-question').input_value()=='QA consulta cancelada', 'cancel lost the question'
    assert page.get_by_role('region',name='Conversación con aiRIM').get_by_text('QA consulta cancelada',exact=True).count()==0, 'cancel retained a duplicate conversation bubble'
    assert page.get_by_role('button',name='Enviar pregunta').is_enabled(), 'send remains disabled after cancel'
    return 'cancel restores input, removes pending duplicate, no provider call'

def chat_error(context,page,wines,requests):
    calls=[]
    def handler(route):
        calls.append(1)
        route.fulfill(status=503 if len(calls)==1 else 200,content_type='application/json',body=json.dumps(
          {'error':'QA unavailable'} if len(calls)==1 else {'success':True,'response':'Fixture retry successful; not a recommendation'}),headers={'Access-Control-Allow-Origin':'*'})
    page.route('**/functions/v1/ai-wine-chat',handler)
    m['go'](page,'/inteligencia-liquida')
    page.locator('#airim-quick-question').fill('QA reintento')
    page.get_by_role('button',name='Abrir conversación').click()
    send=page.get_by_role('button',name='Enviar pregunta',exact=True); send.click()
    page.wait_for_timeout(400)
    assert page.locator('#airim-question').input_value()=='QA reintento'
    send.click(); page.get_by_text('Fixture retry successful; not a recommendation',exact=True).wait_for()
    assert page.get_by_text('QA reintento',exact=True).count()==1
    return '503 preserves question; retry produces exactly one user message'

def cellar_error(context,page,wines,requests):
    broken=[True]
    def handler(route):
        if broken[0]: route.fulfill(status=503,content_type='application/json',body='{"message":"QA unavailable"}',headers={'Access-Control-Allow-Origin':'*'})
        else: route.fallback()
    page.route('**/rest/v1/user_wines*',handler)
    m['go'](page,'/my-wines')
    page.get_by_text('No hemos podido cargar tus vinos',exact=True).wait_for()
    assert page.get_by_text('Aún no tienes vinos',exact=False).count()==0
    broken[0]=False
    page.get_by_role('button',name='Reintentar',exact=True).click()
    page.get_by_role('heading',name='QA vino 0',exact=True).wait_for()
    return 'error is not empty collection; retry restores wines'

def cellar_tabs(context,page,wines,requests):
    m['go'](page,'/my-wines')
    tabs=page.get_by_role('tab')
    names=tabs.all_text_contents(); assert len(names)==5
    for index in range(5): tabs.nth(index).click(); page.wait_for_timeout(80)
    m['go'](page,'/my-wines')
    page.get_by_role('button',name='Me encanta',exact=True).click()
    page.wait_for_timeout(350)
    assert wines[0]['quantity']==3
    return {'tabs':names,'ratingEditDidNotConsume':True}

def profile(context,page,wines,requests):
    m['go'](page,'/profile')
    page.get_by_role('tab',name='Historial',exact=True).click()
    assert page.get_by_role('tabpanel').inner_text()
    page.get_by_role('tab',name='Perfil Sensorial',exact=True).click()
    assert page.get_by_text('Perfil aprendido activo',exact=True).count()==1
    return 'sensory/history tabs; explicit rating learning visible; empty catalog remains empty'

def restaurant(opt_in):
    def check(context,page,wines,requests):
        payloads=[]
        def handler(route):
            payloads.append(route.request.post_data_json)
            route.fulfill(status=201,content_type='application/json',body='{"id":"local-restaurant"}',headers={'Access-Control-Allow-Origin':'*'})
        page.route('**/rest/v1/restaurant_matchrim_sessions*',handler)
        m['go'](page,'/usar-matchrim?mode=scanner')
        page.locator('#restaurant-name').fill('Restaurante QA ficticio')
        page.locator('#restaurant-address').fill('Ciudad QA')
        checkbox=page.locator('#share-restaurant-signal'); assert not checkbox.is_checked()
        if opt_in: checkbox.click()
        page.get_by_role('button',name='Guardar restaurante y escanear',exact=True).click()
        page.wait_for_timeout(700)
        assert payloads and payloads[0]['source']==('restaurant_lead_opt_in' if opt_in else 'private_matchrim_session')
        return {'optIn':opt_in,'source':payloads[0]['source'],'profileInPrivateSessionRow':'matchrim_profile' in payloads[0],
          'liveLeadProjectionOrRLSVerified':False}
    return check

def restaurant_catalog(context,page,wines,requests):
    m['go'](page,'/usar-matchrim')
    page.get_by_role('button',name='Ver vinos recomendados',exact=True).click()
    page.wait_for_timeout(700)
    assert any('winerim' in r['path'] or 'matchrim-recommendations' in r['path'] for r in requests), requests
    return 'empty local API result and no invented wines; external carta link not opened'

def restaurant_filters_save(context,page,wines,requests):
    catalog=[{'id':f'qa-{i}','name':f'QA carta {i}','winery':'Ficticia','region':'QA','country':'QA',
      'type':'Blanco' if i==0 else 'Tinto','section':'Por copa' if i==0 else 'Botellas','matchPercentage':90-i*10,
      'prices':[{'price':8 if i==0 else 28,'currency':'EUR','kind':'glass' if i==0 else 'bottle',
        'label':'copa' if i==0 else 'botella'}],
      'tastingAttributes':{'power':3,'acidity':4,'sweetness':1,'tannin':2,'fruity':4}} for i in range(2)]
    def handler(route):
        route.fulfill(status=200,content_type='application/json',body=json.dumps({'results':catalog,'total':2}),headers={'Access-Control-Allow-Origin':'*'})
    page.route('**/functions/v1/matchrim-recommendations*',handler)
    m['go'](page,'/usar-matchrim')
    page.get_by_role('button',name='Ver vinos recomendados',exact=True).click()
    page.locator('#winerim-max-price').wait_for()
    page.locator('#winerim-max-price').fill('10')
    assert page.get_by_role('heading',name='QA carta 0',exact=True).is_visible()
    assert page.get_by_role('heading',name='QA carta 1',exact=True).count()==0
    for selector,option in [('#winerim-sort','Precio menor'),('#winerim-type','Blanco'),('#winerim-section','Por copa')]:
        page.locator(selector).click(); page.get_by_role('option',name=option,exact=True).click()
    save=page.get_by_role('button',name='Guardar en Quiero Probar',exact=True)
    save.click(); page.get_by_role('button',name='Guardado en Quiero Probar',exact=True).wait_for()
    saved=[wine for wine in wines if wine['name']=='QA carta 0']; assert len(saved)==1
    assert saved[0]['status']=='wishlist' and saved[0]['use_for_profile_training'] is False
    assert saved[0].get('rating') is None
    return 'catalog fixtures: price/type/service/sort, wishlist save, no learning inferred'

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=m['CHROME'])
    try:
        for kind in ['wine-for-dish','dish-for-wine','pairing-check']: run(browser,'guided-'+kind,guided(kind))
        for name,fn in [('occasion-keyboard-budget',occasion),('guided-empty-stream',empty_stream),('chat-cancel',cancel),
          ('chat-error-retry',chat_error),('cellar-error-retry',cellar_error),('cellar-five-tabs',cellar_tabs),
          ('profile-history-learning',profile),('restaurant-private',restaurant(False)),('restaurant-lead-opt-in',restaurant(True)),
          ('restaurant-empty-catalog',restaurant_catalog),('restaurant-filters-save',restaurant_filters_save)]: run(browser,name,fn)
    finally: browser.close()
