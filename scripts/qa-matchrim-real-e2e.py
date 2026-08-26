import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("MATCHRIM_E2E_URL", "http://127.0.0.1:4173").rstrip("/")
ARTIFACTS = Path(os.environ.get(
    "MATCHRIM_E2E_ARTIFACTS",
    "/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-real-e2e",
))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TIMEOUT_MS = int(os.environ.get("MATCHRIM_E2E_TIMEOUT_MS", "180000"))
MIN_MENU_PRECISION = float(os.environ.get("MATCHRIM_MIN_MENU_PRECISION", "0.90"))
MIN_MENU_RECALL = float(os.environ.get("MATCHRIM_MIN_MENU_RECALL", "0.85"))

FIXTURES = [
    {
        "id": "multibottle-fridge",
        "source": Path("/Users/GOIKO/Downloads/IMG_7605 2.jpg"),
        "mode": "etiqueta",
        "expected_min_results": 12,
        "expected_min_identified": 6,
        "rationale": (
            "El expositor contiene unas 50 botellas visibles; se exigen al menos 12 regiones "
            "independientes y 6 candidatos legibles, con cobertura parcial explicita si quedan fuera."
        ),
    },
    {
        "id": "img_7547-2",
        "source": Path("/Users/GOIKO/Downloads/IMG_7547 2.HEIC"),
        "mode": "carta-vinos",
        "expected_wines": [
            "Laurent Perrier La Cuvee", "Laurent Perrier Ultra Brut", "Laurent Perrier Rose",
            "Gaudensius blanco", "Lugana Allegrini", "Greco di Tufo Terredora di Paolo",
            "Quater Vitis Firriato", "Pouilly Fume Blanc Reverdy y Fils", "Amarone",
            "Barbaresco Marchesi di Barolo", "Barolo Marchesi di Barolo",
            "Dolcetto d'Alba Elio Grasso", "Bricco dell'Uccellone Barbera", "Nebbiolo Nino Negri",
        ],
        "rationale": "Catorce lineas de vino completas y legibles entre la pagina principal y el borde derecho.",
    },
    {
        "id": "img_7548-2",
        "source": Path("/Users/GOIKO/Downloads/IMG_7548 2.HEIC"),
        "mode": "carta-vinos",
        "expected_wines": [
            "Laurent Perrier La Cuvee", "Laurent Perrier Ultra Brut", "Laurent Perrier Rose",
            "Gaudensius Blanc de Noir", "Costa di Rose Umberto Cesari", "La Rosa Raventos i Blanc",
            "Chateau Miraval Rose", "Chateau d'Esclans Whispering Angel",
        ],
        "rationale": "Ocho referencias completas y legibles en una sola pagina.",
    },
    {
        "id": "img_7552-2",
        "source": Path("/Users/GOIKO/Downloads/IMG_7552 2.HEIC"),
        "mode": "carta-vinos",
        "expected_wines": [
            "Joan Raventos Rose BN", "Agusti Torello Kripta", "Maxim Riesling Sekt Brut",
            "Manzanilla Pasada Xixarito", "Manzanilla Alegria", "Fino Viejo Tradicion",
            "Fino Ynocente", "Amontillado Vina AB", "Amontillado El Contrabandista",
            "Bertola Palo Cortado", "Oloroso Don Nuno", "Moscatel Zumbral", "Pedro Ximenez Don PX",
        ],
        "rationale": "Trece vinos; vermut y cervezas visibles deben excluirse.",
    },
    {
        "id": "img_7553-2",
        "source": Path("/Users/GOIKO/Downloads/IMG_7553 2.HEIC"),
        "mode": "carta-vinos",
        "expected_wines": [
            "Finca la Olma ecologico", "Can Feixes", "Forlong ecologico", "Dereszla Tokaji Dry",
            "Nat Cool Mosel", "Mein Castes Brancas", "Huerto de la Condesa", "Percheron Chenin Blanc",
            "Mayela 2023", "Domaine de la Janasse", "Huerto de la Condesa", "Prieler Blaufrankisch",
            "Diaz Bayo 4 Meses", "Agricola de Cadalso", "Casa Castillo", "La Vina de Ayer",
            "Nat Cool Zorzal", "Lopez de Haro Rosado", "L'Arnaude",
        ],
        "rationale": "Diecinueve lineas completas: ocho blancos, nueve tintos y dos rosados.",
    },
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
            check=True, capture_output=True, text=True,
        )
    else:
        shutil.copyfile(source, target)
    return target


def normalize_name(value):
    decomposed = unicodedata.normalize("NFKD", str(value or ""))
    ascii_value = "".join(char for char in decomposed if not unicodedata.combining(char))
    return " ".join(re.sub(r"[^a-z0-9]+", " ", ascii_value.lower()).split())


def name_similarity(expected, actual):
    left = normalize_name(expected)
    right = normalize_name(actual)
    if not left or not right:
        return 0.0
    if left == right:
        return 1.0
    if min(len(left), len(right)) >= 7 and (left in right or right in left):
        return 0.96
    left_tokens = set(left.split())
    right_tokens = set(right.split())
    token_overlap = len(left_tokens & right_tokens) / max(1, min(len(left_tokens), len(right_tokens)))
    return max(SequenceMatcher(None, left, right).ratio(), token_overlap)


def compare_wine_names(expected_names, actual_names):
    candidate_pairs = []
    for expected_index, expected in enumerate(expected_names):
        for actual_index, actual in enumerate(actual_names):
            score = name_similarity(expected, actual)
            if score >= 0.68:
                candidate_pairs.append((score, expected_index, actual_index))
    matched_expected = set()
    matched_actual = set()
    matches = []
    for score, expected_index, actual_index in sorted(candidate_pairs, reverse=True):
        if expected_index in matched_expected or actual_index in matched_actual:
            continue
        matched_expected.add(expected_index)
        matched_actual.add(actual_index)
        matches.append({
            "expected": expected_names[expected_index],
            "actual": actual_names[actual_index],
            "similarity": round(score, 3),
        })
    false_positives = [name for index, name in enumerate(actual_names) if index not in matched_actual]
    missed = [name for index, name in enumerate(expected_names) if index not in matched_expected]
    precision = len(matches) / len(actual_names) if actual_names else 0.0
    recall = len(matches) / len(expected_names) if expected_names else 0.0
    return {
        "expected_count": len(expected_names), "actual_count": len(actual_names),
        "matched_count": len(matches), "precision": round(precision, 3), "recall": round(recall, 3),
        "matches": matches, "false_positives": false_positives, "missed": missed,
    }


def wait_for_terminal_state(page, mode):
    success_markers = (("Lote listo para revisar",) if mode == "etiqueta" else ("Lista de la carta",))
    failure_markers = ("No se pudo", "No hay conexion", "Error al", "Vuelve a intentarlo", "No hemos podido")
    deadline = time.monotonic() + TIMEOUT_MS / 1000
    while time.monotonic() < deadline:
        text = page.locator("body").inner_text()
        if any(marker in text for marker in success_markers):
            return "completed", text
        if any(marker in text for marker in failure_markers):
            return "blocked", text
        page.wait_for_timeout(500)
    return "timeout", page.locator("body").inner_text()


def compact_backend_observation(api_calls):
    detector = next((call for call in reversed(api_calls) if call["function"] == "detect-wine-regions"), None)
    analyzers = [call for call in api_calls if call["function"] == "analyze-wine-region"]
    menu = next((call for call in reversed(api_calls) if call["function"] == "scan-wine-menu"), None)
    if menu:
        payload = menu.get("payload") or {}
        return {
            "function": "scan-wine-menu", "http_status": menu["status"],
            "version": payload.get("scan_version"), "coverage": payload.get("coverage"),
            "names": [wine.get("nombre") for wine in payload.get("vinos", []) if wine.get("nombre")],
        }
    detector_payload = detector.get("payload", {}) if detector else {}
    candidate_names = []
    analyzer_versions = set()
    for call in analyzers:
        payload = call.get("payload") or {}
        if payload.get("analysis_version"):
            analyzer_versions.add(payload["analysis_version"])
        candidates = payload.get("candidates") or []
        if candidates and candidates[0].get("name"):
            candidate_names.append(candidates[0]["name"])
    return {
        "function": "multi-wine-label",
        "detector_http_status": detector.get("status") if detector else None,
        "detector_version": detector_payload.get("detector_version"),
        "analysis_versions": sorted(analyzer_versions), "coverage": detector_payload.get("coverage"),
        "detected_regions": len(detector_payload.get("regions") or []), "analyzed_regions": len(analyzers),
        "identified_candidates": len(candidate_names), "candidate_names": candidate_names,
    }


def run_fixture(browser, fixture, file_path):
    console_errors = []
    network_failures = []
    api_calls = []
    context = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=3)
    page = context.new_page()
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("requestfailed", lambda request: network_failures.append({"url": request.url, "failure": request.failure}))

    def capture_response(response):
        path = urlparse(response.url).path
        marker = "/functions/v1/"
        if marker not in path:
            return
        function_name = path.split(marker, 1)[1].split("/", 1)[0]
        try:
            payload = response.json()
        except Exception as error:
            payload = {"response_parse_error": str(error)}
        api_calls.append({"function": function_name, "status": response.status, "payload": payload})

    page.on("response", capture_response)
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
    backend = compact_backend_observation(api_calls)

    if fixture["mode"] == "etiqueta":
        result_count = page.locator('button[aria-label^="Region "]').count()
        anchored_pins = result_count
        coverage = next((line.strip() for line in body_text.splitlines() if "Cobertura" in line), None)
        accuracy = None
        expected = fixture["expected_min_results"]
        passed = (
            terminal_state == "completed" and result_count >= expected
            and backend.get("identified_candidates", 0) >= fixture["expected_min_identified"]
        )
    else:
        result_count = page.locator('button[aria-label^="Abrir vino "]').count()
        anchored_pins = page.locator('button[aria-label^="Vino "]').count()
        coverage = backend.get("coverage")
        accuracy = compare_wine_names(fixture["expected_wines"], backend.get("names", []))
        expected = len(fixture["expected_wines"])
        passed = (
            terminal_state == "completed" and accuracy["precision"] >= MIN_MENU_PRECISION
            and accuracy["recall"] >= MIN_MENU_RECALL and anchored_pins > 0
        )

    has_overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
    screenshot = ARTIFACTS / f"{fixture['id']}-real-mobile.png"
    page.screenshot(path=str(screenshot), full_page=True)
    passed = passed and not has_overflow and not console_errors
    result = {
        "fixture": fixture["id"], "source": str(fixture["source"]), "fixture_sha256": sha256(file_path),
        "mode": fixture["mode"], "expected_results": expected, "expected_rationale": fixture["rationale"],
        "terminal_state": terminal_state, "actual_results": result_count, "anchored_pins": anchored_pins,
        "coverage": coverage, "accuracy": accuracy, "backend": backend, "latency_ms": latency_ms,
        "horizontal_overflow": has_overflow, "console_errors": console_errors,
        "network_failures": network_failures, "screenshot": str(screenshot),
        "status": "PASS" if passed else "BLOCKED_OR_FAIL", "visible_excerpt": body_text[-1200:],
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
        "base_url": BASE_URL, "interception": False, "production_guard": True,
        "menu_thresholds": {"precision": MIN_MENU_PRECISION, "recall": MIN_MENU_RECALL},
        "all_passed": all(result["status"] == "PASS" for result in results), "results": results,
    }
    report_path = ARTIFACTS / "real-e2e-report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n")
    print(json.dumps(report, indent=2, ensure_ascii=True))
    if not report["all_passed"]:
        sys.exit(2)


if __name__ == "__main__":
    main()
