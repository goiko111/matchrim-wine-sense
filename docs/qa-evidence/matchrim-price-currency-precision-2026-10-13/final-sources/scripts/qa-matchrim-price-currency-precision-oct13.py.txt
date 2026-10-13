"""Isolated real MenuPriceEditor controls, no App/auth/catalog/provider. Synthetic money values only."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='http://127.0.0.1:4477')
p.add_argument('--output', type=Path, required=True)
p.add_argument('--cases', default='JPY:portrait,JPY:landscape,EUR:portrait,GBP:portrait')
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1]
paths = ['src/components/wine-import/MenuPriceEditor.tsx', 'src/utils/menuPriceReview.ts', 'scripts/qa-pages/menu-price.html', 'scripts/qa-pages/menu-price.tsx', 'scripts/qa-matchrim-price-currency-precision-oct13.py']
source_hashes = {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in paths}
results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for case in args.cases.split(','):
        currency, orientation = case.split(':')
        width, height = (393, 852) if orientation == 'portrait' else (852, 393) if orientation == 'landscape' else (320, 740)
        requests, blocked, errors, console, checks = [], [], [], [], []
        context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, service_workers='block', reduced_motion='reduce')
        def intercept(route):
            requests.append(route.request.url)
            if urlparse(route.request.url).netloc == urlparse(args.url).netloc: return route.continue_()
            blocked.append(route.request.url)
            route.abort('blockedbyclient')
        def socket(ws):
            if urlparse(ws.url).netloc == urlparse(args.url).netloc: ws.connect_to_server()
            else: blocked.append(ws.url); ws.close(code=1008, reason='QA egress blocked')
        context.route('**/*', intercept)
        context.route_web_socket('**/*', socket)
        page = context.new_page()
        page.set_default_timeout(7000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: console.append(message.text) if message.type == 'error' else None)
        def check(name, condition, actual=None, expected=None): checks.append({'name': name, 'passed': bool(condition), 'actual': actual, 'expected': expected})
        try:
            page.goto(args.url + '/scripts/qa-pages/menu-price.html', wait_until='networkidle')
            if orientation == 'narrow': page.add_style_tag(content='html{font-size:32px!important}')
            amount = page.locator('#scan-price-0')
            apply = page.get_by_role('button', name='Aplicar precio', exact=True)
            page.locator('#scan-price-format-0').click()
            page.get_by_role('option', name='Botella', exact=True).click()
            amount.fill('1,25')
            page.locator('#scan-currency-0').click()
            page.get_by_role('option', name=currency, exact=True).click()
            if currency == 'JPY':
                check('Fractional JPY cannot silently round on apply', apply.is_disabled(), not apply.is_disabled(), False)
                check('Fractional JPY gets an explicit error without erasing draft', amount.input_value() == '1,25' and amount.get_attribute('aria-invalid') == 'true', {'value': amount.input_value(), 'ariaInvalid': amount.get_attribute('aria-invalid')})
                if not apply.is_disabled():
                    apply.click()
                    metadata = json.loads(page.get_by_label('Metadatos de control', exact=True).inner_text())
                    check('Applied metadata equals visible money, no rounding', metadata['precio'] != 1.25, {'amount': metadata['precio'], 'visible': page.get_by_label('Precio aplicado', exact=True).inner_text()}, 'No fractional JPY application')
                amount.fill('125')
                expected = 125
            else:
                check('Two-decimal currency keeps fractional draft valid', not apply.is_disabled())
                expected = 1.25
            apply.click()
            metadata = json.loads(page.get_by_label('Metadatos de control', exact=True).inner_text())
            check('Valid amount/unit/currency explicitly retained', metadata['precio'] == expected and metadata['moneda'] == currency and metadata['precio_manual_asignacion']['format'] == 'botella', {'amount': metadata['precio'], 'currency': metadata['moneda']}, {'amount': expected, 'currency': currency})
            check('No sensory/affinity claims introduced', metadata['canonicalId'] is None and metadata['compatibilidad'] is None and metadata['atributos'] is None)
            amount.fill('')
            check('Blank does not become zero or an applied price', apply.is_disabled())
            amount.fill('0')
            apply.click()
            check('Zero explicitly remains zero', json.loads(page.get_by_label('Metadatos de control', exact=True).inner_text())['precio'] == 0)
            check('No external request or provider/account dependency', not blocked and all(urlparse(url).netloc == urlparse(args.url).netloc for url in requests), blocked)
            check('No runtime/console errors', not errors and not console, {'errors': errors, 'console': console})
            check('No page overflow', page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            page.screenshot(path=str(args.output / (case.replace(':', '-') + '.png')), full_page=True)
            results.append({'case': case, 'passed': all(row['passed'] for row in checks), 'checks': checks, 'requests': requests, 'errors': errors, 'console': console})
        except Exception as error:
            page.screenshot(path=str(args.output / (case.replace(':', '-') + '-exception.png')))
            results.append({'case': case, 'passed': False, 'exception': str(error), 'checks': checks, 'errors': errors, 'console': console})
        finally: context.close()
        print(case, 'PASS' if results[-1]['passed'] else 'FAIL', flush=True)
    browser.close()
(args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'sourceHashes': source_hashes, 'realAppRemoteCalls': 0, 'paidCalls': 0, 'realUsers': 0, 'results': results}, ensure_ascii=False, indent=2) + '\n')
raise SystemExit(0 if all(row['passed'] for row in results) else 1)
