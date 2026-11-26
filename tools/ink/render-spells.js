/* Rebuild the shipped color/alpha sprite strips with Ink Studio's Node renderer. */
const fs = require('node:fs');
const path = require('node:path');
const ink = require('@shapeshift-labs/ink-studio');
const { encode } = require('@shapeshift-labs/ink-studio/cli/png.js');
const { cols, specs } = require('../../board-ink.js');
const { world } = require('./spell-scenes.js');

const kit = ink.load();
const out = path.resolve(__dirname, '../../assets/spell-ink');
const selected = new Set(process.argv.slice(2));
for (const id of selected) if (!Object.hasOwn(specs, id)) throw Error('Unknown Ink Studio scene: ' + id);
fs.mkdirSync(out, { recursive: true });
for (const [id, [w, h, count]] of Object.entries(specs)) {
  if (selected.size && !selected.has(id)) continue;
  const width = w * cols,
    height = h * Math.ceil(count / cols);
  const atlas = Buffer.alloc(width * height * 4);
  for (let i = 0; i < count; i++) {
    const frame = ink.render(world(kit, id, i / (count - 1), w, h), {
      w,
      h,
      px: 1,
      t: 0,
      ortho: true,
      transparent: true,
      raw: true,
    });
    if (frame.w !== w || frame.h !== h || !frame.alpha) throw Error('Invalid Ink Studio frame for ' + id);
    for (let y = 0; y < h; y++) {
      let dest = ((Math.floor(i / cols) * h + y) * width + (i % cols) * w) * 4;
      for (let x = 0; x < w; x++) {
        const p = y * w + x,
          color = p * 3;
        atlas[dest++] = frame.rgb[color];
        atlas[dest++] = frame.rgb[color + 1];
        atlas[dest++] = frame.rgb[color + 2];
        atlas[dest++] = frame.alpha[p];
      }
    }
  }
  fs.writeFileSync(path.join(out, id + '.png'), encode(width, height, atlas, 4));
  console.log(id);
}
