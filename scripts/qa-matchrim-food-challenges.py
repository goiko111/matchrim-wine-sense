"""Adversarial food flows with public images and isolated backend fixtures."""
import copy
import importlib.util
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("scanner_qa", ROOT / "scripts/qa-multi-wine-ui.py")
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
OUT = Path(os.environ["MATCHRIM_FOOD_QA_OUTPUT"])
SOURCES = Path(os.environ["MATCHRIM_CHALLENGE_SOURCES"])
OUT.mkdir(parents=True, exist_ok=True)
MENU = SOURCES / "commons-171025734.jpg"
DISH = SOURCES / "commons-148028485.jpg"
BASE = {
    "mode": "menu", "summary": "Escenario funcional controlado; no es reconocimiento real.",
    "has_profile": True, "dishes": [{"nombre": "Dorada a la plancha", "categoria": "Pescado",
        "match": 82, "razon": "Plato delicado con intensidad media.", "recomendaciones": [
            {"nombre": "Blanco fresco", "tipo": "blanco", "uvas": ["Albarino"], "match": 84,
             "razon": "Acidez para equilibrar la grasa; estilo orientativo, no botella disponible."}]}],
}
CASES = [
    ("menu-flow", "success"), ("dish-flow", "success"),
    ("empty-menu", "empty"), ("malformed-response", "malformed"),
    ("null-profile", "profile"), ("score-range", "score"),
    ("invalid-image", "invalid"), ("anonymous-save", "save"),
    ("airim-context", "airim"),
    ("partial-sensory", "partial"),
]


def run_case(browser, name, kind):
    context = browser.new_context(viewport={"width": 393, "height": 852}, is_mobile=True, has_touch=True)
    page = context.new_page()
    errors, requests = [], []
    data = copy.deepcopy(BASE)
    if name == "dish-flow":
        data["mode"] = "dish"
    if kind == "partial":
        data["dishes"][0]["recomendaciones"][0]["atributos"] = {
            "potencia": 3, "acidez": None, "dulzura": None, "taninos": None, "afrutado": None,
        }
    if kind == "empty":
        data["dishes"] = []
    if kind == "malformed":
        data = {"summary": "Incomplete provider response"}
    if kind == "score":
        data["dishes"][0]["match"] = 140
        data["dishes"][0]["recomendaciones"][0]["match"] = -8

    def response(endpoint, request):
        if endpoint == "scan-food-pairing":
            payload = request.post_data_json
            requests.append({"mode": payload.get("mode"), "profile": payload.get("matchrimProfile"),
                             "image_bytes_estimate": len(payload.get("image", "")) * 3 // 4})
            return data
        return qa.function_response(endpoint, request)

    qa.install_routes(page, errors, response_handler=response)
    page.on("pageerror", lambda error: errors.append(str(error)))
    if kind == "profile":
        context.add_init_script("localStorage.setItem('matchrim_quiz_result', JSON.stringify({potente:null,acidez:null,dulce:null,tanico:null,afrutado:null}));")
    result = {"case": name, "evidence_class": "controlled_backend_functional", "status": "FAIL"}
    try:
        mode = "plato" if name == "dish-flow" else "menu-comida"
        page.goto(f"{qa.BASE_URL}/escanear/{mode}", wait_until="networkidle")
        upload = page.locator('input[type="file"]').first
        if kind == "invalid":
            upload.set_input_files({"name": "invalid.jpg", "mimeType": "image/jpeg", "buffer": b"not-an-image"})
        else:
            upload.set_input_files(str(DISH if name == "dish-flow" else MENU))
        page.wait_for_timeout(800)
        text = page.locator("body").inner_text()
        if kind == "invalid":
            assert not requests, "Corrupt image reached scan-food-pairing; bytes were not decoded/validated"
            assert page.get_by_role("alert").count() > 0, "Invalid image has no visible recovery state"
        elif kind == "profile":
            assert requests and requests[0]["profile"] is None, "Missing dimensions became a valid 1/5 profile: " + str(requests)
        elif kind == "malformed":
            assert not errors, "Malformed response crashed the view: " + str(errors)
            page.get_by_role("alert").filter(has_text="respuesta del analisis").wait_for()
            page.get_by_role("button", name="Elegir otra imagen", exact=True).click()
            assert page.get_by_role("button", name="Subir archivo", exact=True).is_visible(), "No recovery action"
        elif kind == "score":
            alert = page.get_by_role("alert").filter(has_text="respuesta del analisis")
            alert.wait_for()
            box = alert.bounding_box()
            assert box and box["y"] >= 0 and box["y"] + box["height"] < 760, "Recovery is hidden behind the mobile navigation"
            assert alert.get_by_role("button", name="Seleccionar otra foto").is_visible()
            assert "140%" not in text and "-8%" not in text, "Invalid provider percentages are displayed without validation"
        elif kind == "empty":
            assert page.get_by_text("Idea de vino", exact=True).count() == 0, "Negative menu invented recommendations"
            assert not errors, str(errors)
        else:
            page.get_by_text("Idea de vino", exact=True).wait_for()
            assert "Esto todav" in text and "botella concreta" in text
            assert not errors, str(errors)
            page.screenshot(path=str(OUT / f"{name}-result.png"), full_page=True)
            if kind == "save":
                page.get_by_role("button", name="Guardar en Quiero Probar", exact=True).click()
                page.wait_for_url("**/auth**")
            elif kind == "airim":
                page.get_by_role("button", name="Preguntar a aiRIM", exact=True).click()
                page.wait_for_url("**/inteligencia-liquida?**")
                assert "dish=Dorada" in page.url and "wine=Blanco" in page.url
            else:
                assert requests[0]["mode"] == ("dish" if name == "dish-flow" else "menu")
                page.get_by_role("button", name="Encontrar botella real en la carta", exact=True).click()
                page.wait_for_url("**/escanear/carta-vinos?dish=**")
                assert "Dorada" in page.url
        qa.assert_no_horizontal_overflow(page, name)
        result["status"] = "PASS"
    except Exception as error:
        result["actual"] = str(error)
    finally:
        result["requests"] = requests
        result["console_and_page_errors"] = errors
        page.screenshot(path=str(OUT / f"{name}.png"), full_page=False)
        context.close()
    return result


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=qa.CHROME)
    results = []
    try:
        for name, kind in CASES:
            result = run_case(browser, name, kind)
            results.append(result)
            print(name, result["status"], result.get("actual", ""), flush=True)
            (OUT / "results.json").write_text(json.dumps({"scope": "No real recognition or remote calls; adversarial functional QA", "results": results}, indent=2))
    finally:
        browser.close()
raise SystemExit(0 if all(result["status"] == "PASS" for result in results) else 1)
