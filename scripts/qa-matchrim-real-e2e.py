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
            "Costa di Rose", "La Rosa",
        ],
        "rationale": "Dieciseis referencias legibles: diez lineas completas y seis identidades visibles en el borde derecho.",
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
    normalized = re.sub(r"[^a-z0-9]+", " ", ascii_value.lower())
    normalized = re.sub(r"([a-z])(\d)", r"\1 \2", normalized)
    normalized = re.sub(r"(\d)([a-z])", r"\1 \2", normalized)
    return " ".join(normalized.split())


def single_name_similarity(expected, actual):
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


def name_similarity(expected, actual):
    expected_aliases = str(expected or "").split(" || ")
    actual_aliases = str(actual or "").split(" || ")
    return max(
        single_name_similarity(expected_alias, actual_alias)
        for expected_alias in expected_aliases
        for actual_alias in actual_aliases
    )


def menu_row_identity(row):
    lines = [line.strip() for line in str(row or "").splitlines() if line.strip()]
    if lines and lines[0].isdigit():
        lines = lines[1:]
    if not lines:
        return ""
    name = lines[0]
    aliases = [name]
    if len(lines) > 1:
        detail_prefix = lines[1].split("·", 1)[0].strip()
        normalized_prefix = normalize_name(detail_prefix)
        service_tokens = {"copa", "botella", "ambos"}
        if (
            normalized_prefix
            and normalized_prefix not in service_tokens
            and not re.search(r"[%€$]", detail_prefix)
            and not normalized_prefix.startswith("identidad ")
        ):
            aliases.append(f"{detail_prefix} {name}")
    return " || ".join(aliases)


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


def compare_detection_boxes(expected_boxes, actual_boxes, threshold=0.3):
    def normalized(box):
        if not isinstance(box, dict):
            return None
        values = [box.get(key) for key in ("x", "y", "width", "height")]
        if not all(isinstance(value, (int, float)) for value in values):
            return None
        divisor = 100 if max(values) > 1.01 else 1
        return tuple(value / divisor for value in values)

    def iou(left, right):
        left_x, left_y, left_width, left_height = left
        right_x, right_y, right_width, right_height = right
        overlap_width = max(0, min(left_x + left_width, right_x + right_width) - max(left_x, right_x))
        overlap_height = max(0, min(left_y + left_height, right_y + right_height) - max(left_y, right_y))
        intersection = overlap_width * overlap_height
        union = left_width * left_height + right_width * right_height - intersection
        return intersection / union if union > 0 else 0

    expected = [tuple(box) for box in expected_boxes]
    actual = [box for value in actual_boxes if (box := normalized(value)) is not None]
    pairs = sorted(
        (
            (iou(expected_box, actual_box), expected_index, actual_index)
            for expected_index, expected_box in enumerate(expected)
            for actual_index, actual_box in enumerate(actual)
        ),
        reverse=True,
    )
    matched_expected = set()
    matched_actual = set()
    matches = []
    for score, expected_index, actual_index in pairs:
        if score < threshold:
            break
        if expected_index in matched_expected or actual_index in matched_actual:
            continue
        matched_expected.add(expected_index)
        matched_actual.add(actual_index)
        matches.append({
            "expected_index": expected_index,
            "actual_index": actual_index,
            "iou": round(score, 3),
        })
    return {
        "expected_count": len(expected),
        "actual_count": len(actual),
        "matched_count": len(matches),
        "precision": round(len(matches) / len(actual), 3) if actual else 0.0,
        "recall": round(len(matches) / len(expected), 3) if expected else 0.0,
        "mean_iou": round(sum(match["iou"] for match in matches) / len(matches), 3) if matches else 0.0,
        "threshold": threshold,
        "matches": matches,
    }


def wait_for_terminal_state(page, mode):
    success_markers = (("Lote listo para revisar",) if mode == "etiqueta" else ("Lista de la carta",))
    abstention_markers = (("Analisis incompleto",) if mode == "etiqueta" else ("No ha salido un escaneo",))
    failure_markers = ("No se pudo", "No hay conexion", "Error al", "Vuelve a intentarlo", "No hemos podido")
    deadline = time.monotonic() + TIMEOUT_MS / 1000
    while time.monotonic() < deadline:
        text = page.locator("body").inner_text()
        if any(marker in text for marker in success_markers):
            return "completed", text
        if any(marker in text for marker in abstention_markers):
            return "abstained", text
        if any(marker in text for marker in failure_markers):
            return "blocked", text
        page.wait_for_timeout(500)
    return "timeout", page.locator("body").inner_text()


def map_menu_position(position, scan_region):
    if not isinstance(position, dict) or not isinstance(scan_region, dict):
        return position if isinstance(position, dict) else None
    box = scan_region.get("box") if isinstance(scan_region.get("box"), dict) else scan_region
    values = [position.get("x"), position.get("y"), box.get("x"), box.get("y"), box.get("width"), box.get("height")]
    if not all(isinstance(value, (int, float)) for value in values):
        return position
    mapped = dict(position)
    mapped["x"] = box["x"] + position["x"] * box["width"] / 100
    mapped["y"] = box["y"] + position["y"] * box["height"] / 100
    if isinstance(position.get("width"), (int, float)):
        mapped["width"] = position["width"] * box["width"] / 100
    if isinstance(position.get("height"), (int, float)):
        mapped["height"] = position["height"] * box["height"] / 100
    return mapped


def menu_identity(item):
    return " ".join(str(value) for value in (
        item.get("producer"), item.get("name"), item.get("vintage"), item.get("section")
    ) if value not in (None, ""))


def is_duplicate_menu_item(left, right):
    if name_similarity(menu_identity(left), menu_identity(right)) < 0.72:
        return False
    left_source = normalize_name(left.get("source_text"))
    right_source = normalize_name(right.get("source_text"))
    same_source = bool(
        left_source and right_source and (
            left_source == right_source
            or (min(len(left_source), len(right_source)) >= 14 and (left_source in right_source or right_source in left_source))
        )
    )
    left_position = left.get("position") if isinstance(left.get("position"), dict) else None
    right_position = right.get("position") if isinstance(right.get("position"), dict) else None
    same_position = bool(
        left_position and right_position
        and all(isinstance(position.get(axis), (int, float)) for position in (left_position, right_position) for axis in ("x", "y"))
        and abs(left_position["x"] - right_position["x"]) <= 7
        and abs(left_position["y"] - right_position["y"]) <= 7
    )
    return same_source or same_position


def merge_menu_items(items):
    merged = []
    for item in items:
        duplicate_index = next((
            index for index, existing in enumerate(merged) if is_duplicate_menu_item(existing, item)
        ), None)
        if duplicate_index is None:
            merged.append(item)
            continue
        existing = merged[duplicate_index]
        preferred, fallback = (item, existing) if (item.get("confidence") or 0) > (existing.get("confidence") or 0) else (existing, item)
        merged[duplicate_index] = {
            **fallback,
            **preferred,
            "producer": preferred.get("producer") or fallback.get("producer"),
            "vintage": preferred.get("vintage") or fallback.get("vintage"),
            "section": preferred.get("section") or fallback.get("section"),
            "source_text": preferred.get("source_text") or fallback.get("source_text"),
            "position": preferred.get("position") or fallback.get("position"),
        }
    return merged


def compact_backend_observation(api_calls):
    detector = next((call for call in reversed(api_calls) if call["function"] == "detect-wine-regions"), None)
    analyzers = [call for call in api_calls if call["function"] == "analyze-wine-region"]
    menus = [call for call in api_calls if call["function"] == "scan-wine-menu"]
    if menus:
        full_menu = next((
            menu for menu in menus
            if (menu.get("request_payload") or {}).get("scan_region", {}).get("id") == "full"
        ), None)
        if (
            full_menu
            and isinstance((full_menu.get("payload") or {}).get("coverage"), dict)
            and (full_menu.get("payload") or {})["coverage"].get("status") == "reported_complete"
            and (full_menu.get("payload") or {}).get("vinos")
        ):
            menus = [full_menu]
        elif any((menu.get("request_payload") or {}).get("scan_region", {}).get("id") != "full" for menu in menus):
            menus = [
                menu for menu in menus
                if (menu.get("request_payload") or {}).get("scan_region", {}).get("id") != "full"
            ]
        all_items = []
        coverages = []
        versions = []
        for menu in menus:
            payload = menu.get("payload") or {}
            wines = payload.get("vinos", []) if isinstance(payload.get("vinos"), list) else []
            request_payload = menu.get("request_payload") or {}
            scan_region = request_payload.get("scan_region")
            if isinstance(payload.get("coverage"), dict):
                coverages.append(payload["coverage"])
            if payload.get("scan_version"):
                versions.append(payload["scan_version"])
            for wine in wines:
                if not isinstance(wine, dict) or not wine.get("nombre"):
                    continue
                all_items.append({
                    "name": wine.get("nombre"),
                    "producer": wine.get("productor"),
                    "vintage": wine.get("anada"),
                    "section": wine.get("seccion"),
                    "confidence": wine.get("confidence"),
                    "doubts": wine.get("dudas") if isinstance(wine.get("dudas"), list) else [],
                    "source_text": wine.get("texto_fuente"),
                    "position": map_menu_position(wine.get("posicion"), scan_region),
                })
        items = merge_menu_items(all_items)
        coverage_statuses = [coverage.get("status", "unknown") for coverage in coverages]
        coverage_status = "partial" if "partial" in coverage_statuses else (
            "reported_complete" if coverage_statuses and all(status == "reported_complete" for status in coverage_statuses) else "unknown"
        )
        return {
            "function": "scan-wine-menu", "http_status": max(menu["status"] for menu in menus),
            "call_count": len(menus), "versions": sorted(set(versions)),
            "coverage": {"status": coverage_status, "extracted_wines": len(items)},
            "names": [menu_identity(item) for item in items],
            "items": items,
        }
    detector_payload = detector.get("payload", {}) if detector else {}
    detected_boxes = [
        region.get("box") for region in detector_payload.get("regions", [])
        if isinstance(region, dict) and isinstance(region.get("box"), dict)
    ]
    detected_region_ids = [
        region.get("id") for region in detector_payload.get("regions", []) if region.get("id")
    ]
    candidate_names = []
    analyzer_versions = set()
    analysis_by_region = {}
    for call in analyzers:
        payload = call.get("payload") or {}
        if payload.get("analysis_version"):
            analyzer_versions.add(payload["analysis_version"])
        region_id = call.get("region_id") or f"unknown-{len(analysis_by_region) + 1}"
        analysis_by_region.setdefault(region_id, []).append(call)
    recovered_analysis_failures = 0
    final_failed_regions = []
    region_results = []
    for region_id, calls in analysis_by_region.items():
        successful = [call for call in calls if call["status"] == 200]
        if successful and any(call["status"] != 200 for call in calls):
            recovered_analysis_failures += 1
        if not successful:
            final_failed_regions.append(region_id)
            continue
        payload = successful[-1].get("payload") or {}
        candidates = payload.get("candidates") or []
        fallback = payload.get("fallback") if isinstance(payload.get("fallback"), dict) else None
        if candidates and candidates[0].get("name"):
            candidate_names.append(candidates[0]["name"])
        region_results.append({
            "region_id": region_id,
            "attempts": len(calls),
            "status_codes": [call["status"] for call in calls],
            "candidate": candidates[0].get("name") if candidates else None,
            "confidence": candidates[0].get("confidence") if candidates else None,
            "recognition_status": payload.get("recognition_status"),
            "fallback_code": fallback.get("code") if fallback else None,
        })
    missing_region_ids = [region_id for region_id in detected_region_ids if region_id not in analysis_by_region]
    final_failed_regions.extend(missing_region_ids)
    return {
        "function": "multi-wine-label",
        "detector_http_status": detector.get("status") if detector else None,
        "detector_version": detector_payload.get("detector_version"),
        "detected_boxes": detected_boxes,
        "analysis_versions": sorted(analyzer_versions), "coverage": detector_payload.get("coverage"),
        "detected_regions": len(detector_payload.get("regions") or []),
        "analyzed_regions": len(analysis_by_region),
        "analysis_attempts": len(analyzers),
        "recovered_analysis_failures": recovered_analysis_failures,
        "final_failed_regions": sorted(set(final_failed_regions)),
        "identified_candidates": len(candidate_names), "candidate_names": candidate_names,
        "region_results": region_results,
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
            request_payload = response.request.post_data_json or {}
        except Exception:
            request_payload = {}
        try:
            payload = response.json()
        except Exception as error:
            payload = {"response_parse_error": str(error)}
        api_calls.append({
            "function": function_name,
            "status": response.status,
            "region_id": request_payload.get("region_id"),
            "request_payload": request_payload,
            "payload": payload,
        })

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
    canonical_accuracy = None

    expectation = fixture.get("expectation", "inherit")
    if fixture["mode"] == "etiqueta":
        result_count = page.locator('button[aria-label^="Region "]').count()
        anchored_pins = result_count
        result_rows = page.locator('button[aria-label^="Abrir detalle de "]').all_inner_texts()
        individual_affinity_scores = sum(1 for row in result_rows if re.search(r"(?<!\d)\d{1,3}%(?!\d)", row))
        coverage = next((line.strip() for line in body_text.splitlines() if "Cobertura" in line), None)
        expected_names = fixture.get("expected_wines", [])
        displayed_names = [
            next((line.strip() for line in row.splitlines()[1:] if line.strip()), row.strip())
            for row in result_rows
        ]
        accuracy = compare_wine_names(expected_names, displayed_names) if expected_names else None
        detection_accuracy = compare_detection_boxes(
            fixture.get("expected_boxes", []), backend.get("detected_boxes", [])
        ) if fixture.get("expected_boxes") else None
        expected = fixture["expected_min_results"]
        high_confidence_results = sum(
            1 for region in backend.get("region_results", [])
            if isinstance(region.get("confidence"), (int, float)) and region["confidence"] >= 0.72
        )
        if expectation == "abstain":
            passed = (
                terminal_state == "completed" and result_count >= expected
                and high_confidence_results <= fixture.get("max_high_confidence_results", 0)
                and not backend.get("final_failed_regions")
            )
        elif expectation == "grounded_or_abstain":
            passed = (
                terminal_state in {"completed", "abstained"} and result_count >= expected
                and high_confidence_results <= fixture.get("max_high_confidence_results", 0)
                and not backend.get("final_failed_regions")
            )
        else:
            expected_affinity_results = len(expected_names) if expected_names else fixture["expected_min_identified"]
            passed = (
                terminal_state == "completed" and result_count >= expected
                and backend.get("identified_candidates", 0) >= fixture["expected_min_identified"]
                and individual_affinity_scores >= expected_affinity_results
                and not backend.get("final_failed_regions")
            )
            if accuracy:
                passed = (
                    passed
                    and accuracy["recall"] >= fixture.get("identity_min_recall", 0.8)
                    and accuracy["precision"] >= fixture.get("identity_min_precision", 0.7)
                )
    else:
        result_buttons = page.locator('button[aria-label^="Abrir vino "]')
        result_rows = result_buttons.all_inner_texts()
        displayed_names = [menu_row_identity(row) for row in result_rows]
        result_count = len(result_rows)
        anchored_pins = page.locator('button[aria-label^="Vino "]').count()
        coverage = backend.get("coverage")
        backend_identities = [menu_identity(item) for item in backend.get("items", [])]
        accuracy = compare_wine_names(fixture["expected_wines"], displayed_names)
        canonical_accuracy = compare_wine_names(fixture["expected_wines"], backend_identities)
        detection_accuracy = None
        individual_affinity_scores = sum(
            1 for value in page.locator('button[aria-label^="Abrir vino "]').all_inner_texts()
            if re.search(r"(?<!\d)\d{1,3}%(?!\d)", value)
        )
        high_confidence_results = sum(
            1 for item in backend.get("items", [])
            if isinstance(item.get("confidence"), (int, float)) and item["confidence"] >= 0.72
        )
        expected = len(fixture["expected_wines"])
        if expectation == "abstain":
            passed = (
                terminal_state in {"completed", "abstained"} and not accuracy["false_positives"]
                and high_confidence_results <= fixture.get("max_high_confidence_results", 0)
            )
        elif expectation == "grounded_or_abstain":
            grounded_high_confidence = all(
                item.get("source_text") for item in backend.get("items", [])
                if isinstance(item.get("confidence"), (int, float)) and item["confidence"] >= 0.72
            )
            passed = terminal_state in {"completed", "abstained"} and grounded_high_confidence
        else:
            passed = (
                terminal_state == "completed" and accuracy["precision"] >= MIN_MENU_PRECISION
                and accuracy["recall"] >= MIN_MENU_RECALL and anchored_pins > 0
            )

    has_overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
    overflow_elements = page.evaluate("""() => Array.from(document.querySelectorAll('body *'))
      .filter((element) => element.scrollWidth > element.clientWidth + 2)
      .slice(0, 12)
      .map((element) => ({
        tag: element.tagName,
        className: typeof element.className === 'string' ? element.className.slice(0, 180) : '',
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        text: (element.textContent || '').trim().slice(0, 100),
      }))""")
    screenshot = ARTIFACTS / f"{fixture['id']}-real-mobile.png"
    page.screenshot(path=str(screenshot), full_page=True)
    unhandled_console_errors = list(console_errors)
    recovered_failures = backend.get("recovered_analysis_failures", 0)
    for _ in range(recovered_failures):
        recovered_index = next((
            index for index, message in enumerate(unhandled_console_errors)
            if "status of 500" in message
        ), None)
        if recovered_index is not None:
            unhandled_console_errors.pop(recovered_index)
    passed = passed and not has_overflow and not unhandled_console_errors
    result = {
        "fixture": fixture["id"], "source": str(fixture["source"]), "fixture_sha256": sha256(file_path),
        "mode": fixture["mode"], "expected_results": expected, "expected_rationale": fixture["rationale"],
        "expectation": expectation,
        "terminal_state": terminal_state, "actual_results": result_count, "anchored_pins": anchored_pins,
        "individual_affinity_scores": individual_affinity_scores,
        "high_confidence_results": high_confidence_results,
        "coverage": coverage, "accuracy": accuracy, "canonical_accuracy": canonical_accuracy,
        "displayed_names": displayed_names,
        "backend": backend, "latency_ms": latency_ms,
        "detection_accuracy": detection_accuracy,
        "horizontal_overflow": has_overflow, "console_errors": console_errors,
        "overflow_elements": overflow_elements,
        "unhandled_console_errors": unhandled_console_errors,
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
            print(f"RUN {fixture['id']}", flush=True)
            result = run_fixture(browser, fixture, file_path)
            results.append(result)
            accuracy = result.get("accuracy") or {}
            print(
                f"DONE {fixture['id']} {result['status']} results={result['actual_results']} "
                f"precision={accuracy.get('precision', '-')} recall={accuracy.get('recall', '-')} "
                f"latency_ms={result['latency_ms']}",
                flush=True,
            )
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
