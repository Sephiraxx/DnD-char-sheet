// Renders the board miniatures as pixel art, straight from the sculptures in code (no Blender).
// Uso: node tools/render-pixel-minis.js [--density 16] [--out assets/minis-pixel] [ids...]
// Writes one PNG per creature and heading at art resolution plus an index.json shaped like
// assets/minis/index.json; the board blows the sprites up with nearest-neighbour sampling.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
for (const file of [
  'miniature-mesh',
  'miniature-ancestries',
  'miniature-wardrobe',
  'miniatures',
  'campaign-mini-models',
  'campaign-miniatures',
  'creature-miniatures',
])
  require('../' + file);
const { Miniatures, CreatureMiniatures } = globalThis;

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf('--' + name);
  if (i < 0) return fallback;
  const [value] = args.splice(i, 2).slice(1);
  return value;
};
const density = Number(option('density', 16));
const out = path.resolve(__dirname, '..', option('out', 'assets/minis-pixel'));
const only = new Set(args);
const ROOT = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/minis/index.json'), 'utf8'));
const FOOTPRINT = { tiny: 0.5, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 4 };
const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc(body));
  return Buffer.concat([head, body, tail]);
}
function png(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++)
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(rows, y * (width * 4 + 1) + 1);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
// Index rows of extra forms are named "<creature>-<age or variant>".
function modelKey(record) {
  if (Object.hasOwn(CreatureMiniatures.options, record.id)) return record.id;
  const form = record.age || record.variant;
  return form && record.id.endsWith('-' + form) ? record.id.slice(0, -form.length - 1) : record.id;
}
function render(record, angle) {
  let image = null;
  const canvas = { width: 0, height: 0 };
  const ctx = {
    canvas,
    miniBoard: true,
    miniRotation: angle,
    miniPixel: density,
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: img => (image = img),
  };
  const size = Miniatures.boardCell * (FOOTPRINT[record.size] || 1);
  if (record.appearance) Miniatures.draw(ctx, JSON.parse(record.appearance), size);
  else CreatureMiniatures.draw(ctx, modelKey(record), size, record);
  if (!image) return null;
  return { image, anchor: canvas.anchor };
}

fs.mkdirSync(out, { recursive: true });
const index = [];
for (const record of source) {
  if (only.size && !only.has(record.id)) continue;
  const rotations = {};
  for (const angle of ANGLES) {
    const frame = render(record, angle);
    if (!frame) continue;
    const key = String(angle).padStart(3, '0');
    const file = `${record.id}_px_r${key}.png`;
    fs.writeFileSync(path.join(out, file), png(frame.image.width, frame.image.height, frame.image.data));
    rotations[key] = { image: file, anchor: frame.anchor };
  }
  if (!rotations['000']) {
    console.warn('sin figura:', record.id);
    continue;
  }
  const { appearance, rotations: _, image, anchor, ...meta } = record;
  index.push({
    ...meta,
    ...(appearance ? { appearance } : {}),
    pixelsPerSquare: density,
    ...rotations['000'],
    rotations,
  });
}
fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`${index.length} figuras a ${density} px por casilla → ${path.relative(ROOT, out)}`);
