"""Re-read game-entry pages at 300 DPI using TSV line baselines and confidence filtering."""
import argparse
import gzip
import importlib.util
import json
import os
import re
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import pymupdf

spec = importlib.util.spec_from_file_location('extractor', Path(__file__).with_name('extract-official-pdfs.py'))
extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)


def refine(job):
    book, folder, directory, tessdata = job
    file = Path(directory) / (book['id'] + '.json.gz')
    with gzip.open(file, 'rt', encoding='utf8') as stream:
        data = json.load(stream)
    cache = Path(directory) / (book['id'] + '-ocr-v3')
    cache.mkdir(exist_ok=True)
    count = 0
    with pymupdf.open(Path(folder) / book['relativePath']) as pdf:
        for i, page in enumerate(data['pages']):
            if not page.get('ocr'):
                continue
            text = ' '.join(w['s'] for w in page['items'])
            if len(text) < 100:
                continue
            number = i+1
            ranges = {
                '014cf07b953a5056': [(8,32),(159,226)],
                '187aa9c8e2a9ab6a': [(19,40),(116,197)],
                '0e4dafe3dfefe19b': [(98,157)],
                '15739a452ebd9a5b': [(1,66)],
                '17ed9c5777e883b3': [(15,85),(275,331)],
            }
            core = any(lo <= number <= hi for lo,hi in ranges.get(book['id'],[]))
            mechanical = re.search(r'armadura|armor|puntos.{0,20}golpe|hit.{0,10}points|challenge|desaf[ií]o|tiempo.{0,20}lanzamiento|casting.{0,10}time|sintoniz|attunement|objeto.{0,10}maravilloso|\b(?:wondrous|rare|rar[oa]|legendari[oa]|uncommon)\b',text,re.I)
            if not core and not mechanical:
                continue
            target = cache / (str(i+1) + '.json')
            if target.exists():
                items = json.loads(target.read_text(encoding='utf8'))
            else:
                items = extractor.ocr_items(pdf[i], book['lang'], tessdata,
                    'C:/Program Files/Tesseract-OCR/tesseract.exe', 300)
                target.write_text(json.dumps(items, ensure_ascii=False), encoding='utf8')
            page['items'] = items
            page['ocrLines'] = True
            count += 1
    data['summary']['refinedPages'] = count
    temporary = file.with_suffix('.refined-' + str(os.getpid()))
    with gzip.open(temporary, 'wt', encoding='utf8', compresslevel=4) as stream:
        json.dump(data, stream, ensure_ascii=False, separators=(',', ':'))
    temporary.replace(file)
    return {'book':book['title'], 'refinedPages':count}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('manifest', type=Path)
    p.add_argument('folder')
    p.add_argument('directory', type=Path)
    p.add_argument('--tessdata', required=True)
    p.add_argument('--workers', type=int, default=6)
    args = p.parse_args()
    books = json.loads(args.manifest.read_text(encoding='utf8'))
    important = ['014cf07b953a5056','187aa9c8e2a9ab6a','0e4dafe3dfefe19b','15739a452ebd9a5b','c0c7b906cb4dbb43','f4a36a6e25e208fc']
    books.sort(key=lambda b: important.index(b['id']) if b['id'] in important else 100)
    done = set()
    while len(done) < len(books):
        available = [b for b in books if b['id'] not in done and (args.directory/(b['id']+'.json.gz')).exists()]
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            jobs = [(b,args.folder,str(args.directory),args.tessdata) for b in available]
            for book, future in zip(available, pool.map(refine,jobs)):
                print(json.dumps(future,ensure_ascii=True),flush=True)
                done.add(book['id'])
        if len(done) < len(books):
            time.sleep(2)
    print(json.dumps({'complete':len(done)}),flush=True)


if __name__ == '__main__':
    main()
