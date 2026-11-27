// Checks a batch of pixel spell definitions before it goes into the board.
// Uso: node tools/check-pixel-spells.js board-pixel-spells-01.js [más archivos…]
// 1. Static: syntax, forbidden APIs, every key is a real spell id or 'kind:<archetype>', field types.
// 2. Live: casts every definition in tools/pixel-fx-lab.html (headless Chromium), catches errors and
//    writes a contact sheet to .tmp-test/pixel-check/<file>.png (one row per spell, six moments each).
// Exit code 1 if anything fails. Needs Playwright with Chromium.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const files = process.argv.slice(2);
if (!files.length) {
  console.error('Uso: node tools/check-pixel-spells.js <archivo.js>…');
  process.exit(2);
}
const Spells = require('../board-spells.js');
const ARCHETYPES = [
  'projectile',
  'sphere',
  'cone',
  'strike',
  'aura-instant',
  'aura-persistent',
  'beam',
  'column',
  'cube',
  'wall',
  'touch',
  'buff',
  'heal',
  'summon',
  'teleport',
  'on-hit',
  'line',
  'multi',
  'utility',
];
// Every spell id the board knows, read from the archetype table.
const source = fs.readFileSync(path.join(ROOT, 'board-spells.js'), 'utf8');
const known = new Set();
for (const m of source.matchAll(/classify\(\s*'[a-z-]+',\s*'([^']+)'/g))
  for (const id of m[1].split(' ')) known.add(id);
// Prefer a spell with an area template, so area archetypes (cube, column…) are drawn at their real size.
const sample = kind => {
  const ids = [...known].filter(id => Spells.kindFor(id) === kind);
  return ids.find(id => Spells.areaFor({ id, level: 3 }, 3)) || ids[0];
};

const FORBIDDEN = [
  [/\bMath\.random\b/, 'Math.random (use kit.hash/kit.noise: frames must be deterministic)'],
  [/\b(fetch|XMLHttpRequest|eval|Function\s*\(|import\s*\(|require\s*\()/, 'network/eval/module loading'],
  [/\b(document|window|localStorage|sessionStorage|indexedDB)\b/, 'DOM or storage access'],
  [/\b(setTimeout|setInterval|requestAnimationFrame)\b/, 'timers (everything is driven by the clock passed in)'],
  [/\bctx\.(filter|shadowBlur)\b/, 'blur/filter (no soft glow in the pixel style)'],
  [/createRadialGradient|createLinearGradient/, 'gradients (no soft glow in the pixel style)'],
  [/globalCompositeOperation\s*=\s*['"]lighter/, 'additive blending (no soft glow in the pixel style)'],
];
let failed = false;
const fail = (file, msg) => {
  failed = true;
  console.log(`FALLA ${file}: ${msg}`);
};
const batches = [];
for (const file of files) {
  const full = path.resolve(file);
  const text = fs.readFileSync(full, 'utf8');
  try {
    execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' });
  } catch (e) {
    fail(file, 'sintaxis: ' + String(e.stderr).split('\n').slice(0, 4).join(' '));
    continue;
  }
  // The standard wrapper's `typeof window` check is fine; anything else touching the page is not.
  const body = text.replace(/typeof window !== 'undefined' \? window : globalThis/g, '');
  for (const [re, why] of FORBIDDEN) if (re.test(body)) fail(file, 'usa ' + why);
  const keys = [];
  const sandbox = {
    BoardPixelFX: {
      register(key, def) {
        keys.push([key, def]);
      },
      kit: new Proxy({}, { get: () => () => 0 }),
    },
  };
  sandbox.window = undefined;
  sandbox.globalThis = sandbox;
  try {
    vm.runInNewContext(text, sandbox, { filename: file, timeout: 1000 });
  } catch (e) {
    fail(file, 'al cargar: ' + e.message);
    continue;
  }
  if (!keys.length) fail(file, 'no registra ningún conjuro (BoardPixelFX.register)');
  const seen = new Set();
  for (const [key, def] of keys) {
    if (seen.has(key)) fail(file, `${key} registrado dos veces`);
    seen.add(key);
    const kind = key.startsWith('kind:') ? key.slice(5) : null;
    if (kind ? !ARCHETYPES.includes(kind) : !known.has(key))
      fail(file, `${key} no es un conjuro ni un arquetipo del tablero`);
    if (!def || typeof def !== 'object') {
      fail(file, `${key}: la definición no es un objeto`);
      continue;
    }
    for (const fn of ['air', 'ground', 'linger', 'lingerAir', 'fog', 'beats', 'end', 'flash', 'reach'])
      if (def[fn] != null && typeof def[fn] !== 'function') fail(file, `${key}.${fn} debe ser una función`);
    if (!def.air && !def.ground) fail(file, `${key}: necesita air o ground`);
    for (const n of ['travel', 'decal'])
      if (def[n] != null && typeof def[n] !== 'function' && !(Number.isFinite(def[n]) && def[n] >= 0 && def[n] <= 4000))
        fail(file, `${key}.${n} fuera de rango`);
  }
  batches.push({ file, full, keys: keys.map(([key]) => key) });
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(ROOT, pathname);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok(server)));
}

(async () => {
  if (!batches.length) process.exit(1);
  const { chromium } = require('playwright');
  const server = await serve();
  const browser = await chromium.launch();
  const out = path.join(ROOT, '.tmp-test/pixel-check');
  fs.mkdirSync(out, { recursive: true });
  for (const batch of batches) {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => /BoardPixelFX/.test(m.text()) && errors.push(m.text()));
    await page.goto(`http://127.0.0.1:${server.address().port}/tools/pixel-fx-lab.html`);
    await page.addScriptTag({ path: batch.full });
    await page.waitForTimeout(1200);
    const rows = [];
    for (const key of batch.keys) {
      const id = key.startsWith('kind:') ? sample(key.slice(5)) : key;
      if (!id) {
        fail(batch.file, `${key}: no hay ningún conjuro de ese arquetipo para probar`);
        continue;
      }
      const total = await page.evaluate(id => {
        lab.at(0);
        // Spells with lasting art stay 2.5 s after the cast so the linger, lingerAir and fog hooks run.
        const def =
          BoardPixelFX.lingers({ id }, 'ground') ||
          BoardPixelFX.lingers({ id }, 'air') ||
          BoardPixelFX.lingers({ id }, 'fog');
        lab.fire({ id, element: 'magic', level: 3, lingerMs: def ? 2500 : 0 });
        const event = lab.boards[1].events[0];
        const t = BoardSpellFX.phase(event, 0, false);
        const timing = BoardPixelFX.timing(event);
        return { total: 300 + timing.travel + timing.impact, handled: BoardPixelFX.handles(event), lasting: !!def, t };
      }, id);
      if (!total.handled) fail(batch.file, `${key}: el tablero no lo toma (¿id o arquetipo?)`);
      if (total.total > 3200) fail(batch.file, `${key}: dura ${Math.round(total.total)} ms (máximo 3200)`);
      const shots = [];
      // Lasting spells: the last two shots fall in the lingering phase (and Spiritual Weapon's swing).
      const moments = total.lasting
        ? [0.15, 0.4, 0.65, 0.9].map(k => total.total * k).concat([total.total + 900, total.total + 1900])
        : [0.12, 0.3, 0.45, 0.6, 0.75, 0.92].map(k => total.total * k);
      for (const at of moments) {
        await page.evaluate(t => lab.at(t), Math.round(at));
        shots.push(await page.locator('#new').screenshot());
      }
      const broken = await page.evaluate(id => BoardPixelFX.failed.has(id), id);
      if (broken) fail(batch.file, `${key}: lanzó una excepción al dibujar (ver consola)`);
      rows.push({ key, id, shots, ms: Math.round(total.total) });
      console.log(`ok    ${key}${key !== id ? ` (probado con ${id})` : ''} · ${Math.round(total.total)} ms`);
    }
    for (const e of errors) fail(batch.file, e);
    // Contact sheet: compose in the page so no image library is needed here.
    const sheet = await page.evaluate(
      async rows => {
        const scale = 0.32,
          w = 832 * scale,
          h = 512 * scale,
          label = 18;
        const c = document.createElement('canvas');
        c.width = w * 6;
        c.height = rows.length * (h + label);
        const g = c.getContext('2d');
        g.fillStyle = '#111';
        g.fillRect(0, 0, c.width, c.height);
        for (const [r, row] of rows.entries()) {
          g.fillStyle = '#ffd27a';
          g.font = '13px system-ui';
          g.fillText(`${row.key}  ·  ${row.ms} ms`, 6, r * (h + label) + 13);
          for (const [i, b64] of row.shots.entries()) {
            const img = new Image();
            img.src = 'data:image/png;base64,' + b64;
            await img.decode();
            g.drawImage(img, i * w, r * (h + label) + label, w, h);
          }
        }
        return c.toDataURL('image/png').split(',')[1];
      },
      rows.map(r => ({ ...r, shots: r.shots.map(s => s.toString('base64')) })),
    );
    const name = path.basename(batch.file, '.js') + '.png';
    fs.writeFileSync(path.join(out, name), Buffer.from(sheet, 'base64'));
    console.log(`hoja de contacto: ${path.relative(ROOT, path.join(out, name))}`);
    await page.close();
  }
  await browser.close();
  server.close();
  console.log(failed ? 'Hay fallas.' : 'Todo bien.');
  process.exit(failed ? 1 : 0);
})();
