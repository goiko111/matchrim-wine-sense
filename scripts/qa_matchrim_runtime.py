"""Portable local-only Chromium options shared by the October 13 client harnesses."""
import os
from pathlib import Path
from urllib.parse import urlparse


def add_browser_options(parser):
    parser.add_argument('--browser', type=Path, default=os.environ.get('MATCHRIM_QA_CHROME'),
                        help='Chromium executable; omitted uses Playwright installed Chromium')


def launch_browser(playwright, args):
    url = urlparse(args.url)
    if url.scheme != 'http' or url.hostname not in {'localhost', '127.0.0.1', '::1'}:
        raise ValueError('QA navigation must use an HTTP loopback URL')
    options = {'headless': True}
    if args.browser:
        path = Path(args.browser).resolve(strict=True)
        if not path.is_file():
            raise ValueError('Chromium executable is not a file')
        options['executable_path'] = str(path)
    return playwright.chromium.launch(**options)


def upload_scan_file(page, mode, file):
    """Use the visible source control and release our chooser handle afterwards."""
    label = 'Elegir de galería' if mode == 'label' else 'Subir archivo'
    with page.expect_file_chooser() as event:
        page.get_by_role('button', name=label, exact=True).click()
    chooser = event.value
    try:
        chooser.set_files(file)
    finally:
        chooser.element.dispose()


def open_label_region(page, index, touch=True):
    """Reach the original region through a single pin or a display-only cluster."""
    import re
    from playwright.sync_api import expect
    target = page.get_by_test_id('region-pin-' + str(index))
    if not target.count():
        target = page.get_by_role('button', name=re.compile(r'(?:regiones: |, )' + str(index) + r' '))
    if touch:
        target.tap()
    else:
        target.click()
    dialog = page.get_by_role('dialog')
    expect(dialog).to_be_visible()
    for _ in range(100):
        title = dialog.get_by_role('heading').first.inner_text()
        current = int(re.search(r'Región (\d+):', title)[1])
        if current == index:
            return
        dialog.get_by_role('button', name='Siguiente' if current < index else 'Anterior', exact=True).click()
        expect(dialog.get_by_role('heading').first).not_to_have_text(title)
    raise AssertionError('Region navigation did not reach the original index')


def has_label_region(page, index):
    import re
    return bool(page.get_by_test_id('region-pin-' + str(index)).count()
                or page.get_by_role('button', name=re.compile(r'(?:regiones: |, )' + str(index) + r' ')).count())
