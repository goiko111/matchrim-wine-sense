"""Local UI regression checks; mock auth/network, not database or gateway E2E."""

import argparse
import base64
import json
import os
import re
import time
import unittest
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

BASE_URL = os.environ.get("MATCHRIM_QA_URL", "http://127.0.0.1:4189").rstrip("/")
ARTIFACTS = Path(os.environ["MATCHRIM_QA_ARTIFACTS"])
CHROME = os.environ.get("MATCHRIM_QA_CHROME")
USER_ID = "00000000-0000-4000-8000-000000000022"
CATALOG_WINE = {
    "id": 10996,
    "mantalakWineId": 25795,
    "name": "Prado Enea QA",
    "winery": "Bodega QA",
    "type": "Tinto",
    "country": "España",
    "region": "Rioja",
    "grapes": ["Tempranillo"],
    "vintages": [2015, 2016],
    "tastingAttributes": None,
    "photo": None,
    "slugname": "Prado-Enea-QA_2015",
}
UNLISTED_WINE = {**CATALOG_WINE, "id": None, "representativePublicId": None, "mantalakWineId": 217480,
                 "name": "La Migratoria QA", "slugname": None}
GEMINI_WINE = {"name": "Vino Inventado QA", "producer": "Bodega Gemini", "region": "Rioja", "tipo": "Tinto",
               "id": "legacy-row-id"}


class ManualCatalogUi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if urlparse(BASE_URL).hostname not in {"127.0.0.1", "localhost", "::1"}:
            raise ValueError("This mock-auth harness only runs against localhost")
        ARTIFACTS.mkdir(parents=True, exist_ok=True)
        cls.playwright = sync_playwright().start()
        options = {"headless": True}
        if CHROME:
            options["executable_path"] = CHROME
        cls.browser = cls.playwright.chromium.launch(**options)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.contexts = []
        self.requests = []
        self.catalog_calls = []
        self.fallback_calls = []
        self.payloads = []

    def tearDown(self):
        for context in self.contexts:
            context.close()
        (ARTIFACTS / f"{self._testMethodName}-requests.json").write_text(
            json.dumps({"requests": self.requests, "catalog_calls": self.catalog_calls,
                        "intercepted_payloads_not_persistence": self.payloads}, indent=2),
            encoding="utf-8",
        )

    def page(self, *, authenticated=True, mobile=False):
        context = self.browser.new_context(
            viewport={"width": 390, "height": 844} if mobile else {"width": 1440, "height": 900},
            service_workers="block",
        )
        self.contexts.append(context)
        user = {"id": USER_ID, "aud": "authenticated", "role": "authenticated",
                "email": "local-qa@example.invalid", "app_metadata": {"provider": "email"},
                "user_metadata": {}, "created_at": "2026-10-22T00:00:00Z"}
        expires = int(time.time()) + 3600
        encoded = base64.urlsafe_b64encode(json.dumps({"sub": USER_ID, "exp": expires}).encode()).decode().rstrip("=")
        session = {"access_token": f"eyJhbGciOiJub25lIn0.{encoded}.local-qa-not-real",
                   "refresh_token": "local-qa-not-real", "expires_in": 3600,
                   "expires_at": expires, "token_type": "bearer", "user": user}

        def intercept(route):
            request = route.request
            url = urlparse(request.url)
            if f"{url.scheme}://{url.netloc}" == BASE_URL:
                route.continue_()
                return
            self.requests.append({"method": request.method, "path": url.path})
            headers = {"access-control-allow-origin": "*", "access-control-allow-headers": "*"}
            if request.method == "OPTIONS":
                route.fulfill(status=200, headers=headers, json={})
            elif url.path == "/functions/v1/catalog-search":
                body = request.post_data_json
                self.catalog_calls.append(body)
                if body["query"] == "upstreamfail":
                    route.fulfill(status=503, headers=headers, json={"error": "local QA upstream failure"})
                elif body["query"] in {"zzznomatch", "geminionly", "Vino Inventado QA"}:
                    route.fulfill(status=200, headers=headers, json={"results": [], "count": 0})
                elif body["query"] == "unlistedonly":
                    route.fulfill(status=200, headers=headers, json={"results": [UNLISTED_WINE], "count": 1, "limit": 6})
                else:
                    route.fulfill(status=200, headers=headers, json={"results": [CATALOG_WINE], "count": 1, "limit": 6})
            elif url.path == "/functions/v1/search-wines":
                body = request.post_data_json
                self.fallback_calls.append(body)
                found = [GEMINI_WINE] if body["query"] in {"geminionly", "upstreamfail"} else []
                route.fulfill(status=200, headers=headers, json={"wines": found})
            elif url.path == "/rest/v1/user_wines" and request.method == "POST":
                body = request.post_data_json
                row = body[0] if isinstance(body, list) else body
                self.payloads.append(row)
                route.fulfill(status=201, headers=headers, json=[{
                    **row, "id": "00000000-0000-4000-8000-000000000099",
                    "created_at": "2026-10-22T00:00:00Z",
                }])
            elif url.path.startswith("/rest/v1/"):
                route.fulfill(status=200, headers=headers, json=[])
            elif url.path == "/auth/v1/user":
                route.fulfill(status=200, headers=headers, json=user if authenticated else {})
            else:
                # Never forward external traffic, including analytics or unexpected writes.
                route.fulfill(status=403, headers=headers, json={"error": "blocked by local QA harness"})

        context.route("**/*", intercept)
        context.add_init_script("""(() => {
          localStorage.clear();
          const session = SESSION;
          if (session) localStorage.setItem('sb-cbjynrbvrhcmpaojmqdp-auth-token', JSON.stringify(session));
          document.addEventListener('DOMContentLoaded', () => {
            const badge = document.createElement('div');
            badge.textContent = 'LOCAL QA · AUTH/DATOS SIMULADOS · SIN BD';
            badge.style.cssText = 'position:fixed;z-index:2147483647;right:4px;top:4px;background:#fff2a8;color:#111;padding:4px 7px;font:11px sans-serif;pointer-events:none;border:1px solid #222';
            document.body.appendChild(badge);
          });
        })();""".replace("SESSION", json.dumps(session if authenticated else None)))
        page = context.new_page()
        page.set_default_timeout(4000)
        return page

    def capture(self, page, step):
        page.screenshot(path=str(ARTIFACTS / f"{self._testMethodName}-{step}.png"), full_page=True)

    def open_manual(self, page):
        page.goto(f"{BASE_URL}/my-wines", wait_until="networkidle")
        button = page.get_by_role("button", name="Añadir manualmente Buscar, validar o completar", exact=True)
        expect(button).to_be_visible()
        self.capture(page, "01-entry")
        button.click()
        expect(page).to_have_url(f"{BASE_URL}/my-wines/add")
        try:
            expect(page.get_by_role("dialog", name="Añadir Vino", exact=True)).to_be_visible()
        finally:
            self.capture(page, "02-form-or-failure")
        return page.get_by_role("dialog", name="Añadir Vino", exact=True)

    def wait_catalog(self, page, *, vintage, since=0):
        end = time.monotonic() + 4
        while time.monotonic() < end:
            if any(str(call.get("vintage")) == vintage for call in self.catalog_calls[since:]):
                return
            page.wait_for_timeout(50)
        self.fail(f"catalog-search did not refresh with vintage={vintage}; calls={self.catalog_calls}")

    def test_entry_mobile(self):
        page = self.page(mobile=True)
        self.open_manual(page)
        expect(page.get_by_label("Nombre del Vino *", exact=True)).to_be_visible()

    def test_entry_desktop(self):
        page = self.page()
        self.open_manual(page)
        expect(page.get_by_label("Nombre del Vino *", exact=True)).to_be_visible()
        page.keyboard.press("Escape")
        expect(page).to_have_url(f"{BASE_URL}/my-wines")

    def test_vintage_and_canonical_payload(self):
        page = self.page(mobile=True)
        dialog = self.open_manual(page)
        dialog.get_by_label("Añada", exact=True).fill("1900")
        dialog.get_by_label("Nombre del Vino *", exact=True).fill("Prado Enea QA")
        expect(dialog.get_by_text("Buscando coincidencias...", exact=True)).to_be_visible()
        suggestion = dialog.get_by_role("button", name=re.compile("Prado Enea QA"))
        expect(suggestion).to_be_visible()
        self.wait_catalog(page, vintage="1900")
        self.capture(page, "03-results-unknown-vintage")
        suggestion.click()
        expect(dialog.get_by_label("Añada", exact=True)).to_have_value("1900")
        expect(dialog.get_by_label("Bodega/Productor", exact=True)).to_have_value("Bodega QA")
        dialog.get_by_label("Añada", exact=True).fill("1901")
        self.wait_catalog(page, vintage="1901")
        expect(dialog.get_by_text("Validado con el catálogo de Winerim", exact=True)).to_be_visible()
        expect(dialog.get_by_label("Añada", exact=True)).to_have_value("1901")
        self.capture(page, "04-selection-free-vintage")
        dialog.get_by_role("button", name="Mi Bodega", exact=True).click()
        purchase = page.get_by_role("dialog", name="Detalles del vino", exact=True)
        expect(purchase).to_be_visible()
        purchase.get_by_label("Tienda / Vinoteca", exact=True).click()
        purchase.get_by_role("button", name="Confirmar", exact=True).click()
        end = time.monotonic() + 4
        while not self.payloads and time.monotonic() < end:
            page.wait_for_timeout(50)
        self.assertEqual(len(self.payloads), 1)
        row = self.payloads[0]
        self.assertEqual(row["vintage"], 1901)
        self.assertEqual(row["name"], "Prado Enea QA")
        self.assertEqual(row["place_details"]["winerim_mantalak_wine_id"], 25795)
        self.assertEqual(row["place_details"]["winerim_wine_id"], 10996)
        self.assertNotIn(row["vintage"], CATALOG_WINE["vintages"])

    def test_empty_and_failure_states(self):
        page = self.page()
        dialog = self.open_manual(page)
        name = dialog.get_by_label("Nombre del Vino *", exact=True)
        name.fill("zzznomatch")
        expect(dialog.get_by_text("No encuentro coincidencias claras", exact=True)).to_be_visible()
        self.capture(page, "03-empty")
        name.fill("upstreamfail")
        # Catalogue down: only the unverified fallback is offered, marked as such.
        expect(dialog.get_by_text("No está en el catálogo de Winerim. Sugerencias sin verificar:", exact=True)).to_be_visible()
        expect(dialog.get_by_text("No verificado", exact=True)).to_be_visible()
        self.capture(page, "04-upstream-failure")

    def test_unlisted_catalogue_wine_is_saved_by_canonical_id(self):
        page = self.page()
        dialog = self.open_manual(page)
        dialog.get_by_label("Nombre del Vino *", exact=True).fill("unlistedonly")
        dialog.get_by_role("button", name=re.compile("La Migratoria QA")).click()
        expect(dialog.get_by_text("Validado con el catálogo de Winerim", exact=True)).to_be_visible()
        self.assertEqual(self.fallback_calls, [])
        dialog.get_by_role("button", name="Mi Bodega", exact=True).click()
        purchase = page.get_by_role("dialog", name="Detalles del vino", exact=True)
        purchase.get_by_label("Tienda / Vinoteca", exact=True).click()
        purchase.get_by_role("button", name="Confirmar", exact=True).click()
        end = time.monotonic() + 4
        while not self.payloads and time.monotonic() < end:
            page.wait_for_timeout(50)
        details = self.payloads[0]["place_details"]
        self.assertEqual(details["source"], "winerim_catalog")
        self.assertEqual(details["winerim_mantalak_wine_id"], 217480)
        self.assertNotIn("winerim_wine_id", details)

    def test_unverified_suggestion_needs_confirmation_and_carries_no_ids(self):
        page = self.page()
        dialog = self.open_manual(page)
        dialog.get_by_label("Nombre del Vino *", exact=True).fill("geminionly")
        expect(dialog.get_by_text("Sugerencias sin verificar:", exact=False)).to_be_visible()
        dialog.get_by_role("button", name=re.compile("Vino Inventado QA")).click()
        expect(dialog.get_by_text("Sugerencia no verificada", exact=True)).to_be_visible()
        expect(dialog.get_by_role("button", name="Mi Bodega", exact=True)).to_be_disabled()  # until the user confirms the name
        dialog.get_by_role("button", name="He revisado el nombre", exact=True).click()
        dialog.get_by_role("button", name="Mi Bodega", exact=True).click()
        purchase = page.get_by_role("dialog", name="Detalles del vino", exact=True)
        purchase.get_by_label("Tienda / Vinoteca", exact=True).click()
        purchase.get_by_role("button", name="Confirmar", exact=True).click()
        end = time.monotonic() + 4
        while not self.payloads and time.monotonic() < end:
            page.wait_for_timeout(50)
        details = self.payloads[0]["place_details"]
        self.assertEqual(details["source"], "unverified_suggestion")
        self.assertNotIn("winerim_mantalak_wine_id", details)
        self.assertNotIn("winerim_wine_id", details)

    def test_dialog_geometry(self):
        measurements = []
        violations = []

        def measure(page, dialog, width, state):
            geometry = dialog.evaluate("""(node) => {
              const rect = node.getBoundingClientRect();
              const left = rect.left + node.clientLeft;
              const right = left + node.clientWidth;
              const controls = [...node.querySelectorAll('input, textarea, button, label')]
                .filter(el => el.getClientRects().length)
                .map(el => {
                  const r = el.getBoundingClientRect();
                  return {tag: el.tagName, id: el.id, text: (el.textContent || '').trim(),
                    left: r.left, right: r.right, top: r.top, width: r.width, height: r.height};
                });
              return {clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
                scrollLeft: node.scrollLeft, left, right, controls};
            }""")
            measurements.append({"viewport": width, "state": state, **geometry})
            if geometry["scrollWidth"] > geometry["clientWidth"] + 1:
                violations.append(f"{width}/{state}: dialog scrollWidth={geometry['scrollWidth']} > clientWidth={geometry['clientWidth']}")
            if abs(geometry["scrollLeft"]) > 1:
                violations.append(f"{width}/{state}: horizontal scrollLeft={geometry['scrollLeft']}")
            for control in geometry["controls"]:
                if control["left"] < geometry["left"] - 1 or control["right"] > geometry["right"] + 1:
                    violations.append(f"{width}/{state}: outside usable width: {control}")
            page.screenshot(path=str(ARTIFACTS / f"geometry-{width}-{state}.png"), full_page=False)

        for width, height in [(390, 844), (320, 844), (1440, 900)]:
            page = self.page(mobile=width < 640)
            page.set_viewport_size({"width": width, "height": height})
            dialog = self.open_manual(page)
            # Let the existing 200ms dialog transition finish before measuring boxes.
            page.wait_for_timeout(250)
            measure(page, dialog, width, "empty")
            dialog.get_by_label("Añada", exact=True).fill("1900")
            dialog.get_by_label("Nombre del Vino *", exact=True).fill("Prado Enea QA")
            suggestion = dialog.get_by_role("button", name=re.compile("Prado Enea QA"))
            expect(suggestion).to_be_visible()
            measure(page, dialog, width, "results")
            suggestion.click()
            expect(dialog.get_by_label("Añada", exact=True)).to_have_value("1900")
            measure(page, dialog, width, "selected")
            before_calls = len(self.catalog_calls)
            dialog.get_by_label("Añada", exact=True).fill("1901")
            self.wait_catalog(page, vintage="1901", since=before_calls)
            expect(dialog.get_by_text("Validado con el catálogo de Winerim", exact=True)).to_be_visible()
            measure(page, dialog, width, "vintage-focused")
            controls = dialog.locator("input, textarea, button")
            for index in range(controls.count()):
                control = controls.nth(index)
                if control.is_visible() and control.is_enabled():
                    control.focus()
                    scroll_left = dialog.evaluate("node => node.scrollLeft")
                    if abs(scroll_left) > 1:
                        violations.append(f"{width}/focus {index}: horizontal scrollLeft={scroll_left}")
            dialog.get_by_role("button", name="Ya Probado", exact=True).focus()
            measure(page, dialog, width, "actions-focused")
            page.close()
        (ARTIFACTS / "geometry.json").write_text(json.dumps(measurements, indent=2), encoding="utf-8")
        self.assertEqual(violations, [], "\n".join(violations))

    def test_anonymous_uses_existing_guard(self):
        page = self.page(authenticated=False)
        for path in ["/my-wines", "/my-wines/add"]:
            page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
            expect(page).to_have_url(re.compile(re.escape(BASE_URL) + r"/auth\?"))
            self.assertEqual(page.get_by_role("dialog", name="Añadir Vino", exact=True).count(), 0)
        private = [r for r in self.requests if r["path"] in {"/rest/v1/user_wines", "/functions/v1/catalog-search", "/functions/v1/search-wines"}]
        self.assertEqual(private, [])
        self.assertEqual(self.payloads, [])
        self.capture(page, "01-login-no-private-data")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", choices=["all", "entry", "vintage", "geometry"], default="all")
    args = parser.parse_args()
    names = {"entry": ["test_entry_mobile", "test_entry_desktop"],
             "vintage": ["test_vintage_and_canonical_payload"],
             "geometry": ["test_dialog_geometry"]}
    suite = (unittest.TestSuite(ManualCatalogUi(name) for name in names[args.case])
             if args.case != "all" else unittest.defaultTestLoader.loadTestsFromTestCase(ManualCatalogUi))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)
