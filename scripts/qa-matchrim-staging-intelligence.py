import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path


PROJECT_REF = os.environ.get("MATCHRIM_QA_PROJECT_REF", "")
SUPABASE_URL = os.environ.get("MATCHRIM_QA_SUPABASE_URL", "").rstrip("/")
PUBLISHABLE_KEY = os.environ.get("MATCHRIM_QA_PUBLISHABLE_KEY", "")
OUTPUT = Path(os.environ.get(
    "MATCHRIM_QA_INTELLIGENCE_OUTPUT",
    "/private/tmp/matchrim-100-account-pilot/intelligence/results.json",
))
EXPECTED_REF = "qpbmqvfnunkylvtvnyyx"

if PROJECT_REF != EXPECTED_REF or PROJECT_REF not in SUPABASE_URL:
    raise RuntimeError(f"Refusing intelligence QA outside isolated staging {EXPECTED_REF}")
if not PUBLISHABLE_KEY:
    raise RuntimeError("MATCHRIM_QA_PUBLISHABLE_KEY is required")


PROFILES = [
    ("principiante-frutal", {"power": 2, "acidity": 3, "sweetness": 2, "tannin": 1, "fruity": 5}),
    ("clasico-estructurado", {"power": 5, "acidity": 3, "sweetness": 1, "tannin": 5, "fruity": 3}),
    ("atlantico-fresco", {"power": 2, "acidity": 5, "sweetness": 1, "tannin": 1, "fruity": 4}),
    ("dulce-aromatico", {"power": 2, "acidity": 3, "sweetness": 5, "tannin": 1, "fruity": 5}),
    ("explorador", {"power": 4, "acidity": 4, "sweetness": 1, "tannin": 3, "fruity": 4}),
    ("precio-consciente", {"power": 3, "acidity": 3, "sweetness": 2, "tannin": 2, "fruity": 4}),
    ("coleccionista", {"power": 5, "acidity": 4, "sweetness": 1, "tannin": 5, "fruity": 2}),
    ("sumiller-servicio", {"power": 4, "acidity": 4, "sweetness": 1, "tannin": 4, "fruity": 3}),
    ("baja-vision", {"power": 3, "acidity": 2, "sweetness": 2, "tannin": 2, "fruity": 4}),
    ("restriccion-alimentaria", {"power": 2, "acidity": 4, "sweetness": 1, "tannin": 2, "fruity": 4}),
]


def fetch_recommendations(profile):
    query = urllib.parse.urlencode(profile)
    request = urllib.request.Request(
        f"{SUPABASE_URL}/functions/v1/matchrim-recommendations?{query}",
        headers={
            "apikey": PUBLISHABLE_KEY,
            "Authorization": f"Bearer {PUBLISHABLE_KEY}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        if response.status != 200:
            raise AssertionError(f"recommendations returned HTTP {response.status}")
        return json.load(response)


def flatten_wines(payload):
    wines = payload.get("wines") or {}
    if isinstance(wines, list):
        return wines
    return [*(wines.get("home") or []), *(wines.get("detail") or [])]


def sensory_distance(profile, wine):
    attributes = wine.get("tastingAttributes") or {}
    values = [attributes.get(axis) for axis in profile]
    if any(not isinstance(value, (int, float)) for value in values):
        return None
    return sum(abs(float(attributes[axis]) - target) for axis, target in profile.items()) / len(profile)


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    results = []
    failures = []
    signatures = set()

    for name, profile in PROFILES:
        try:
            payload = fetch_recommendations(profile)
            wines = flatten_wines(payload)
            unique_wines = []
            seen_ids = set()
            for wine in wines:
                wine_id = str(wine.get("id"))
                if not wine_id or wine_id in seen_ids:
                    continue
                seen_ids.add(wine_id)
                unique_wines.append(wine)

            if len(unique_wines) < 10:
                raise AssertionError(f"only {len(unique_wines)} unique recommendations")
            top = unique_wines[:10]
            scores = [wine.get("matchPercentage") for wine in top]
            if any(not isinstance(score, (int, float)) or not 0 <= score <= 100 for score in scores):
                raise AssertionError(f"invalid top scores: {scores}")
            if scores != sorted(scores, reverse=True):
                raise AssertionError(f"top scores are not descending: {scores}")

            distances = [sensory_distance(profile, wine) for wine in top]
            grounded_distances = [distance for distance in distances if distance is not None]
            if len(grounded_distances) < 8:
                raise AssertionError(f"only {len(grounded_distances)} of 10 top wines expose sensory attributes")
            mean_distance = sum(grounded_distances) / len(grounded_distances)
            if mean_distance > 0.8:
                raise AssertionError(f"top-10 mean sensory distance is {mean_distance:.3f}")

            signature = tuple(str(wine.get("id")) for wine in top[:5])
            signatures.add(signature)
            result = {
                "profile": name,
                "input": profile,
                "recommendation_count": len(unique_wines),
                "top_5_ids": list(signature),
                "top_5_names": [wine.get("name") for wine in top[:5]],
                "top_10_score_mean": round(sum(scores) / len(scores), 2),
                "top_10_sensory_distance_mean": round(mean_distance, 3),
                "sensory_grounded_top_10": len(grounded_distances),
                "status": "PASS",
            }
            results.append(result)
            print(f"PASS {name}: wines={len(unique_wines)} mean_distance={mean_distance:.3f}", flush=True)
        except Exception as error:
            failures.append({"profile": name, "error": str(error)})
            print(f"FAIL {name}: {error}", flush=True)

    if len(signatures) < 8:
        failures.append({
            "profile": "cohort-diversity",
            "error": f"Only {len(signatures)} distinct top-5 rankings for 10 materially different profiles",
        })

    report = {
        "project_ref": PROJECT_REF,
        "synthetic": True,
        "production_touched": False,
        "profiles": len(PROFILES),
        "accounts_represented": 100,
        "distinct_top_5_rankings": len(signatures),
        "passed": len(results),
        "failed": len(failures),
        "all_passed": not failures,
        "results": results,
        "failures": failures,
    }
    OUTPUT.write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n")
    print(json.dumps({key: value for key, value in report.items() if key != "results"}, indent=2))
    if failures:
        sys.exit(2)


if __name__ == "__main__":
    main()
