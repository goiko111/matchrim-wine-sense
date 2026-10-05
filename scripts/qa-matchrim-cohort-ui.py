import json
import os
import sys
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("MATCHRIM_QA_URL", "http://127.0.0.1:4173").rstrip("/")
PROJECT_REF = os.environ.get("MATCHRIM_QA_PROJECT_REF", "")
SUPABASE_URL = os.environ.get("MATCHRIM_QA_SUPABASE_URL", "").rstrip("/")
PUBLISHABLE_KEY = os.environ.get("MATCHRIM_QA_PUBLISHABLE_KEY", "")
PASSWORD = os.environ.get("MATCHRIM_QA_ACCOUNT_PASSWORD", "")
COHORT_ID = os.environ.get("MATCHRIM_QA_COHORT_ID", "matchrim-pilot-2026-10-05")
ACCOUNT_COUNT = int(os.environ.get("MATCHRIM_QA_ACCOUNT_COUNT", "10"))
ACCOUNT_START = int(os.environ.get("MATCHRIM_QA_ACCOUNT_START", "0"))
OUTPUT = Path(os.environ.get("MATCHRIM_QA_UI_OUTPUT", "/private/tmp/matchrim-100-account-pilot/cohort-ui"))
BROWSER_EXECUTABLE = os.environ.get("MATCHRIM_QA_BROWSER_EXECUTABLE", "").strip()
CAPTURE_SCREENSHOTS = os.environ.get("MATCHRIM_QA_CAPTURE_SCREENSHOTS", "true").lower() == "true"
EXPECTED_REF = "qpbmqvfnunkylvtvnyyx"

if PROJECT_REF != EXPECTED_REF or PROJECT_REF not in SUPABASE_URL:
    raise RuntimeError(f"Refusing cohort UI QA outside isolated staging {EXPECTED_REF}")
if not PUBLISHABLE_KEY or not PASSWORD:
    raise RuntimeError("Publishable key and QA password are required")


def email_for(index):
    return f"matchrim.qa.{COHORT_ID}.{index + 1:03d}@example.invalid"


def read_auth(page):
    page.wait_for_function(
        """() => Object.keys(localStorage).some((item) => item.startsWith('sb-') && item.endsWith('-auth-token'))""",
        timeout=10_000,
    )
    payload = page.evaluate("""() => {
      const key = Object.keys(localStorage).find((item) => item.startsWith('sb-') && item.endsWith('-auth-token'));
      return key ? JSON.parse(localStorage.getItem(key)) : null;
    }""")
    if not payload or not payload.get("access_token") or not payload.get("user", {}).get("id"):
        raise AssertionError("Authenticated Supabase session was not persisted")
    return payload


def fetch_owned(page, token, table, select="*"):
    response = page.request.get(
        f"{SUPABASE_URL}/rest/v1/{table}?select={quote(select, safe=',()*')}",
        headers={
            "apikey": PUBLISHABLE_KEY,
            "Authorization": f"Bearer {token}",
            "Accept-Profile": "matchrim_qa",
        },
    )
    if not response.ok:
        raise AssertionError(f"{table} returned HTTP {response.status}: {response.text()[:300]}")
    return response.json()


def no_horizontal_overflow(page):
    return page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2")


def run_account(browser, index):
    email = email_for(index)
    context = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=3)
    page = context.new_page()
    console_errors = []
    http_errors = []
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("response", lambda response: http_errors.append({"status": response.status, "url": response.url}) if response.status >= 400 else None)

    page.goto(f"{BASE_URL}/auth?redirect=/my-wines", wait_until="networkidle")
    page.locator('input[type="email"]').fill(email)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.locator('form button[type="submit"]').click()
    page.wait_for_url("**/my-wines", timeout=20_000)
    page.wait_for_load_state("networkidle")

    auth = read_auth(page)
    user_id = auth["user"]["id"]
    token = auth["access_token"]
    wines = fetch_owned(page, token, "user_wines", "id,user_id,name,rating,status")
    quiz = fetch_owned(page, token, "quiz_results", "id,user_id,potente,acidez,dulce,tanico,afrutado")
    profiles = fetch_owned(page, token, "profiles", "id,email,name")
    restaurant_sessions = fetch_owned(page, token, "restaurant_matchrim_sessions", "id,user_id,restaurant_name")
    events = fetch_owned(page, token, "app_events", "id,user_id,event_name")
    if len(wines) != 60:
        raise AssertionError(f"{email}: expected 60 wines, received {len(wines)}")
    if len(quiz) != 1 or len(profiles) != 1 or len(restaurant_sessions) != 3 or len(events) < 25:
        raise AssertionError(
            f"{email}: incomplete account quiz={len(quiz)} profile={len(profiles)} "
            f"restaurants={len(restaurant_sessions)} events={len(events)}"
        )
    owned_rows = [*wines, *quiz, *restaurant_sessions, *events]
    if any(row.get("user_id") != user_id for row in owned_rows):
        raise AssertionError(f"{email}: cross-account row leaked through RLS")

    routes = ["/", "/inteligencia-liquida", "/escanear", "/usar-matchrim", "/profile", "/my-wines"]
    route_checks = []
    for route in routes:
        page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
        labels = page.locator('nav[aria-label="Navegacion principal"], nav[aria-label="Navegación principal"]').get_by_role("link").evaluate_all(
            "links => links.map(link => link.getAttribute('aria-label')).filter(Boolean)"
        )
        if labels != ["Inicio", "aiRIM", "Escanear", "Bodega", "Perfil"]:
            raise AssertionError(f"{email}: unexpected primary navigation on {route}: {labels}")
        if not no_horizontal_overflow(page):
            raise AssertionError(f"{email}: horizontal overflow on {route}")
        route_checks.append({"route": route, "navigation": labels, "overflow": False})

    page.goto(f"{BASE_URL}/usar-matchrim?mode=scanner", wait_until="networkidle")
    scanner_tab = page.get_by_role("tab", name="Escanear carta")
    scanner_tab.wait_for(state="visible", timeout=10_000)
    scanner_tab.click()
    consent = page.locator("#share-restaurant-signal")
    consent.wait_for(state="visible", timeout=10_000)
    if consent.get_attribute("data-state") != "unchecked":
        raise AssertionError(f"{email}: restaurant commercial consent is not opt-in")
    if page.get_by_text("La foto se usa para analizar la carta, no para captar al restaurante.", exact=False).count() != 1:
        raise AssertionError(f"{email}: private restaurant scan explanation is missing")
    if page.get_by_text("nunca mi perfil ni la foto", exact=False).count() != 1:
        raise AssertionError(f"{email}: restaurant consent data boundary is missing")
    if not no_horizontal_overflow(page):
        raise AssertionError(f"{email}: horizontal overflow in restaurant scanner mode")

    page.goto(f"{BASE_URL}/profile", wait_until="networkidle")
    if page.get_by_text("No tienes un perfil aun", exact=False).count() or page.get_by_text("No tienes un perfil aún", exact=False).count():
        raise AssertionError(f"{email}: seeded sensory profile is not visible")
    if page.get_by_text("Perfil Sensorial", exact=False).count() == 0:
        raise AssertionError(f"{email}: sensory profile section is missing")
    page.goto(f"{BASE_URL}/my-wines", wait_until="networkidle")
    if page.get_by_text("QA ", exact=False).count() == 0:
        raise AssertionError(f"{email}: seeded wine content is not visible")

    relevant_http_errors = [
        error for error in http_errors
        if "/rest/v1/" in error["url"] or "/auth/v1/" in error["url"] or "/functions/v1/" in error["url"]
    ]
    if relevant_http_errors or console_errors:
        raise AssertionError(f"{email}: runtime errors http={relevant_http_errors} console={console_errors}")

    screenshot = None
    if CAPTURE_SCREENSHOTS and index in {0, 7, 8, 49, 99}:
        screenshot = OUTPUT / f"account-{index + 1:03d}-bodega.png"
        page.screenshot(path=str(screenshot), full_page=True)
    context.close()
    return {
        "account": index + 1,
        "email": email,
        "user_id": user_id,
        "wines": len(wines),
        "rated_wines": sum(1 for wine in wines if wine.get("rating")),
        "quiz_results": len(quiz),
        "restaurant_sessions": len(restaurant_sessions),
        "events": len(events),
        "routes": route_checks,
        "restaurant_scanner": {
            "available": True,
            "commercial_consent_default": "unchecked",
            "private_scan_copy": True,
            "overflow": False,
        },
        "screenshot": str(screenshot) if screenshot else None,
        "status": "PASS",
    }


def build_report(results, failures, completed):
    return {
        "base_url": BASE_URL,
        "project_ref": PROJECT_REF,
        "schema": "matchrim_qa",
        "cohort_id": COHORT_ID,
        "synthetic": True,
        "production_touched": False,
        "account_count": ACCOUNT_COUNT,
        "account_start": ACCOUNT_START + 1,
        "account_end": ACCOUNT_START + ACCOUNT_COUNT,
        "completed": completed,
        "passed": len(results),
        "failed": len(failures),
        "all_passed": completed and not failures,
        "results": results,
        "failures": failures,
    }


def write_report(results, failures, completed):
    report = build_report(results, failures, completed)
    (OUTPUT / "results.json").write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n")
    return report


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    results = []
    failures = []
    with sync_playwright() as playwright:
        launch_options = {"headless": True}
        if BROWSER_EXECUTABLE:
            launch_options["executable_path"] = BROWSER_EXECUTABLE
        browser = playwright.chromium.launch(**launch_options)
        for offset, index in enumerate(range(ACCOUNT_START, ACCOUNT_START + ACCOUNT_COUNT), start=1):
            try:
                result = run_account(browser, index)
                results.append(result)
                print(f"[{offset}/{ACCOUNT_COUNT}] PASS account={index + 1} {result['email']}", flush=True)
            except Exception as error:
                failures.append({"account": index + 1, "email": email_for(index), "error": str(error)})
                print(f"[{offset}/{ACCOUNT_COUNT}] FAIL account={index + 1} {error}", flush=True)
            write_report(results, failures, completed=False)
        report = write_report(results, failures, completed=True)
        browser.close()
    print(json.dumps({key: value for key, value in report.items() if key not in {"results"}}, indent=2))
    if failures:
        sys.exit(2)


if __name__ == "__main__":
    main()
