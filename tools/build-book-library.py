"""Build a browser-importable personal D&D library from local PDFs.

Usage: python tools/build-book-library.py "F:\\DnD Books" --output <file.json>
Requires PyMuPDF (pip install pymupdf). Nothing is uploaded or written beside the PDFs.
The generated pack contains book text: keep it outside the published site.
"""

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

import pymupdf


def normalized(value):
    return "".join(c for c in unicodedata.normalize("NFKD", value.lower()) if not unicodedata.combining(c))


def clean(text):
    text = text.replace("\u00ad", "").replace("\u0000", "")
    text = re.sub(r"(\w)-\s*\n\s*([a-záéíóúñ])", r"\1\2", text)
    return "\n".join(re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()).strip()


def classify(relative):
    name = normalized(relative.as_posix())
    if name.startswith("5.5 e/"):
        edition = "2024"
    elif name.startswith("5ta edicion/"):
        edition = "2014"
    elif name.startswith("3e y 3.5e/"):
        edition = "3.5"
    elif name.startswith("4ta edicion/"):
        edition = "4e"
    else:
        edition = "other"
    if edition == "2014" and any(t in name for t in ("2024", "2025", "dragon delves", "uni y la busqueda")):
        edition = "2024"
    origin = "playtest" if "arcanos desenterrados/" in name else "third-party" if any(
        t in name for t in ("homebrew", "the gm book of", "tal'dorei", "darksun")
    ) else "unverified"
    if origin == "unverified" and any(t in name for t in ("/oficiales/", "/esenciales/", "5.5 e/")):
        origin = "official"
    category = "reference"
    if any(t in name for t in ("monstru", "bestiari", "criaturas", "dragones de fizban", "coleccion astral", "gloria de gigantes")):
        category = "creatures"
    elif any(t in name for t in ("/clases/", "manual del jugador", "guia del jugador", "caldero de tasha", "xanathar")):
        category = "classes"
    elif any(t in name for t in ("conjuros", "hechizos", "grimorio")):
        category = "spells"
    elif any(t in name for t in ("objetos", "armas", "armadura", "tesoros", "artefactos")):
        category = "items"
    elif "/aventuras/" in name:
        category = "adventures"
    return edition, origin, category


CR_XP = {0: 0, .125: 25, .25: 50, .5: 100, 1: 200, 2: 450, 3: 700, 4: 1100,
         5: 1800, 6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900, 11: 7200,
         12: 8400, 13: 10000, 14: 11500, 15: 13000, 16: 15000, 17: 18000,
         18: 20000, 19: 22000, 20: 25000, 21: 33000, 22: 41000, 23: 50000,
         24: 62000, 25: 75000, 26: 90000, 27: 105000, 28: 120000, 29: 135000, 30: 155000}


def parse_monsters(text, book, page):
    """Accept complete Spanish 2014 stat headers only; never invent missing stats.

    Extract core encounter statistics. Actions remain in the cited book page, because
    PDF reading order and OCR are not reliable enough for automatic attack execution.
    """
    if book["edition"] != "2014" or book["origin"] != "official":
        return []
    lines = text.splitlines()
    out = []
    anchors = [i for i, line in enumerate(lines) if re.match(r"Clase de Armadura\s*:?\s*\d", line, re.I)]
    for pos, start in enumerate(anchors):
        end = anchors[pos + 1] - 2 if pos + 1 < len(anchors) else len(lines)
        header = "\n".join(lines[start:end])
        before = lines[max(0, start - 5):start]
        type_idx = next((i for i in range(len(before)-1, -1, -1) if re.search(
            r"\b(?:Diminut[oa]|Pequeñ[oa]|Median[oa]|Grande|Enorme|Gargantuesc[oa])\b", before[i], re.I)), None)
        if type_idx is None or type_idx == 0:
            continue
        title = before[type_idx - 1].strip()
        if not (2 <= len(title) <= 100) or re.search(r"[.!?;:]|\d", title):
            continue
        kind = before[type_idx]
        ac = re.match(r"Clase de Armadura\s*:?\s*(\d+)\b", lines[start], re.I)
        hp = re.search(r"Puntos de [gG]olpe\s*:?\s*(\d+)\s*\(([^)]+)\)", header)
        cr = re.search(r"(?:Desafío|Valor de desafío)\s*:?\s*(\d+(?:/[248])?)\s*\(([\d., ]+)\s*(?:PX|PE|XP)\)", header, re.I)
        ab_label = re.search(r"FUE\s+DES\s+CON\s+INT\s+SAB\s+CAR", header)
        if not all((ac, hp, cr, ab_label)):
            continue
        abilities = re.findall(r"\b(\d{1,2})\s*\(\s*([+−–-]?\s*\d{1,2})\s*\)", header[ab_label.end():])[:6]
        if len(abilities) != 6:
            continue
        values = [int(v) for v, _ in abilities]
        if any(v < 1 or v > 30 for v in values):
            continue
        if any(int(re.sub(r"\s", "", m).replace("−", "-").replace("–", "-")) != (int(v)-10)//2 for v, m in abilities):
            continue
        numerator, _, denominator = cr[1].partition("/")
        challenge = int(numerator) / int(denominator) if denominator else int(numerator)
        xp = int(re.sub(r"\D", "", cr[2]))
        if challenge not in CR_XP or (challenge != 0 and xp != CR_XP[challenge]):
            continue
        dice = re.sub(r"\s", "", hp[2])
        # This PDF font sometimes extracts a printed '+' as '-+-'. Accept the repair
        # only when the resulting dice also reproduce the printed average HP below.
        dice = dice.replace('-+-', '+')
        if not re.fullmatch(r"\d+d\d+(?:[+-]\d+)?", dice):
            continue
        hit_dice = re.fullmatch(r"(\d+)d(\d+)([+-]\d+)?", dice)
        average = int(hit_dice[1]) * (int(hit_dice[2]) + 1) // 2 + int(hit_dice[3] or 0)
        if int(hp[1]) != average:
            continue
        if not 1 <= int(ac[1]) <= 30 or not 1 <= int(hp[1]) <= 2000:
            continue
        stat_lines = {}
        labels = {"speed": r"Velocidad", "saves": r"Tiradas de salvación", "skills": r"Habilidades",
                  "vuln": r"Vulnerabilidades? (?:al?|a[l]? daño)", "res": r"Resistencias? (?:al?|a[l]? daño)",
                  "imm": r"Inmunidad(?:es)? (?:al?|a[l]? daño)", "cimm": r"Inmunidad(?:es)? a estados",
                  "senses": r"Sentidos", "lang": r"Idiomas"}
        # Collect wrapped header fields, ending before challenge or ability scores.
        boundary = r"\n(?:(?:" + "|".join(labels.values()) + r"|Desafío|Valor de desafío|FUE)\b|\d+\s*\()"
        for key, label in labels.items():
            match = re.search(r"^" + label + r"\s*:?\s*(.*?)(?=" + boundary + r"|\Z)", header, re.I | re.M | re.S)
            stat_lines[key] = re.sub(r"\s+", " ", match[1]).strip() if match else ""
        size = re.search(r"\b(Diminut[oa]|Pequeñ[oa]|Median[oa]|Grande|Enorme|Gargantuesc[oa])\b", kind, re.I)
        type_name = kind[:size.start()].strip() or kind[size.end():].split(",")[0].strip()
        if not re.match(r"^(?:aberración|bestia|celestial|constructo|dragón|elemental|feérico|gigante|humanoide|infernal|monstruosidad|cieno|planta|muerto viviente|enjambre)\b", type_name, re.I):
            continue
        align = kind.split(",", 1)[1].strip() if "," in kind else ""
        slug = re.sub(r"[^a-z0-9]+", "-", normalized(title)).strip("-")
        out.append({"id": f"book-{book['id']}-{slug}", "name": title.title() if title.isupper() else title,
                    "size": size[1], "type": type_name.lower(), "align": align, "ac": int(ac[1]),
                    "hp": int(hp[1]), "hd": dice, "ab": values, "cr": challenge, "xp": xp,
                    **stat_lines, "traits": [], "actions": [], "legendary": [], "reactions": [],
                    "bookId": book["id"], "page": page, "source": book["title"], "edition": "2014",
                    "referenceOnlyActions": True})
    return out


def extract(path, root, cache):
    relative = path.relative_to(root)
    stat = path.stat()
    book_id = hashlib.sha256(relative.as_posix().encode("utf8")).hexdigest()[:16]
    cache_path = cache / (book_id + ".json") if cache else None
    if cache_path and cache_path.exists():
        previous = json.loads(cache_path.read_text(encoding="utf8"))
        if previous.get("fingerprint") == [stat.st_size, stat.st_mtime_ns]:
            book = previous["book"]
            book["edition"], book["origin"], book["category"] = classify(relative)
            if book["pages"]:
                book["status"] = "partial" if len(book["pages"]) < book["pageCount"] * .75 else "ready"
            book["monsters"] = list({m["id"]: m for p in book["pages"] for m in parse_monsters(p["text"], book, p["number"])}.values())
            return book
    edition, origin, category = classify(relative)
    book = {"id": book_id, "title": path.stem, "fileName": path.name,
            "relativePath": relative.as_posix(), "edition": edition, "origin": origin,
            "category": category, "pages": [], "monsters": [], "status": "ready", "pageCount": 0}
    try:
        with pymupdf.open(path) as doc:
            if doc.needs_pass and not doc.authenticate(""):
                book["status"] = "locked"
                return book
            book["pageCount"] = len(doc)
            toc = doc.get_toc()
            for i, page in enumerate(doc):
                text = clean(page.get_text())
                if len(text) < 40:
                    continue
                titles = [title for _, title, number in toc if number == i+1 and len(title) > 2]
                heading = " · ".join(titles[:3]) or next((l for l in text.splitlines() if len(l) > 3), "")[:140]
                book["pages"].append({"number": i+1, "title": heading, "text": text})
                book["monsters"].extend(parse_monsters(text, book, i+1))
            book["unreadablePages"] = len(doc) - len(book["pages"])
            if not book["pages"]:
                book["status"] = "needs-ocr"
            elif len(book["pages"]) < len(doc) * .75:
                book["status"] = "partial"
            # A monster can appear in both an index and a stat block; stable IDs deduplicate it.
            book["monsters"] = list({m["id"]: m for m in book["monsters"]}.values())
    except Exception as exc:
        book["status"] = "error"
        book["error"] = str(exc)[:200]
    if cache_path:
        cache_path.write_text(json.dumps({"fingerprint": [stat.st_size, stat.st_mtime_ns], "book": book}, ensure_ascii=False), encoding="utf8")
    return book


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--cache", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    if not args.folder.is_dir():
        parser.error("Book folder does not exist")
    if args.cache:
        args.cache.mkdir(parents=True, exist_ok=True)
    paths = sorted(args.folder.rglob("*"))
    paths = [p for p in paths if p.is_file() and p.suffix.lower() == ".pdf"]
    books = []
    for i, path in enumerate(paths):
        book = extract(path, args.folder, args.cache)
        books.append(book)
        print(f"{i+1}/{len(paths)} {book['status']} {len(book['pages'])}/{book['pageCount']} pages, {len(book['monsters'])} creatures: {path.name}", flush=True)
    summary = {"books": len(books), "pages": sum(len(b["pages"]) for b in books),
               "monsters": sum(len(b["monsters"]) for b in books),
               "editions": dict(Counter(b["edition"] for b in books)),
               "statuses": dict(Counter(b["status"] for b in books))}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"format": "dnd-personal-library", "version": 1, "books": books}, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps({"summary": summary, "books": [{k: v for k, v in b.items() if k not in ("pages", "monsters")} | {"searchablePages": len(b["pages"]), "creatures": len(b["monsters"])} for b in books]}, ensure_ascii=False, indent=2), encoding="utf8")
    print(json.dumps(summary), flush=True)


if __name__ == "__main__":
    main()
