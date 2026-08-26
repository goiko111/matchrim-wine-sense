import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("MATCHRIM_E2E_URL", "http://127.0.0.1:4173").rstrip("/")
ARTIFACTS = Path(os.environ.get(
    "MATCHRIM_E2E_ARTIFACTS",
    "/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-real-e2e",
))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TIMEOUT_MS = int(os.environ.get("MATCHRIM_E2E_TIMEOUT_MS", "120000"))
FIXTURES = [
    {
        "id": "multibottle-fridge",
        "source": Path("/Users/GOIKO/Downloads/IMG_7605 2.jpg"),
        "mode": "etiqueta",
        "expected_min_results": 10,
        "rationale": "El expositor contiene claramente mas de diez botellas visibles.",
    },
    *[
        {
            "id": source.stem.replace(" ", "-").lower(),
            "source": source,
            "mode": "carta-vinos",
            "expected_min_results": 8,
            "rationale": "Carta o pizarra densa: el umbral evita aprobar una extraccion testimonial.",
        }
        for source in [
            Path("/Users/GOIKO/Downloads/IMG_7547 2.HEIC"),
            Path("/Users/GOIKO/Downloads/IMG_7548 2.HEIC"),
            Path("/Users/GOIKO/Downloads/IMG_7552 2.HEIC"),
            Path("/Users/GOIKO/Downloads/IMG_7553 2.HEIC"),
        ]
    ],
]


def refuse_production_url():
    parsed = urlparse(BASE_URL)
    host = (parsed.hostname or "").lower()
    allowed = host in {"127.0.0.1", "localhost"} or any(
        marker in host for marker in ("staging", "qa", "preview")
    )
    if not allowed:
        raise RuntimeError(
            f"Refusing real E2E against non-QA host {host!r}. Use localhost, staging, qa or preview."
        )


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def materialize_fixture(fixture):
    source = fixture["source"]
    if not source.exists():
        raise FileNotFoundError(source)
    target = ARTIFACTS / "fixtures" / f"{fixture['id']}.jpg"
    target.parent.mkdir(parents=True, exist_ok=True)
    if source.suffix.lower() in {".heic", ".heif"}:
        subprocess.run(
            ["sips", "-s", "format", "jpeg", str(source), "--out", str(target)],
            check=True,
            capture_output=True,
            text=True,
        )
    else:
        shutil.copyfile(source, target)
    return target


def wait_for_terminal_state(page, mode):
    success_markers = (
        ("Lote listo para revisar",)
        if mode == "etiqueta"
        else ("Lista de la carta",)
    )
    failure_markers = (
        "No se pudo",
        "No hay conexion",
        "Error al",
        "Vuelve a intentarlo",
        "No hemos podido",
    )
    deadline = time.monotonic() + TIMEOUT_MS / 1000
    while time.monotonic() < deadline:
        text = page.locator("body").inner_text()
        if any(marker in text for marker in success_markers):
            return "completed", text
        if any(marker in text for marker in failure_markers):
            return "blocked", text
        page.wait_for_timeout(500)
    return "timeout", page.locator("body").inner_text()


def run_fixture(browser, fixture, file_path):
    console_errors = []
    network_failures = []
    context = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=3)
    page = context.new_page()
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("requestfailed", lambda request: network_failures.append({
        "url": request.url,
        "failure": request.failure,
    }))
    page.add_init_script("""
      localStorage.setItem('matchrim_quiz_result', JSON.stringify({
        potente: 4, acidez: 4, dulce: 1, tanico: 3, afrutado: 4
      }));
      localStorage.setItem('matchrim.scan_privacy_notice.v2', 'accepted');
    """)
    started = time.monotonic()
    page.goto(f"{BASE_URL}/escanear/{fixture['mode']}", wait_until="networkidle")
    input_index = 1 if fixture["mode"] == "etiqueta" else 0
    page.locator('input[type="file"]').nth(input_index).set_input_files(str(file_path))
    terminal_state, body_text = wait_for_terminal_state(page, fixture["mode"])
    latency_ms = round((time.monotonic() - started) * 1000)
    if fixture["mode"] == "etiqueta":
        result_count = page.locator('button[aria-label^="Region "]').count()
        anchored_pins = result_count
        coverage = next(
            (line.strip() for line in body_text.splitlines() if "Cobertura" in line),
            None,
        )
    else:
        result_count = page.locator('button[aria-label^="Abrir vino "]').count()
        anchored_pins = page.locator('button[aria-label^="Vino "]').count()
        coverage = None
    has_overflow = page.evaluate(
        "() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2"
    )
    screenshot = ARTIFACTS / f"{fixture['id']}-real-mobile.png"
    page.screenshot(path=str(screenshot), full_page=True)
    expected = fixture["expected_min_results"]
    passed = terminal_state == "completed" and result_count >= expected and not has_overflow
    result = {
        "fixture": fixture["id"],
        "source": str(fixture["source"]),
        "fixture_sha256": sha256(file_path),
        "mode": fixture["mode"],
        "expected_min_results": expected,
        "expected_rationale": fixture["rationale"],
        "terminal_state": terminal_state,
        "actual_results": result_count,
        "anchored_pins": anchored_pins,
        "coverage_label": coverage,
        "latency_ms": latency_ms,
        "horizontal_overflow": has_overflow,
        "console_errors": console_errors,
        "network_failures": network_failures,
        "screenshot": str(screenshot),
        "status": "PASS" if passed else "BLOCKED_OR_FAIL",
        "visible_excerpt": body_text[-1200:],
    }
    context.close()
    return result


def main():
    refuse_production_url()
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    materialized = [(fixture, materialize_fixture(fixture)) for fixture in FIXTURES]
    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=CHROME)
        for fixture, file_path in materialized:
            results.append(run_fixture(browser, fixture, file_path))
        browser.close()
    report = {
        "base_url": BASE_URL,
        "interception": False,
        "production_guard": True,
        "all_passed": all(result["status"] == "PASS" for result in results),
        "results": results,
    }
    report_path = ARTIFACTS / "real-e2e-report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n")
    print(json.dumps(report, indent=2, ensure_ascii=True))
    if not report["all_passed"]:
        sys.exit(2)


if __name__ == "__main__":
    main()
