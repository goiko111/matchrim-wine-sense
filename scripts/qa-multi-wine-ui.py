import json
import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import Route, sync_playwright


BASE_URL = os.environ.get("MATCHRIM_QA_URL", "http://127.0.0.1:4173")
EMBEDDED_FIXTURES = os.environ.get("MATCHRIM_QA_EMBEDDED_FIXTURES") == "true"
REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = Path(os.environ.get(
    "MATCHRIM_QA_ARTIFACTS",
    REPOSITORY_ROOT / "qa-artifacts" / "2026-09-01-build61-hotfix",
))
LABEL_FIXTURE = Path("/Users/GOIKO/Downloads/IMG_7605 2.jpg")
MENU_SOURCE_FIXTURES = [
    Path("/Users/GOIKO/Downloads/IMG_7547 2.HEIC"),
    Path("/Users/GOIKO/Downloads/IMG_7548 2.HEIC"),
    Path("/Users/GOIKO/Downloads/IMG_7552 2.HEIC"),
    Path("/Users/GOIKO/Downloads/IMG_7553 2.HEIC"),
]
MENU_FIXTURES = [ARTIFACTS / "fixtures" / f"{source.stem}.jpg" for source in MENU_SOURCE_FIXTURES]
CHROME = os.environ.get("MATCHRIM_QA_CHROME")


def materialize_fixtures():
    for source, target in zip(MENU_SOURCE_FIXTURES, MENU_FIXTURES):
        if not source.exists():
            raise FileNotFoundError(source)
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists() or source.stat().st_mtime > target.stat().st_mtime:
            subprocess.run(
                ["sips", "-s", "format", "jpeg", str(source), "--out", str(target)],
                check=True,
                capture_output=True,
                text=True,
            )


def candidate(name, producer, confidence, affinity, *, uncertainty=None, vintage=2020):
    return {
        "name": name,
        "producer": producer,
        "vintage": vintage,
        "region": "Rioja",
        "country": "Espana",
        "grapes": ["Tempranillo"],
        "confidence": confidence,
        "source": "label",
        "evidence": [f"Texto visible: {name}", f"Marca visible: {producer}"],
        "uncertainty_reasons": uncertainty or [],
        "inferred_fields": ["sensory_attributes"],
        "affinity": affinity,
        "affinity_confidence": min(confidence, 0.58),
        "affinity_reason": "Afinidad calculada con atributos sensoriales inferidos.",
        "sensory_attributes": {
            "potencia": 4,
            "acidez": 3,
            "dulzura": 1,
            "taninos": 4,
            "afrutado": 3,
            "madera": 4,
            "intensidad": 4,
        },
    }


def function_response(endpoint, request):
    if endpoint == "detect-wine-regions":
        return {
            "coverage": {
                "status": "unknown",
                "detected_objects": 5,
                "estimated_visible_objects": None,
                "confidence": None,
                "notes": ["Fixture de interfaz: no mide recall ni cobertura visual real."],
            },
            "regions": [
                {"box": {"x": 3, "y": 15, "width": 16, "height": 68}, "confidence": 0.94, "quality": {"glare": "medium", "occlusion": "low", "legibility": "good"}},
                {"box": {"x": 22, "y": 18, "width": 17, "height": 64}, "confidence": 0.82, "quality": {"glare": "high", "occlusion": "medium", "legibility": "limited"}},
                {"box": {"x": 42, "y": 13, "width": 16, "height": 70}, "confidence": 0.91, "quality": {"glare": "low", "occlusion": "low", "legibility": "good"}},
                {"box": {"x": 61, "y": 17, "width": 16, "height": 66}, "confidence": 0.86, "quality": {"glare": "medium", "occlusion": "medium", "legibility": "good"}},
                {"box": {"x": 81, "y": 20, "width": 15, "height": 61}, "confidence": 0.63, "quality": {"glare": "high", "occlusion": "high", "legibility": "poor"}},
            ]
        }
    if endpoint == "analyze-wine-region":
        payload = request.post_data_json or {}
        region_id = payload.get("region_id")
        if region_id == "region-2":
            return {
                "candidates": [
                    candidate("Marques de Riscal Reserva", "Herederos del Marques de Riscal", 0.61, 76, uncertainty=["Reflejo sobre la palabra central"]),
                    candidate("Marques de Caceres Reserva", "Marques de Caceres", 0.43, 71, uncertainty=["Tipografia parcialmente oculta"]),
                ]
            }
        if region_id == "region-3":
            return {
                "candidates": [
                    candidate("Baron Saint George Grand Vin de Bordeaux", "Chateau Saint George", 0.86, 83, vintage=2023),
                ]
            }
        if region_id == "region-5":
            return {
                "candidates": [],
                "recognition_status": "unreadable",
                "fallback": {
                    "code": "insufficient_visible_text",
                    "message": "No hay texto legible suficiente para identificar este vino.",
                    "suggested_actions": [
                        "Acerca la camara a una sola etiqueta.",
                        "Evita reflejos y enfoca el nombre o la bodega.",
                    ],
                },
            }
        return {"candidates": [candidate("Muga Reserva", "Bodegas Muga", 0.91, 88)]}
    if endpoint == "search-wines":
        return {"wines": []}
    if endpoint == "scan-wine-menu":
        return {
            "has_profile": True,
            "scan_version": "scan-wine-menu-ui-fixture-v1",
            "coverage": {
                "status": "reported_complete",
                "extracted_wines": 5,
                "estimated_visible_wines": 5,
                "notes": [],
            },
            "vinos": [
                {
                    "nombre": "Finca Dofi",
                    "productor": "Alvaro Palacios",
                    "anada": 2021,
                    "region": "Priorat",
                    "pais": "Espana",
                    "tipo": "Tinto",
                    "precio": 86,
                    "precios": {"botella": 86},
                    "servicio": "botella",
                    "seccion": "Tintos de Cataluna",
                    "confidence": 0.92,
                    "compatibilidad": 91,
                    "razon": "Cuerpo y fruta maduros alineados; tanino algo mas alto.",
                    "atributos": {"potencia": 4, "acidez": 4, "dulzura": 1, "taninos": 4, "afrutado": 4},
                    "posicion": {"x": 10, "y": 20, "width": 36, "height": 5, "confidence": 0.92},
                },
                {
                    "nombre": "Pazo de Senorans",
                    "productor": "Pazo de Senorans",
                    "anada": 2023,
                    "region": "Rias Baixas",
                    "pais": "Espana",
                    "tipo": "Blanco",
                    "precio": 36,
                    "precios": {"copa": 7.5, "botella": 36},
                    "servicio": "ambos",
                    "seccion": "Blancos atlanticos",
                    "confidence": 0.87,
                    "compatibilidad": 84,
                    "razon": "Acidez viva y perfil frutal con buena afinidad.",
                    "atributos": {"potencia": 2, "acidez": 5, "dulzura": 1, "taninos": 1, "afrutado": 4},
                    "posicion": {"x": 52, "y": 64, "width": 38, "height": 5, "confidence": 0.86},
                },
                {
                    "nombre": "La Montesa",
                    "productor": "Palacios Remondo",
                    "anada": 2020,
                    "region": "Rioja",
                    "pais": "Espana",
                    "tipo": "Tinto",
                    "precio": 28,
                    "precios": {"copa": 6, "botella": 28},
                    "servicio": "ambos",
                    "seccion": "Tintos de Rioja",
                    "confidence": 0.79,
                    "compatibilidad": 82,
                    "razon": "Opcion equilibrada y de valor seguro.",
                    "atributos": {"potencia": 3, "acidez": 3, "dulzura": 1, "taninos": 3, "afrutado": 4},
                    "posicion": {"x": 9, "y": 58, "width": 35, "height": 5, "confidence": 0.79},
                },
                {
                    "nombre": "Louro do Bolo",
                    "productor": "Rafael Palacios",
                    "anada": 2022,
                    "region": "Valdeorras",
                    "pais": "Espana",
                    "tipo": "Blanco",
                    "precio": 31,
                    "precios": {"copa": 6.2, "botella": 31},
                    "servicio": "copa",
                    "seccion": "Por copas",
                    "confidence": 0.76,
                    "compatibilidad": 74,
                    "razon": "Opcion mas exploratoria con acidez marcada.",
                    "atributos": {"potencia": 3, "acidez": 4, "dulzura": 1, "taninos": 1, "afrutado": 3},
                    "posicion": {"x": 53, "y": 68, "width": 34, "height": 5, "confidence": 0.76},
                },
                {
                    "nombre": "Entrada dudosa",
                    "productor": None,
                    "anada": None,
                    "region": None,
                    "pais": None,
                    "tipo": "Sin confirmar",
                    "precio": 18,
                    "servicio": "copa",
                    "seccion": "Especiales",
                    "confidence": 0.41,
                    "compatibilidad": 55,
                    "razon": "Identidad insuficiente para una recomendacion firme.",
                    "atributos": {"potencia": 3, "acidez": 3, "dulzura": 2, "taninos": 2, "afrutado": 3},
                    "posicion": {"x": 53, "y": 73, "width": 35, "height": 5, "confidence": 0.41},
                },
            ],
        }
    return {}


def install_routes(page, console_errors, *, accept_privacy=True, response_handler=None):
    def handle_function(route: Route):
        endpoint = urlparse(route.request.url).path.rstrip("/").split("/")[-1]
        response = response_handler(endpoint, route.request) if response_handler else function_response(endpoint, route.request)
        if isinstance(response, tuple):
            status, body, extra_headers = response
        else:
            status, body, extra_headers = 200, response, {}
        route.fulfill(
            status=status,
            content_type="application/json",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "Retry-After, sb-error-code",
                **extra_headers,
            },
            body=json.dumps(body),
        )

    if EMBEDDED_FIXTURES:
        page.route("**/functions/v1/**", lambda route: route.abort())
    else:
        page.route("**/functions/v1/**", handle_function)
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    privacy_setup = (
        "localStorage.setItem('matchrim.scan_privacy_notice.v2', 'accepted');"
        if accept_privacy
        else "localStorage.removeItem('matchrim.scan_privacy_notice.v2');"
    )
    page.add_init_script(f"""
      localStorage.setItem('matchrim_quiz_result', JSON.stringify({{
        potente: 4, acidez: 4, dulce: 1, tanico: 3, afrutado: 4
      }}));
      {privacy_setup}
    """)


def assert_no_horizontal_overflow(page, label):
    dimensions = page.evaluate("""() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    })""")
    if dimensions["scrollWidth"] > dimensions["clientWidth"] + 2:
        raise AssertionError(f"{label}: horizontal overflow {dimensions}")
    return dimensions


def run_privacy_safe_area_qa(browser, results, console_errors):
    context = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=3)
    page = context.new_page()
    install_routes(page, console_errors, accept_privacy=False)
    page.goto(f"{BASE_URL}/escanear/etiqueta")
    page.wait_for_load_state("networkidle")
    page.evaluate("""() => {
      document.documentElement.style.setProperty('--matchrim-native-safe-top', '59px');
      document.documentElement.style.setProperty('--matchrim-native-safe-bottom', '34px');
    }""")
    guard_box = page.locator(".matchrim-safe-area-top-guard").bounding_box()
    if guard_box is None or guard_box["height"] < 59:
        raise AssertionError(f"safe-area guard does not cover the simulated Dynamic Island: {guard_box}")
    gate = page.get_by_role("heading", name="Antes de analizar una imagen")
    gate.wait_for()
    assert page.locator('input[type="file"]').count() == 0
    gate_top = gate.bounding_box()["y"]
    if gate_top < 59:
        raise AssertionError(f"privacy gate is under the simulated safe area: y={gate_top}")
    continue_button = page.get_by_role("button", name="Entiendo y continuar")
    assert continue_button.is_disabled()
    page.get_by_role("checkbox").check()
    assert continue_button.is_enabled()
    acknowledgement = page.get_by_role("checkbox").locator("xpath=ancestor::label")
    acknowledgement_box = acknowledgement.bounding_box()
    initial_button_box = continue_button.bounding_box()
    if acknowledgement_box["y"] + acknowledgement_box["height"] > initial_button_box["y"]:
        raise AssertionError(
            f"privacy CTA overlaps acknowledgement: acknowledgement={acknowledgement_box}, button={initial_button_box}"
        )
    continue_button.evaluate("element => element.scrollIntoView({ block: 'center' })")
    button_box = continue_button.bounding_box()
    nav_box = page.get_by_role("navigation", name="Navegación principal").bounding_box()
    if button_box["y"] + button_box["height"] > nav_box["y"]:
        raise AssertionError(f"privacy CTA overlaps bottom navigation: button={button_box}, nav={nav_box}")
    page.screenshot(path=str(ARTIFACTS / "privacy-safe-area-mobile.png"), full_page=True)
    continue_button.click()
    page.locator('input[type="file"]').first.wait_for(state="attached")
    dimensions = assert_no_horizontal_overflow(page, "privacy gate mobile")
    nav_link_sizes = page.get_by_role("navigation", name="Navegación principal").locator("a").evaluate_all("""elements =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { name: element.getAttribute('aria-label'), width: box.width, height: box.height };
      })""")
    if any(item["width"] < 44 or item["height"] < 44 or not item["name"] for item in nav_link_sizes):
        raise AssertionError(f"bottom navigation target below 44px or unnamed: {nav_link_sizes}")
    results.append({
        "case": "privacidad_y_safe_area",
        "expected": "sin acceso a fotos antes del consentimiento, sin solapes y por debajo de 59 px de safe area",
        "actual": f"PASS guard={guard_box['height']:.1f}px gate_y={gate_top:.1f} acknowledgement_bottom={acknowledgement_box['y'] + acknowledgement_box['height']:.1f} cta_flow_top={initial_button_box['y']:.1f} visible_cta_bottom={button_box['y'] + button_box['height']:.1f} nav_top={nav_box['y']:.1f} nav_links={nav_link_sizes} {dimensions}",
    })
    context.close()


def run_privacy_landscape_qa(browser, results, console_errors):
    context = browser.new_context(viewport={"width": 932, "height": 430}, device_scale_factor=2)
    page = context.new_page()
    install_routes(page, console_errors, accept_privacy=False)
    page.goto(f"{BASE_URL}/escanear/etiqueta")
    page.wait_for_load_state("networkidle")
    page.evaluate("""() => {
      document.documentElement.style.setProperty('--matchrim-native-safe-top', '0px');
      document.documentElement.style.setProperty('--matchrim-native-safe-bottom', '21px');
    }""")
    page.get_by_role("heading", name="Antes de analizar una imagen").wait_for()
    page.get_by_role("checkbox").check()
    continue_button = page.get_by_role("button", name="Entiendo y continuar")
    continue_button.scroll_into_view_if_needed()
    button_box = continue_button.bounding_box()
    nav = page.get_by_role("navigation", name="Navegación principal")
    nav_box = nav.bounding_box() if nav.count() else None
    safe_bottom_boundary = nav_box["y"] if nav_box else 430 - 21
    if button_box["y"] < 0 or button_box["y"] + button_box["height"] > safe_bottom_boundary:
        raise AssertionError(f"landscape privacy CTA inaccessible: button={button_box}, boundary={safe_bottom_boundary}")
    dimensions = assert_no_horizontal_overflow(page, "privacy gate landscape")
    page.screenshot(path=str(ARTIFACTS / "privacy-safe-area-landscape.png"), full_page=False)
    results.append({
        "case": "privacidad_paisaje",
        "expected": "consentimiento desplazable y CTA visible sobre la navegacion a 932x430",
        "actual": f"PASS cta_bottom={button_box['y'] + button_box['height']:.1f} boundary={safe_bottom_boundary:.1f} {dimensions}",
    })
    context.close()


def run_label_qa(browser, results, console_errors):
    context = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2)
    page = context.new_page()
    install_routes(page, console_errors)
    page.goto(f"{BASE_URL}/escanear/etiqueta")
    page.wait_for_load_state("networkidle")
    page.locator('input[type="file"]').nth(1).set_input_files(str(LABEL_FIXTURE))
    page.get_by_text("Lote listo para revisar").wait_for(timeout=30_000)
    performance_summary = page.get_by_test_id("scan-performance-summary")
    performance_summary.wait_for()
    assert "5 regiones en" in performance_summary.inner_text()
    page.get_by_role("button", name="Región 5, Sin reconocer").wait_for()
    assert page.get_by_text("Muga Reserva", exact=True).count() >= 1
    assert page.get_by_text("Marques de Riscal Reserva", exact=True).count() >= 1
    assert page.get_by_text("Baron Saint George Grand Vin de Bordeaux", exact=True).count() >= 1
    assert page.get_by_text("2 botellas", exact=False).count() >= 1
    assert page.get_by_role("button", name="Confirmar 2 referencias").count() == 1
    first_pin_box = page.get_by_test_id("region-pin-1").bounding_box()
    first_outline = page.get_by_test_id("region-outline-1")
    first_outline_box = first_outline.bounding_box()
    assert first_pin_box["width"] >= 44 and first_pin_box["height"] >= 44, first_pin_box
    assert first_outline.evaluate("element => getComputedStyle(element).pointerEvents") == "none"
    assert first_outline_box["width"] > 0 and first_outline_box["height"] > 0, first_outline_box
    comparison = page.locator('section[aria-labelledby="wine-comparison-title"]')
    comparison.get_by_text("Comparar 2–5 vinos", exact=True).wait_for()
    selected_count = comparison.locator("span", has_text="/5 seleccionados").first.inner_text()
    assert selected_count == "3/5 seleccionados", selected_count
    assert comparison.get_by_text("Elección para ti", exact=True).count() == 1
    comparison.get_by_role("button", name="Servicio").click()
    assert comparison.get_by_text("Elección para servir", exact=True).count() == 1
    results.append({"case": "multietiqueta_resumen", "expected": "5 regiones, 3 referencias, duplicado agrupado, duda y objeto sin reconocer", "actual": "PASS"})
    results.append({"case": "multietiqueta_comparacion", "expected": "compara referencias y cambia entre decisión personal y servicio sin inventar un score", "actual": "PASS"})
    results.append({"case": "multietiqueta_metricas", "expected": "resumen visible de regiones y tiempo total tras terminar", "actual": f"PASS {performance_summary.inner_text()}"})
    results.append({"case": "multietiqueta_overflow_movil", "expected": "sin desbordamiento horizontal a 393x852 con nombres largos", "actual": f"PASS {assert_no_horizontal_overflow(page, 'label mobile')}"})
    page.screenshot(path=str(ARTIFACTS / "multi-label-summary-mobile.png"), full_page=True)

    page.get_by_role("button", name="Región 2, Dudoso").click()
    page.get_by_text("Candidatos", exact=True).wait_for()
    assert page.get_by_text("Duda:").count() >= 1
    guide = page.get_by_test_id("airim-context-guide")
    guide.get_by_text("Confirma antes de elegir", exact=True).wait_for()
    assert page.get_by_text("Por qué encaja", exact=True).count() >= 1
    assert page.get_by_text("Lo que podría no encajar", exact=True).count() >= 1
    assert page.get_by_text("Coincidencias principales", exact=True).count() >= 1
    assert page.get_by_text("Fricciones", exact=True).count() >= 1
    assert page.get_by_text("Datos y límites del cálculo", exact=True).count() >= 1
    identity_warning = page.get_by_text("Identidad sin confirmar", exact=False)
    assert identity_warning.count() >= 1
    results.append({"case": "multietiqueta_detalle", "expected": "top candidatos, evidencia, duda, gate de identidad y afinidad explicada en drawer", "actual": "PASS"})
    guide.scroll_into_view_if_needed()
    page.screenshot(path=str(ARTIFACTS / "multi-label-airim-guide-mobile.png"), full_page=False)
    identity_warning.scroll_into_view_if_needed()
    page.screenshot(path=str(ARTIFACTS / "multi-label-detail-mobile.png"), full_page=False)
    guide.get_by_role("button", name="Confirmar este candidato").click()
    page.get_by_text("Región 2: Reconocido", exact=True).wait_for()
    page.get_by_role("button", name="Cerrar").click()
    confirmed_candidate_labels = page.locator("button").filter(has_text="Confirmar").all_inner_texts()
    assert any("Confirmar 3 referencias" in label for label in confirmed_candidate_labels), confirmed_candidate_labels
    page.get_by_role("button", name="Región 5, Sin reconocer").click()
    page.get_by_test_id("airim-context-guide").get_by_text("Primero, una identidad verificable", exact=True).wait_for()
    fallback_message = page.get_by_text("No hay texto legible suficiente", exact=False)
    fallback_message.wait_for()
    fallback_message.scroll_into_view_if_needed()
    page.screenshot(path=str(ARTIFACTS / "multi-label-unreadable-fallback-mobile.png"), full_page=False)
    page.get_by_label("Vino", exact=True).fill("Identidad confirmada")
    page.get_by_label("Bodega (opcional)", exact=True).fill("Bodega de prueba")
    page.get_by_role("button", name="Aplicar identidad manual").click()
    page.get_by_text("Identidad introducida manualmente", exact=False).wait_for()
    assert page.get_by_text("Afinidad pendiente de datos sensoriales verificables", exact=False).count() >= 1
    page.screenshot(path=str(ARTIFACTS / "multi-label-manual-fallback-mobile.png"), full_page=False)
    page.get_by_role("button", name="Cerrar").click()
    confirm_labels = page.locator("button").filter(has_text="Confirmar").all_inner_texts()
    assert any("Confirmar 4 referencias" in label for label in confirm_labels), confirm_labels
    results.append({
        "case": "multietiqueta_abstencion_y_correccion",
        "expected": "motivo de abstencion, acciones, correccion manual y afinidad pendiente sin datos",
        "actual": "PASS",
    })
    context.close()


def run_identity_correction_qa(browser, results, console_errors):
    context = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2)
    page = context.new_page()
    install_routes(page, console_errors)
    page.goto(f"{BASE_URL}/escanear/etiqueta")
    page.wait_for_load_state("networkidle")
    page.locator('input[type="file"]').nth(1).set_input_files(str(LABEL_FIXTURE))
    page.get_by_text("Lote listo para revisar").wait_for(timeout=30_000)
    page.get_by_role("button", name="Región 1, Reconocido").click()
    page.get_by_label("Vino", exact=True).fill("Identidad corregida")
    page.get_by_text("Afinidad sin desglose suficiente", exact=True).wait_for()
    guide = page.get_by_test_id("airim-context-guide")
    guide.get_by_text("Identidad lista; afinidad pendiente", exact=True).wait_for()
    assert guide.get_by_text("Esta guía explica datos existentes", exact=False).count() == 1
    guide.scroll_into_view_if_needed()
    page.screenshot(path=str(ARTIFACTS / "multi-label-identity-correction-mobile.png"), full_page=False)
    results.append({
        "case": "multietiqueta_correccion_invalida_afinidad",
        "expected": "corregir la identidad elimina afinidad y ficha sensorial heredadas del vino anterior",
        "actual": "PASS",
    })
    context.close()


def run_regional_detection_qa(browser, results, console_errors):
    context = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2)
    page = context.new_page()
    detector_tiles = []

    def regional_handler(endpoint, request):
        payload = request.post_data_json or {}
        if endpoint == "detect-wine-regions":
            tile = payload.get("detection_tile", "full")
            detector_tiles.append(tile)
            if tile == "full":
                return {
                    "coverage": {
                        "status": "partial",
                        "estimated_visible_objects": 70,
                        "confidence": 0.9,
                        "notes": ["Respuesta completa contradictoria de QA."],
                    },
                    "regions": [
                        {"box": {"x": 10, "y": 98, "width": 31, "height": 2}, "confidence": 0.9},
                        {"box": {"x": 98, "y": 98, "width": 2, "height": 2}, "confidence": 0.9},
                    ],
                }
            x = 10 if tile in ("left", "top") else 60
            return {
                "coverage": {
                    "status": "reported_complete",
                    "estimated_visible_objects": 1,
                    "confidence": 0.88,
                    "notes": [],
                },
                "regions": [{
                    "object_type": "bottle",
                    "box": {"x": x, "y": 12, "width": 18, "height": 72},
                    "confidence": 0.86,
                    "quality": {"glare": "low", "occlusion": "low", "legibility": "good"},
                }],
            }
        if endpoint == "analyze-wine-region":
            region_id = payload.get("region_id", "region-1")
            index = int(region_id.rsplit("-", 1)[-1])
            return {"candidates": [candidate(f"Botella regional {index}", f"Bodega regional {index}", 0.86, 82 - index)]}
        return function_response(endpoint, request)

    install_routes(page, console_errors, response_handler=regional_handler)
    page.goto(f"{BASE_URL}/escanear/etiqueta")
    page.wait_for_load_state("networkidle")
    page.locator('input[type="file"]').nth(1).set_input_files(str(LABEL_FIXTURE))
    page.get_by_text("Lote listo para revisar").wait_for(timeout=30_000)
    summary = page.get_by_test_id("scan-performance-summary").inner_text()
    assert detector_tiles == ["full", "left", "right"], detector_tiles
    assert "2 regiones" in summary, summary
    assert "detección refinada por zonas" in summary, summary
    assert page.get_by_role("button", name="Región 1, Reconocido").count() == 1
    assert page.get_by_role("button", name="Región 2, Reconocido").count() == 1
    dimensions = assert_no_horizontal_overflow(page, "regional detection mobile")
    page.screenshot(path=str(ARTIFACTS / "multi-label-regional-detection-mobile.png"), full_page=True)
    results.append({
        "case": "multietiqueta_refinamiento_regional",
        "expected": "respuesta completa invalida dispara full+2 zonas, descarta franjas y conserva dos botellas",
        "actual": f"PASS tiles={detector_tiles} summary={summary} {dimensions}",
    })
    context.close()


def run_regional_detection_fallback_qa(browser, results):
    context = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2)
    page = context.new_page()
    attempts = {}
    expected_console_errors = []

    def fallback_handler(endpoint, request):
        payload = request.post_data_json or {}
        if endpoint == "detect-wine-regions":
            tile = payload.get("detection_tile", "full")
            attempts[tile] = attempts.get(tile, 0) + 1
            if tile == "right":
                return 503, {"error": "Zona derecha no disponible"}, {"sb-error-code": "EDGE_FUNCTION_ERROR"}
            return {
                "coverage": {
                    "status": "partial" if tile == "full" else "reported_complete",
                    "estimated_visible_objects": 2 if tile == "full" else 1,
                    "confidence": 0.8,
                    "notes": [],
                },
                "regions": [{
                    "object_type": "bottle",
                    "box": {"x": 12, "y": 10, "width": 18, "height": 74},
                    "confidence": 0.84,
                    "quality": {"glare": "low", "occlusion": "low", "legibility": "good"},
                }],
            }
        if endpoint == "analyze-wine-region":
            return {"candidates": [candidate("Botella full conservada", "Bodega full", 0.84, 79)]}
        return function_response(endpoint, request)

    install_routes(page, expected_console_errors, response_handler=fallback_handler)
    page.goto(f"{BASE_URL}/escanear/etiqueta")
    page.wait_for_load_state("networkidle")
    page.locator('input[type="file"]').nth(1).set_input_files(str(LABEL_FIXTURE))
    page.get_by_text("Lote listo para revisar").wait_for(timeout=30_000)
    summary = page.get_by_test_id("scan-performance-summary").inner_text()
    assert attempts == {"full": 1, "left": 1, "right": 2}, attempts
    assert "1 regiones" in summary, summary
    assert "detección refinada por zonas" not in summary, summary
    assert page.get_by_text("Botella full conservada", exact=True).count() >= 1
    assert all("Failed to load resource" in message for message in expected_console_errors), expected_console_errors
    results.append({
        "case": "multietiqueta_fallback_regional",
        "expected": "si una zona falla tras retry se conserva la deteccion completa utilizable",
        "actual": f"PASS attempts={attempts} summary={summary}",
    })
    context.close()


def run_provisional_decision_qa(browser, results, console_errors):
    context = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2)
    page = context.new_page()

    def provisional_handler(endpoint, request):
        if endpoint != "analyze-wine-region":
            return function_response(endpoint, request)
        region_id = (request.post_data_json or {}).get("region_id", "region-1")
        index = int(region_id.rsplit("-", 1)[-1])
        return {
            "candidates": [candidate(
                f"Candidato provisional {index}",
                f"Bodega dudosa {index}",
                0.55,
                90 - index,
                uncertainty=["Texto parcial; confirma la identidad"],
            )]
        }

    install_routes(page, console_errors, response_handler=provisional_handler)
    page.goto(f"{BASE_URL}/escanear/etiqueta")
    page.wait_for_load_state("networkidle")
    page.locator('input[type="file"]').nth(1).set_input_files(str(LABEL_FIXTURE))
    page.get_by_text("Lote listo para revisar").wait_for(timeout=30_000)
    comparison = page.locator('section[aria-labelledby="wine-comparison-title"]')
    comparison.get_by_text("Opcion provisional: confirma los datos", exact=True).wait_for()
    assert comparison.get_by_text("Elección para ti", exact=True).count() == 0
    assert comparison.get_by_text("No uses este orden como recomendacion final", exact=False).count() == 1
    dimensions = assert_no_horizontal_overflow(page, "provisional decision mobile")
    page.screenshot(path=str(ARTIFACTS / "multi-label-provisional-decision-mobile.png"), full_page=True)
    results.append({
        "case": "multietiqueta_decision_provisional",
        "expected": "ninguna identidad dudosa se presenta como eleccion final",
        "actual": f"PASS {dimensions}",
    })
    context.close()


def run_retry_policy_qa(browser, results, console_errors):
    context = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2)
    page = context.new_page()
    attempts = {}
    expected_console_errors = []

    def retry_handler(endpoint, request):
        if endpoint == "detect-wine-regions":
            attempts["detector"] = attempts.get("detector", 0) + 1
            if attempts["detector"] == 1:
                return 503, {"error": "Detector transitorio de QA"}, {"sb-error-code": "EDGE_FUNCTION_ERROR"}
            return function_response(endpoint, request)
        if endpoint != "analyze-wine-region":
            return function_response(endpoint, request)
        region_id = (request.post_data_json or {}).get("region_id")
        attempts[region_id] = attempts.get(region_id, 0) + 1
        if region_id == "region-1" and attempts[region_id] == 1:
            return 503, {"error": "Fallo transitorio de QA"}, {"sb-error-code": "EDGE_FUNCTION_ERROR"}
        if region_id == "region-2":
            return 400, {"error": "Recorte no valido"}, {}
        return function_response(endpoint, request)

    install_routes(page, expected_console_errors, response_handler=retry_handler)
    page.goto(f"{BASE_URL}/escanear/etiqueta")
    page.wait_for_load_state("networkidle")
    page.locator('input[type="file"]').nth(1).set_input_files(str(LABEL_FIXTURE))
    page.get_by_text("en paralelo", exact=False).wait_for(timeout=30_000)
    page.get_by_text("Lote listo para revisar").wait_for(timeout=30_000)
    summary = page.get_by_test_id("scan-performance-summary").inner_text()
    assert attempts.get("detector") == 2, attempts
    assert attempts.get("region-1") == 2, attempts
    assert attempts.get("region-2") == 1, attempts
    assert "2 reintentos" in summary, summary
    assert all("Failed to load resource" in message for message in expected_console_errors), expected_console_errors
    assert_no_horizontal_overflow(page, "retry policy mobile")
    page.screenshot(path=str(ARTIFACTS / "multi-label-retry-policy-mobile.png"), full_page=True)
    results.append({
        "case": "multietiqueta_retry_selectivo",
        "expected": "503 de detector/region se reintenta una vez, 400 no se repite y el lote termina",
        "actual": f"PASS attempts={attempts} summary={summary}",
    })
    context.close()


def run_retry_cancellation_qa(browser, results, console_errors):
    context = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2)
    page = context.new_page()
    attempts = {}
    expected_console_errors = []

    def cancellation_handler(endpoint, request):
        if endpoint != "analyze-wine-region":
            return function_response(endpoint, request)
        region_id = (request.post_data_json or {}).get("region_id")
        attempts[region_id] = attempts.get(region_id, 0) + 1
        if region_id == "region-1":
            return 503, {"error": "Espera antes de reintentar"}, {"Retry-After": "10"}
        return function_response(endpoint, request)

    install_routes(page, expected_console_errors, response_handler=cancellation_handler)
    page.goto(f"{BASE_URL}/escanear/etiqueta")
    page.wait_for_load_state("networkidle")
    page.locator('input[type="file"]').nth(1).set_input_files(str(LABEL_FIXTURE))
    page.get_by_text("en paralelo", exact=False).wait_for(timeout=30_000)
    page.get_by_role("button", name="Cancelar").click()
    page.get_by_text("Análisis cancelado", exact=True).wait_for(timeout=5_000)
    page.wait_for_timeout(900)
    assert attempts.get("region-1") == 1, attempts
    assert all("Failed to load resource" in message for message in expected_console_errors), expected_console_errors
    results.append({
        "case": "multietiqueta_cancelacion_backoff",
        "expected": "cancelar durante Retry-After evita una segunda llamada",
        "actual": f"PASS attempts={attempts}",
    })
    context.close()


def run_menu_qa(browser, results, console_errors):
    context = browser.new_context(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    page = context.new_page()
    install_routes(page, console_errors)
    page.goto(f"{BASE_URL}/escanear/carta-vinos")
    page.wait_for_load_state("networkidle")
    page.locator('input[type="file"]').nth(0).set_input_files(str(MENU_FIXTURES[0]))
    page.get_by_text("Lista de la carta", exact=True).wait_for(timeout=30_000)
    assert page.get_by_role("button", name="Vino 1: Finca Dofi", exact=True).count() == 1
    overlay_text = page.locator('button[aria-label^="Vino "]').all_inner_texts()
    if any(not text.strip().isdigit() for text in overlay_text):
        raise AssertionError(f"Overlay contains non-numeric labels: {overlay_text}")
    assert page.get_by_text("5 resultados", exact=True).count() == 1
    assert page.get_by_role("button", name="Grupo de 2 vinos", exact=False).count() == 1
    page.locator('button[aria-label^="Ver detalle de Finca Dofi,"]').first.click()
    decision_drawer = page.get_by_role("dialog")
    decision_drawer.get_by_text("1. Finca Dofi", exact=True).wait_for()
    decision_drawer.get_by_role("button", name="Cerrar detalle").click()
    comparison = page.locator('section[aria-labelledby="wine-comparison-title"]')
    comparison.get_by_text("Comparar 2–5 vinos", exact=True).wait_for()
    comparison.get_by_label("Presupuesto máximo").fill("40")
    assert comparison.get_by_text("Pazo de Senorans", exact=True).count() >= 1
    comparison.get_by_role("button", name="Servicio").click()
    service_select = comparison.get_by_label("Formato")
    service_select.click()
    page.get_by_role("option", name="Por copa").click(force=True)
    selected_service = service_select.inner_text().strip()
    if selected_service != "Por copa":
        raise AssertionError(f"Formato esperado Por copa, actual: {selected_service}")
    assert comparison.get_by_text("Elección para servir", exact=True).count() == 1
    comparison.get_by_label("Comparar Louro do Bolo").click()
    comparison.get_by_label("Comparar Entrada dudosa").click()
    assert comparison.get_by_text("5/5 seleccionados", exact=True).count() == 1
    comparison.get_by_label("Comparar Finca Dofi").click()
    comparison.get_by_label("Comparar Pazo de Senorans").click()
    comparison.get_by_label("Comparar La Montesa").click()
    assert comparison.get_by_text("2/5 seleccionados", exact=True).count() == 1
    results.append({"case": "carta_vista_dual", "expected": "imagen con pines numericos y lista sincronizada sin texto superpuesto", "actual": "PASS"})
    results.append({"case": "carta_comparacion_servicio", "expected": "comparación completa de 2 a 5 con presupuesto y formato por copa verificables", "actual": "PASS"})
    results.append({"case": "carta_overflow_escritorio", "expected": "sin desbordamiento horizontal a 1440x1000", "actual": f"PASS {assert_no_horizontal_overflow(page, 'menu desktop')}"})
    page.screenshot(path=str(ARTIFACTS / "wine-menu-dual-desktop.png"), full_page=True)

    page.get_by_label("Acercar carta").click()
    assert page.get_by_text("150%", exact=True).count() == 1
    page.locator("#scan-max-price").fill("40")
    assert page.get_by_text("4 resultados", exact=True).count() == 1
    page.get_by_role("button", name="Abrir vino 2: Pazo de Senorans").click()
    detail_drawer = page.get_by_role("dialog")
    detail_drawer.get_by_text("Afinidad estimada", exact=True).wait_for()
    menu_guide = detail_drawer.get_by_test_id("airim-context-guide")
    menu_guide.get_by_text("Por que puede encajar", exact=True).wait_for()
    assert detail_drawer.get_by_text("≈79%", exact=True).count() >= 1
    assert detail_drawer.get_by_text("Por qué encaja", exact=True).count() >= 1
    results.append({"case": "carta_interaccion", "expected": "zoom, filtro por precio y drawer detallado", "actual": "PASS"})
    menu_guide.scroll_into_view_if_needed()
    page.screenshot(path=str(ARTIFACTS / "wine-menu-airim-guide-desktop.png"), full_page=False)
    page.screenshot(path=str(ARTIFACTS / "wine-menu-detail-desktop.png"), full_page=False)
    detail_drawer.get_by_role("button", name="Cerrar detalle").click()
    page.get_by_text("Ver fichas completas y acciones", exact=True).click()
    visible_full_cards = page.get_by_text("Ficha de carta", exact=True).evaluate_all(
        "elements => elements.filter((element) => element.getClientRects().length > 0).length"
    )
    assert visible_full_cards == 0, visible_full_cards
    page.locator('button[aria-controls^="wine-actions-"]').first.click()
    visible_full_cards = page.get_by_text("Ficha de carta", exact=True).evaluate_all(
        "elements => elements.filter((element) => element.getClientRects().length > 0).length"
    )
    assert visible_full_cards == 1, visible_full_cards
    results.append({
        "case": "carta_fichas_progresivas",
        "expected": "la accion global no expande todas las fichas; cada vino se abre de forma independiente",
        "actual": "PASS una ficha visible tras abrirla expresamente",
    })
    context.close()


def run_menu_fixture_matrix(browser, results, console_errors):
    viewports = [
        {"width": 430, "height": 932},
        {"width": 932, "height": 430},
        {"width": 430, "height": 932},
    ]
    for fixture, viewport in zip(MENU_FIXTURES[1:], viewports):
        context = browser.new_context(viewport=viewport, device_scale_factor=1)
        page = context.new_page()
        install_routes(page, console_errors)
        page.goto(f"{BASE_URL}/escanear/carta-vinos")
        page.wait_for_load_state("networkidle")
        page.locator('input[type="file"]').nth(0).set_input_files(str(fixture))
        page.get_by_text("Lista de la carta", exact=True).wait_for(timeout=30_000)
        dimensions = assert_no_horizontal_overflow(page, f"menu {fixture.stem}")
        results.append({
            "case": f"fixture_{fixture.stem}",
            "expected": f"decodifica, normaliza y presenta resultados a {viewport['width']}x{viewport['height']}",
            "actual": f"PASS {dimensions}",
        })
        page.screenshot(path=str(ARTIFACTS / f"{fixture.stem}-menu-{viewport['width']}x{viewport['height']}.png"), full_page=True)
        context.close()


def run_accessibility_qa(browser, results, console_errors):
    context = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2)
    page = context.new_page()
    install_routes(page, console_errors)
    page.goto(f"{BASE_URL}/escanear/carta-vinos")
    page.wait_for_load_state("networkidle")
    page.add_style_tag(content="html { font-size: 20px !important; }")
    page.locator('input[type="file"]').nth(0).set_input_files(str(MENU_FIXTURES[0]))
    page.get_by_text("Lista de la carta", exact=True).wait_for(timeout=30_000)

    critical_targets = [
        page.get_by_role("button", name="Vino 1: Finca Dofi", exact=True),
        page.get_by_role("button", name="Alejar carta"),
        page.get_by_role("button", name="Acercar carta"),
        page.get_by_role("button", name="Quitar carta"),
    ]
    target_sizes = []
    for target in critical_targets:
        box = target.bounding_box()
        if box is None or box["width"] < 44 or box["height"] < 44:
            raise AssertionError(f"touch target below 44px: {box}")
        target_sizes.append({"width": round(box["width"]), "height": round(box["height"])})

    unnamed_buttons = page.locator("button").evaluate_all("""elements => elements
      .filter((element) => !(
        (element.getAttribute('aria-label') || '').trim()
        || (element.getAttribute('title') || '').trim()
        || (element.textContent || '').trim()
      ))
      .map((element) => element.outerHTML.slice(0, 240))""")
    if unnamed_buttons:
        raise AssertionError(f"buttons without an accessible name: {unnamed_buttons}")

    page.get_by_role("button", name="Abrir vino 1: Finca Dofi").click()
    detail = page.get_by_role("dialog")
    detail.get_by_text("Afinidad estimada", exact=True).wait_for()
    assert detail.get_by_role("button", name="Cerrar detalle").count() == 1
    dimensions = assert_no_horizontal_overflow(page, "menu dynamic type 125%")
    page.screenshot(path=str(ARTIFACTS / "wine-menu-accessibility-125pct-mobile.png"), full_page=False)
    results.append({
        "case": "carta_touch_targets",
        "expected": "pins, zoom y cierre con zonas tactiles de al menos 44x44 px",
        "actual": f"PASS {target_sizes}",
    })
    results.append({
        "case": "carta_voiceover_basico",
        "expected": "botones con nombre accesible, dialogo identificado y cierre nombrado",
        "actual": "PASS",
    })
    results.append({
        "case": "carta_dynamic_type_125",
        "expected": "texto al 125% sin desbordamiento horizontal ni controles inaccesibles",
        "actual": f"PASS {dimensions}",
    })
    context.close()


def run_offline_qa(browser, results):
    context = browser.new_context(viewport={"width": 430, "height": 932}, device_scale_factor=1)
    page = context.new_page()
    install_routes(page, [])
    page.goto(f"{BASE_URL}/escanear/etiqueta")
    page.wait_for_load_state("networkidle")
    page.unroute("**/functions/v1/**")
    context.set_offline(True)
    page.locator('input[type="file"]').nth(1).set_input_files(str(LABEL_FIXTURE))
    page.get_by_text("No hay conexión", exact=False).wait_for(timeout=30_000)
    assert page.get_by_role("button", name="Reintentar").count() == 1
    assert page.get_by_alt_text("Foto analizada con regiones numeradas").count() == 1
    results.append({
        "case": "multietiqueta_sin_red",
        "expected": "mensaje accionable, foto conservada y reintento disponible",
        "actual": "PASS",
    })
    page.screenshot(path=str(ARTIFACTS / "multi-label-offline-mobile.png"), full_page=True)
    context.close()


def main():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    materialize_fixtures()
    for fixture in (LABEL_FIXTURE, *MENU_FIXTURES):
        if not fixture.exists():
            raise FileNotFoundError(fixture)

    results = []
    console_errors = []
    with sync_playwright() as playwright:
        launch_options = {"headless": True}
        if CHROME:
            launch_options["executable_path"] = CHROME
        browser = playwright.chromium.launch(**launch_options)
        run_privacy_safe_area_qa(browser, results, console_errors)
        run_privacy_landscape_qa(browser, results, console_errors)
        run_label_qa(browser, results, console_errors)
        run_identity_correction_qa(browser, results, console_errors)
        run_regional_detection_qa(browser, results, console_errors)
        run_regional_detection_fallback_qa(browser, results)
        run_provisional_decision_qa(browser, results, console_errors)
        run_retry_policy_qa(browser, results, console_errors)
        run_retry_cancellation_qa(browser, results, console_errors)
        run_menu_qa(browser, results, console_errors)
        run_menu_fixture_matrix(browser, results, console_errors)
        run_accessibility_qa(browser, results, console_errors)
        if EMBEDDED_FIXTURES:
            results.append({
                "case": "frontera_qa_embebida",
                "expected": "flujo completo sin llamadas a Edge Functions",
                "actual": "PASS",
            })
        else:
            run_offline_qa(browser, results)
        browser.close()

    ignored = [message for message in console_errors if "favicon" not in message.lower()]
    if ignored:
        results.append({"case": "consola", "expected": "sin errores de consola", "actual": f"FAIL: {ignored}"})
        (ARTIFACTS / "ui-qa-results.json").write_text(json.dumps(results, indent=2, ensure_ascii=True) + "\n")
        raise AssertionError(f"Console errors: {ignored}")

    results.append({"case": "consola", "expected": "sin errores de consola", "actual": "PASS"})
    (ARTIFACTS / "ui-qa-results.json").write_text(json.dumps(results, indent=2, ensure_ascii=True) + "\n")
    print(json.dumps(results, indent=2, ensure_ascii=True))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"QA FAILED: {error}", file=sys.stderr)
        raise
