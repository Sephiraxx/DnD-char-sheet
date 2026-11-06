"""Recognize scanned ability tables as small isolated blocks, retaining numeric cells."""
import argparse
import gzip
import importlib.util
import json
import os
import re
import subprocess
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import pymupdf

spec=importlib.util.spec_from_file_location('extractor',Path(__file__).with_name('extract-official-pdfs.py'))
extractor=importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)


def repair(job):
    book,folder,directory,tessdata=job
    file=Path(directory)/(book['id']+'.json.gz')
    with gzip.open(file,'rt',encoding='utf8') as stream:
        data=json.load(stream)
    out=Path(directory)/(book['id']+'-abilities-v4')
    out.mkdir(exist_ok=True)
    count=0
    with pymupdf.open(Path(folder)/book['relativePath']) as pdf:
        for i,page in enumerate(data['pages']):
            if not page.get('ocrLines'):
                continue
            target=out/(str(i+1)+'.json')
            if target.exists():
                count+=1
                continue
            heads=[w for w in page['items'] if len(re.findall(r'\b(?:FUE|STR|DES|DEX|CON|INT|SAB|WIS|CAR|CHA)\b',w['s'],re.I))>=4]
            if not heads:
                continue
            items=page['items'][:]
            for header in heads:
                h=max(5,header['h'])
                clip=pymupdf.Rect(max(0,header['x']-18),max(0,header['y']-h*1.8),
                    min(page['w'],header['x']+header['w']+22),min(page['h'],header['y']+h*3))
                scale=min(6,4500/clip.width,1800/clip.height)
                png=pdf[i].get_pixmap(matrix=pymupdf.Matrix(scale,scale),clip=clip,alpha=False).tobytes('png')
                result=subprocess.run(['C:/Program Files/Tesseract-OCR/tesseract.exe','stdin','stdout',
                    '--tessdata-dir',tessdata,'-l','eng','--psm','6','-c','tessedit_create_tsv=1'],
                    input=png,capture_output=True,env=dict(os.environ,OMP_THREAD_LIMIT='1'),timeout=90,check=True)
                replacement=extractor.parse_ocr_tsv(result.stdout.decode('utf-8-sig'),scale,0)
                for word in replacement:
                    word['x']+=clip.x0
                    word['y']+=clip.y0
                # Replace only table rows: the crop also contains a small margin around them.
                band=[w for w in replacement if header['y']-h*1.5<=w['y']<=header['y']+h*2.5]
                items=[w for w in items if not (clip.x0<=w['x']<=clip.x1 and header['y']-h*1.5<=w['y']<=header['y']+h*2.5)]
                items.extend(band)
            target.write_text(json.dumps(items,ensure_ascii=False),encoding='utf8')
            count+=1
    return {'book':book['title'],'tables':count}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('manifest',type=Path)
    p.add_argument('folder')
    p.add_argument('directory')
    p.add_argument('--tessdata',required=True)
    args=p.parse_args()
    books=json.loads(args.manifest.read_text(encoding='utf8'))
    with ProcessPoolExecutor(max_workers=6) as pool:
        futures=[pool.submit(repair,(b,args.folder,args.directory,args.tessdata)) for b in books]
        for future in as_completed(futures):
            print(json.dumps(future.result(),ensure_ascii=True),flush=True)


if __name__=='__main__':
    main()
