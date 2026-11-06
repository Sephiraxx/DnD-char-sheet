"""Extract positioned PDF text for the site's existing LibraryCore parser.

Reads a reviewed inventory manifest. OCR is cached by PDF fingerprint and page, so
interrupted runs resume. Originals are never modified; all intermediate text stays local.
"""
import argparse
import csv
import gzip
import io
import json
import os
import subprocess
import sys
from statistics import median
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import pymupdf


def items_from_page(page):
    out = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if not span["text"].strip():
                    continue
                x0, y0, x1, y1 = span["bbox"]
                out.append({"s": span["text"], "x": round(x0, 2), "y": round(span["origin"][1], 2),
                            "w": round(x1-x0, 2), "h": round(span["size"], 2), "f": span["font"]})
    return out


def readable(items):
    text = "".join(i["s"] for i in items)
    chars = sum(c.isalpha() for c in text)
    return chars >= 100 and sum(c.isascii() and c.isalpha() for c in text) >= chars * .65


def ocr_items(page, language, tessdata, executable, dpi):
    scale = min(dpi / 72, 5000 / max(page.rect.width, page.rect.height), (20000000 / (page.rect.width * page.rect.height)) ** .5)
    png = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False).tobytes("png")
    env = dict(os.environ, OMP_THREAD_LIMIT="1")
    result = subprocess.run([executable, "stdin", "stdout", "--tessdata-dir", tessdata,
                             "-l", language, "--dpi", str(dpi), "--psm", "3", "-c", "tessedit_create_tsv=1"],
                            input=png, capture_output=True, env=env, timeout=120, check=True)
    table = result.stdout.decode("utf-8-sig", errors="replace")
    return parse_ocr_tsv(table, scale)


def parse_ocr_tsv(table, scale, minimum_confidence=35):
    if not table.startswith("level\t"):
        raise RuntimeError("OCR did not return a TSV table")
    words = list(csv.DictReader(io.StringIO(table), delimiter="\t"))
    groups = {}
    for word in words:
        if word.get("level") != "5" or not word.get("text", "").strip() or float(word.get('conf', 0)) < minimum_confidence:
            continue
        x, y, w, h = [int(word[k]) / scale for k in ("left", "top", "width", "height")]
        group = (word['block_num'], word['par_num'], word['line_num'])
        groups.setdefault(group, []).append((word['text'], x, y, w, h))
    out = []
    for words in groups.values():
        words.sort(key=lambda w: w[1])
        x = min(w[1] for w in words)
        end = max(w[1]+w[3] for w in words)
        # TSV line IDs preserve the baseline on slightly tilted scans. Individual
        # word boxes would reorder words and create false full-width dividers.
        height = median([w[4] for w in words if len(w[0]) >= 3] or [w[4] for w in words])
        out.append({"s": ' '.join(w[0] for w in words), "x": round(x, 2),
                    "y": round(median(w[2]+w[4] for w in words), 2), "w": round(end-x, 2),
                    "h": round(height, 2), "f": "OCR"})
    return out


def extract(job):
    book, root, output, tessdata, executable, dpi, do_ocr = job
    pdf = Path(root) / book["relativePath"]
    stamp = [pdf.stat().st_size, pdf.stat().st_mtime_ns, dpi, do_ocr, 2]
    file = Path(output) / (book["id"] + ".json.gz")
    if file.exists():
        with gzip.open(file, "rt", encoding="utf8") as stream:
            previous = json.load(stream)
        if previous.get("stamp") == stamp:
            return {"id": book["id"], "title": book["title"], "cached": True, **previous["summary"]}
    page_cache = Path(output) / (book["id"] + "-ocr-v2")
    page_cache.mkdir(parents=True, exist_ok=True)
    pages = []
    ocr_count = 0
    with pymupdf.open(pdf) as doc:
        for i, page in enumerate(doc):
            items = items_from_page(page)
            used_ocr = False
            if do_ocr and not readable(items):
                cached = page_cache / (str(i+1) + ".json")
                if cached.exists():
                    items = json.loads(cached.read_text(encoding="utf8"))
                else:
                    items = ocr_items(page, book["lang"] + "+" + ("eng" if book["lang"] == "spa" else "spa"), tessdata, executable, dpi)
                    cached.write_text(json.dumps(items, ensure_ascii=False), encoding="utf8")
                ocr_count += 1
                used_ocr = True
            pages.append({"w": page.rect.width, "h": page.rect.height, "items": items, "ocr": used_ocr})
    summary = {"pages": len(pages), "ocrPages": ocr_count, "textPages": sum(readable(p["items"]) for p in pages)}
    temporary = file.with_suffix(file.suffix + ".part-" + str(os.getpid()))
    with gzip.open(temporary, "wt", encoding="utf8", compresslevel=4) as stream:
        json.dump({"book": book, "pages": pages, "summary": summary, "stamp": stamp}, stream, ensure_ascii=False, separators=(",", ":"))
    temporary.replace(file)
    return {"id": book["id"], "title": book["title"], **summary}


def main():
    sys.stdout.reconfigure(encoding="utf8", errors="replace")
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("manifest", type=Path)
    p.add_argument("folder", type=Path)
    p.add_argument("output", type=Path)
    p.add_argument("--tessdata", required=True)
    p.add_argument("--tesseract", default="tesseract")
    p.add_argument("--dpi", type=int, default=180)
    p.add_argument("--workers", type=int, default=6)
    p.add_argument("--no-ocr", action="store_true")
    args = p.parse_args()
    books = json.loads(args.manifest.read_text(encoding="utf8"))
    def priority(book):
        title = book["title"].lower()
        if any(t in title for t in ("manual del jugador", "caldero de tasha", "xanathar", "manual de monstruos", "monstruos del multiverso")):
            return 0
        if any(t in title for t in ("fizban", "gigantes", "colección astral", "costa de la espada")):
            return 1
        return 2
    books.sort(key=priority)
    args.output.mkdir(parents=True, exist_ok=True)
    jobs = [(b, str(args.folder), str(args.output), args.tessdata, args.tesseract, args.dpi, not args.no_ocr) for b in books]
    results = []
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        for future in as_completed([pool.submit(extract, job) for job in jobs]):
            result = future.result()
            results.append(result)
            print(json.dumps(result, ensure_ascii=False), flush=True)
            (args.output / "progress.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf8")
    print(json.dumps({"complete": len(results), "pages": sum(x["pages"] for x in results), "ocrPages": sum(x["ocrPages"] for x in results)}), flush=True)


if __name__ == "__main__":
    main()
