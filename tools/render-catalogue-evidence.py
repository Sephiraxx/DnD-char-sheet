"""Render source PDF headers and stat tables into review contact sheets."""
import argparse,json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import pymupdf

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('evidence',type=Path);p.add_argument('pdf_folder',type=Path);p.add_argument('output',type=Path);p.add_argument('--kind',choices=['items','monsters'],required=True);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
 rows=json.loads(a.evidence.read_text(encoding='utf8'))[a.kind];docs={};cards=[]
 font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
 for row in rows:
  file=a.pdf_folder/row['path'];doc=docs.setdefault(str(file),pymupdf.open(file));page=doc[row['page']-1]
  x=max(0,row['x']-8);y=max(0,row['y']-row['h']*1.2);width=min(row['w']-x,row['w']*.51)
  clip=pymupdf.Rect(x,y,x+width,min(row['height'],row['bottom']));scale=min(6,780/clip.width)
  pix=page.get_pixmap(matrix=pymupdf.Matrix(scale,scale),clip=clip,alpha=False);im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
  if im.width!=780:im=im.resize((780,round(im.height*780/im.width)))
  header=75 if a.kind=='monsters' else 46;card=Image.new('RGB',(800,im.height+header),'white');draw=ImageDraw.Draw(card)
  draw.text((6,4),str(len(cards)+1)+'. '+row['label'][:80],font=font,fill='black');draw.text((6,24),row['bookId']+' PDF '+str(row['page']),font=font,fill='black')
  if a.kind=='monsters':draw.text((6,46),(row.get('target') or '')[:115],font=font,fill='darkblue')
  card.paste(im,(6,header));cards.append(card)
 per=8 if a.kind=='monsters' else 32
 for start in range(0,len(cards),per):
  batch=cards[start:start+per];cols=2 if a.kind=='monsters' else 4;heights=[max(c.height for c in batch[r:r+cols])+8 for r in range(0,len(batch),cols)];canvas=Image.new('RGB',(cols*800,sum(heights)),(225,225,225));y=0
  for r in range(0,len(batch),cols):
   for col,c in enumerate(batch[r:r+cols]):canvas.paste(c,(col*800,y))
   y+=heights[r//cols]
  canvas.save(a.output/(a.kind+'-'+str(start//per+1).zfill(2)+'.jpg'),quality=88)
 (a.output/(a.kind+'-index.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({'kind':a.kind,'entries':len(rows),'sheets':math.ceil(len(cards)/per)}))

if __name__=='__main__':main()
