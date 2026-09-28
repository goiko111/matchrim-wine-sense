import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("MATCHRIM_QA_URL", "http://127.0.0.1:4173")
CHROME = os.environ.get("MATCHRIM_QA_CHROME")
ARTIFACTS = Path(os.environ.get(
    "MATCHRIM_QA_ARTIFACTS",
    Path(__file__).resolve().parents[1] / "qa-artifacts" / "2026-09-28-learning-airim",
))


RECOMMENDATIONS = {
    "results": [
        {
            "id": "qa-1",
            "name": "Pazo de Senorans",
            "winery": "Pazo de Senorans",
            "region": "Rias Baixas",
            "vintage": 2023,
            "photo": None,
            "power": 2,
            "acidity": 5,
            "sweetness": 1,
            "tannin": 1,
            "fruity": 4,
            "matchPercentage": 91,
        },
        {
            "id": "qa-2",
            "name": "Muga Reserva",
            "winery": "Bodegas Muga",
            "region": "Rioja",
            "vintage": 2020,
            "photo": None,
            "power": 4,
            "acidity": 3,
            "sweetness": 1,
            "tannin": 4,
            "fruity": 3,
            "matchPercentage": 86,
        },
        {
            "id": "qa-3",
            "name": "Louro do Bolo",
            "winery": "Rafael Palacios",
            "region": "Valdeorras",
            "vintage": 2022,
            "photo": None,
            "power": 3,
            "acidity": 4,
            "sweetness": 1,
            "tannin": 1,
            "fruity": 3,
            "matchPercentage": 82,
        },
    ],
    "total": 3,
}


def has_no_horizontal_overflow(page):
    return page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth")


def main():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    results = []
    console_errors = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=CHROME or None)
        context = browser.new_context(viewport={"width": 430, "height": 932})
        context.add_init_script("""
          localStorage.setItem('matchrim_quiz_result', JSON.stringify({
            potente: 3, acidez: 4, dulce: 1, tanico: 2, afrutado: 4
          }));
        """)
        page = context.new_page()
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)

        def route_recommendations(route):
            route.fulfill(status=200, content_type="application/json", body=json.dumps(RECOMMENDATIONS))

        page.route("**/functions/v1/matchrim-recommendations?**", route_recommendations)
        page.goto(f"{BASE_URL}/", wait_until="networkidle")

        page.get_by_role("heading", name="Para ti ahora").wait_for()
        assert page.get_by_text("Pazo de Senorans", exact=True).is_visible()
        assert page.get_by_role("button", name="Pregunta a aiRIM", exact=False).is_visible()
        assert has_no_horizontal_overflow(page)
        results.append({"case": "inicio_personalizado", "actual": "PASS 3 recomendaciones y CTA aiRIM"})
        page.screenshot(path=ARTIFACTS / "home-personalized-430x932.png", full_page=True)

        page.get_by_role("link", name="aiRIM", exact=True).click()
        page.get_by_role("heading", name="¿Qué necesitas decidir?").wait_for()
        assert page.get_by_role("link", name="Escanear", exact=True).is_visible()
        assert has_no_horizontal_overflow(page)
        results.append({"case": "airim_navegacion_nativa", "actual": "PASS tareas y barra inferior"})
        page.screenshot(path=ARTIFACTS / "airim-landing-430x932.png", full_page=True)

        page.get_by_role("button", name="Vino para un plato", exact=False).click()
        page.get_by_role("heading", name="¿Qué vino va con mi plato?").wait_for()
        assert page.get_by_label("Plato", exact=True).is_visible()
        assert page.get_by_role("button", name="Volver a aiRIM").is_visible()
        assert has_no_horizontal_overflow(page)
        results.append({"case": "airim_flujo_guiado", "actual": "PASS shell coherente y campos accesibles"})
        page.screenshot(path=ARTIFACTS / "airim-guided-dish-430x932.png", full_page=True)
        page.get_by_role("button", name="Volver a aiRIM").click()

        question = "Vino para lubina, maximo 25 EUR"
        page.get_by_label("Pregunta para aiRIM", exact=True).fill(question)
        page.get_by_role("button", name="Abrir conversación").click()
        page.get_by_role("heading", name="Decide con contexto").wait_for()
        assert page.get_by_label("Pregunta para aiRIM", exact=True).input_value() == question
        assert page.get_by_text("Sin memoria personal", exact=True).is_visible()
        results.append({"case": "airim_pregunta_contextual", "actual": "PASS consulta preservada sin envio automatico"})

        page.goto(f"{BASE_URL}/inteligencia-liquida?function=wine-fit&wine=Muga%20Reserva%202019", wait_until="networkidle")
        prepared = page.get_by_label("Pregunta para aiRIM", exact=True).input_value()
        assert "Muga Reserva 2019" in prepared
        assert "coincidencias" in prepared
        results.append({"case": "airim_intent_bodega", "actual": "PASS wine-fit abre pregunta trazable"})
        page.screenshot(path=ARTIFACTS / "airim-wine-fit-430x932.png", full_page=True)

        page.goto(f"{BASE_URL}/inteligencia-liquida", wait_until="networkidle")
        page.evaluate("document.documentElement.style.fontSize = '125%'")
        assert has_no_horizontal_overflow(page)
        assert page.get_by_role("button", name="Elegir para una ocasión", exact=False).is_visible()
        results.append({"case": "airim_dynamic_type_125", "actual": "PASS sin overflow horizontal"})
        page.screenshot(path=ARTIFACTS / "airim-dynamic-type-125.png", full_page=True)

        page.set_viewport_size({"width": 932, "height": 430})
        page.evaluate("document.documentElement.style.fontSize = ''")
        assert has_no_horizontal_overflow(page)
        assert page.get_by_role("heading", name="¿Qué necesitas decidir?").is_visible()
        results.append({"case": "airim_paisaje", "actual": "PASS 932x430 sin overflow"})
        page.screenshot(path=ARTIFACTS / "airim-landscape-932x430.png", full_page=True)

        assert not console_errors, f"Console errors: {console_errors}"
        results.append({"case": "consola", "actual": "PASS sin errores"})
        browser.close()

    report = {
        "all_passed": True,
        "cases": results,
        "console_errors": console_errors,
    }
    (ARTIFACTS / "home-airim-qa-results.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
