import json
import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import Route, sync_playwright


BASE_URL = os.environ.get("MATCHRIM_QA_URL", "http://127.0.0.1:4173")
EMBEDDED_FIXTURES = os.environ.get("MATCHRIM_QA_EMBEDDED_FIXTURES") == "true"
ARTIFACTS = Path(os.environ.get(
    "MATCHRIM_QA_ARTIFACTS",
    "/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-p0-remediation",
))
LABEL_FIXTURE = Path("/Users/GOIKO/Downloads/IMG_7605 2.jpg")
MENU_SOURCE_FIXTURES = [
    Path("/Users/GOIKO/Downloads/IMG_7547 2.HEIC"),
    Path("/Users/GOIKO/Downloads/IMG_7548 2.HEIC"),
    Path("/Users/GOIKO/Downloads/IMG_7552 2.HEIC"),
    Path("/Users/GOIKO/Downloads/IMG_7553 2.HEIC"),
]
MENU_FIXTURES = [ARTIFACTS / "fixtures" / f"{source.stem}.jpg" for source in MENU_SOURCE_FIXTURES]
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


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
                    candidate("Pazo de Senorans", "Pazo de Senorans", 0.86, 83, vintage=2023),
                ]
            }
        if region_id == "region-5":
            return {"candidates": []}
        return {"candidates": [candidate("Muga Reserva", "Bodegas Muga", 0.91, 88)]}
    if endpoint == "search-wines":
        return {"wines": []}
    if endpoint == "scan-wine-menu":
        return {
            "has_profile": True,
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
                    "posicion": {"x": 52, "y": 36, "width": 38, "height": 5, "confidence": 0.86},
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


def install_routes(page, console_errors, *, accept_privacy=True):
    def handle_function(route: Route):
        endpoint = urlparse(route.request.url).path.rstrip("/").split("/")[-1]
        route.fulfill(
            status=200,
            content_type="application/json",
            headers={"Access-Control-Allow-Origin": "*"},
            body=json.dumps(function_response(endpoint, route.request)),
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
    button_box = continue_button.bounding_box()
    nav_box = page.get_by_role("navigation", name="Navegacion principal").bounding_box()
    if button_box["y"] + button_box["height"] > nav_box["y"]:
        raise AssertionError(f"privacy CTA overlaps bottom navigation: button={button_box}, nav={nav_box}")
    page.screenshot(path=str(ARTIFACTS / "privacy-safe-area-mobile.png"), full_page=True)
    continue_button.click()
    page.locator('input[type="file"]').first.wait_for(state="attached")
    dimensions = assert_no_horizontal_overflow(page, "privacy gate mobile")
    results.append({
        "case": "privacidad_y_safe_area",
        "expected": "sin acceso a fotos antes del consentimiento y contenido por debajo de 59 px de safe area",
        "actual": f"PASS gate_y={gate_top:.1f} cta_bottom={button_box['y'] + button_box['height']:.1f} nav_top={nav_box['y']:.1f} {dimensions}",
    })
    context.close()


def run_label_qa(browser, results, console_errors):
    context = browser.new_context(viewport={"width": 430, "height": 932}, device_scale_factor=2)
    page = context.new_page()
    install_routes(page, console_errors)
    page.goto(f"{BASE_URL}/escanear/etiqueta")
    page.wait_for_load_state("networkidle")
    page.locator('input[type="file"]').nth(1).set_input_files(str(LABEL_FIXTURE))
    page.get_by_text("Lote listo para revisar").wait_for(timeout=30_000)
    page.get_by_role("button", name="Region 5, Sin reconocer").wait_for()
    assert page.get_by_text("Muga Reserva", exact=True).count() >= 1
    assert page.get_by_text("Marques de Riscal Reserva", exact=True).count() >= 1
    assert page.get_by_text("Pazo de Senorans", exact=True).count() >= 1
    assert page.get_by_text("2 botellas", exact=False).count() >= 1
    assert page.get_by_role("button", name="Confirmar 3 referencias").count() == 1
    comparison = page.locator('section[aria-labelledby="wine-comparison-title"]')
    comparison.get_by_text("Comparar 2–5 vinos", exact=True).wait_for()
    selected_count = comparison.locator("span", has_text="/5 seleccionados").first.inner_text()
    assert selected_count == "3/5 seleccionados", selected_count
    assert comparison.get_by_text("Elección para ti", exact=True).count() == 1
    comparison.get_by_role("button", name="Servicio").click()
    assert comparison.get_by_text("Elección para servir", exact=True).count() == 1
    results.append({"case": "multietiqueta_resumen", "expected": "5 regiones, 3 referencias, duplicado agrupado, duda y objeto sin reconocer", "actual": "PASS"})
    results.append({"case": "multietiqueta_comparacion", "expected": "compara referencias y cambia entre decisión personal y servicio sin inventar un score", "actual": "PASS"})
    results.append({"case": "multietiqueta_overflow_movil", "expected": "sin desbordamiento horizontal a 430x932", "actual": f"PASS {assert_no_horizontal_overflow(page, 'label mobile')}"})
    page.screenshot(path=str(ARTIFACTS / "multi-label-summary-mobile.png"), full_page=True)

    page.get_by_role("button", name="Region 2, Dudoso").click()
    page.get_by_text("Candidatos", exact=True).wait_for()
    assert page.get_by_text("Duda:").count() >= 1
    assert page.get_by_text("Por que encaja", exact=True).count() >= 1
    assert page.get_by_text("Lo que podria no encajar", exact=True).count() >= 1
    assert page.get_by_text("Datos y limites del calculo", exact=True).count() >= 1
    results.append({"case": "multietiqueta_detalle", "expected": "top candidatos, evidencia, duda y afinidad explicada en drawer", "actual": "PASS"})
    page.screenshot(path=str(ARTIFACTS / "multi-label-detail-mobile.png"), full_page=False)
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
    assert detail_drawer.get_by_text("≈79%", exact=True).count() >= 1
    assert detail_drawer.get_by_text("Por que encaja", exact=True).count() >= 1
    results.append({"case": "carta_interaccion", "expected": "zoom, filtro por precio y drawer detallado", "actual": "PASS"})
    page.screenshot(path=str(ARTIFACTS / "wine-menu-detail-desktop.png"), full_page=False)
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


def run_offline_qa(browser, results):
    context = browser.new_context(viewport={"width": 430, "height": 932}, device_scale_factor=1)
    page = context.new_page()
    install_routes(page, [])
    page.goto(f"{BASE_URL}/escanear/etiqueta")
    page.wait_for_load_state("networkidle")
    page.unroute("**/functions/v1/**")
    context.set_offline(True)
    page.locator('input[type="file"]').nth(1).set_input_files(str(LABEL_FIXTURE))
    page.get_by_text("No hay conexion", exact=False).wait_for(timeout=30_000)
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
        browser = playwright.chromium.launch(headless=True, executable_path=CHROME)
        run_privacy_safe_area_qa(browser, results, console_errors)
        run_label_qa(browser, results, console_errors)
        run_menu_qa(browser, results, console_errors)
        run_menu_fixture_matrix(browser, results, console_errors)
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
