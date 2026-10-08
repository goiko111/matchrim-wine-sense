"""Discover/download additive public QA sources; never contact Matchrim or vision."""
import argparse
import hashlib
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "Matchrim-QA/1.0 (public image evaluation; no training)"}
ALLOWED_LICENSES = {"CC0", "Public domain", "CC BY 2.0", "CC BY 3.0", "CC BY 4.0",
                    "CC BY-SA 2.0", "CC BY-SA 2.5", "CC BY-SA 3.0", "CC BY-SA 4.0"}


def fetch_json(params):
    url = API + "?" + urllib.parse.urlencode({"format": "json", **params})
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=45) as response:
        return json.load(response)


def metadata(page):
    info = page["imageinfo"][0]
    extra = info.get("extmetadata", {})
    return {
        "id": f"commons-{page['pageid']}", "page_id": page["pageid"], "title": page["title"],
        "source_url": info["descriptionurl"], "download_url": info.get("thumburl", info["url"]),
        "original_url": info["url"], "license": extra.get("LicenseShortName", {}).get("value", ""),
        "license_url": extra.get("LicenseUrl", {}).get("value", ""),
        "author": extra.get("Artist", {}).get("value", ""),
        "width": info.get("thumbwidth", info["width"]), "height": info.get("thumbheight", info["height"]),
        "annotation_status": "pending_visual_review", "model_evaluated": False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--query", action="append", default=[])
    parser.add_argument("--page-ids", default="")
    parser.add_argument("--exclude-manifest", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()
    excluded = set()
    if args.exclude_manifest:
        excluded = {s["page_id"] for s in json.loads(args.exclude_manifest.read_text())["sources"]}
    pages = {}
    shared = {"prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiurlwidth": 1600}
    if args.page_ids:
        payload = fetch_json({"action": "query", "pageids": args.page_ids.replace(",", "|"), **shared})
        pages.update(payload.get("query", {}).get("pages", {}))
    for query in args.query:
        payload = fetch_json({"action": "query", "generator": "search", "gsrsearch": query,
                              "gsrnamespace": 6, "gsrlimit": 12, **shared})
        pages.update(payload.get("query", {}).get("pages", {}))
        time.sleep(0.3)
    args.output.mkdir(parents=True, exist_ok=True)
    sources = []
    errors = []
    for page in pages.values():
        if page.get("pageid") in excluded or not page.get("imageinfo"):
            continue
        source = metadata(page)
        source["license_accepted_for_qa"] = source["license"] in ALLOWED_LICENSES
        if args.download and source["license_accepted_for_qa"]:
            target = args.output / (source["id"] + Path(urllib.parse.urlparse(source["download_url"]).path).suffix.lower())
            try:
                if not target.exists():
                    request = urllib.request.Request(source["download_url"], headers=HEADERS)
                    with urllib.request.urlopen(request, timeout=60) as response:
                        data = response.read(20 * 1024 * 1024 + 1)
                    if len(data) > 20 * 1024 * 1024:
                        raise ValueError("Image exceeds 20MiB download budget")
                    target.write_bytes(data)
                source["path"] = str(target.resolve())
                source["sha256"] = hashlib.sha256(target.read_bytes()).hexdigest()
            except Exception as error:
                errors.append({"id": source["id"], "error": str(error)})
        sources.append(source)
    report = {"scope": "Public-source discovery only; not ground truth, no vision requests",
              "queries": args.query, "sources": sources, "errors": errors}
    (args.output / "sources.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"sources": [{"id": s["id"], "title": s["title"], "license": s["license"]}
                                  for s in sources], "errors": errors}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
