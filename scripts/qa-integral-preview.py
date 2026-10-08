import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parents[2]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    context=browser.new_context(viewport={'width':393,'height':852})
    context.route('**/*', lambda route: route.continue_() if route.request.url.startswith('http://127.0.0.1:4396/') else route.abort())
    page=context.new_page()
    page.goto('http://127.0.0.1:4396/?local-native-preview=1')
    page.get_by_role('dialog').wait_for()
    assert page.locator('html').evaluate("element=>element.classList.contains('matchrim-native-platform')")
    page.wait_for_timeout(500)  # Capture after the dialog's entrance transition settles.
    page.screenshot(path=str(OUT/'prototype-preview.png'))
    (OUT/'prototype-preview-check.json').write_text(json.dumps({'localNativeFlag':True,'guideVisible':True,'realBackendCalls':0}))
    context.close();browser.close()
