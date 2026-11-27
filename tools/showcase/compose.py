# Une los segmentos grabados (record-all.js), los acelera, los encadena con fundidos y escribe en assets/
# el video (WebM VP9 y MP4 H.264), el cuadro de portada y las imágenes de las funciones. Necesita ffmpeg.
# Si cambian los tiempos, actualizar data-chapters en index.html con lo que imprime.
import json, subprocess, os, tempfile
here = os.path.dirname(os.path.abspath(__file__))
work = os.path.join(tempfile.gettempdir(), 'showcase-segments')
assets = os.path.join(here, '..', '..', 'assets')
seg = json.load(open(os.path.join(work, 'segments.json')))
order = [('creator', 2.0), ('table', 1.0), ('spells', 1.27), ('light', 1.5)]
fade = 0.5
inputs, filters, durs = [], [], []
for i, (name, speed) in enumerate(order):
    s = seg[name]
    inputs += ['-i', s['file']]
    d = (s['to'] - s['from']) / speed
    durs.append(d)
    filters.append(f"[{i}:v]trim=start={s['from']:.3f}:end={s['to']:.3f},setpts=(PTS-STARTPTS)/{speed},fps=30,scale=1280:720,format=yuv420p,settb=AVTB[v{i}]")
chain, last, offset, starts = [], 'v0', 0.0, [0.0]
for i in range(1, len(order)):
    offset += durs[i - 1] - fade
    starts.append(offset)
    out = f'x{i}'
    chain.append(f"[{last}][v{i}]xfade=transition=fade:duration={fade}:offset={offset:.3f}[{out}]")
    last = out
total = offset + durs[-1]
graph = ';'.join(filters + chain)
master = os.path.join(work, 'master.mp4')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', graph, '-map', f'[{last}]', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-pix_fmt', 'yuv420p', master], check=True)
def ff(*args):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *args], check=True)
ff('-i', master, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '42', '-deadline', 'good', '-cpu-used', '2', '-row-mt', '1', '-pix_fmt', 'yuv420p', os.path.join(assets, 'showcase.webm'))
ff('-i', master, '-an', '-c:v', 'libx264', '-crf', '30', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', os.path.join(assets, 'showcase.mp4'))
# Cuadros: el de portada (la bola de fuego) y uno por función, recortados a 16:10.
fire = starts[2] + 3.1
for at, crop, name, q in [
    (fire, 'scale=1280:720', 'showcase-poster.webp', 72),
    (1.6, 'crop=1152:720:64:0,scale=640:400', 'landing-creator.webp', 80),
    (starts[1] + 5.3, 'crop=1152:720:64:0,scale=640:400', 'landing-table.webp', 80),
    (fire, 'crop=1152:720:0:0,scale=640:400', 'landing-spells.webp', 80),
    (total - 1.0, 'crop=1152:720:0:0,scale=640:400', 'landing-lighting.webp', 80),
]:
    ff('-ss', f'{at:.2f}', '-i', master, '-frames:v', '1', '-vf', crop, '-c:v', 'libwebp', '-quality', str(q), os.path.join(assets, name))
print('capítulos (data-chapters):', ','.join(str(round(x, 1)) for x in starts), '· total', round(total, 2), 's')
