const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../board-core.js');

// Lienzo de mentira: acepta cualquier llamada y cuenta cuántas hubo.
function fakeCtx() {
  let calls = 0;
  const grad = { addColorStop() {} };
  const target = { calls: () => calls };
  return new Proxy(target, {
    get(t, k) {
      if (k === 'calls') return t.calls;
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => grad;
      if (k === 'getContext') return () => fakeCtx();
      return (...a) => {
        calls++;
        return a;
      };
    },
    set: () => true,
  });
}
class Path2D {
  rect() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  closePath() {}
}
globalThis.Path2D = Path2D;
globalThis.OffscreenCanvas = class {
  constructor() {
    this.width = 1;
    this.height = 1;
  }
  getContext() {
    return fakeCtx();
  }
};
const A = require('../board-art.js');

test('arte del tablero: dibuja todos los terrenos sin fallar, entero y por partes', () => {
  const g = B.normGrid({ cols: 8, rows: 6 }),
    codes = B.TERRAIN.map(t => t.code).join(''),
    terrain = Array.from({ length: 48 }, (_, i) => codes[(i * 7) % codes.length]).join('');
  // Todos los códigos de terreno están en la muestra.
  for (const c of codes) assert.ok(terrain.includes(c), c);
  const full = fakeCtx();
  A.paint(full, g, terrain, 32);
  assert.ok(full.calls() > 500);
  const part = fakeCtx();
  A.paint(part, g, terrain, 32, { x0: 2, y0: 2, x1: 3, y1: 3 });
  assert.ok(part.calls() > 50 && part.calls() < full.calls());
});

test('arte del tablero: el mismo mapa da el mismo dibujo y solo se repinta lo que cambió', () => {
  assert.equal(A.hash(3, 9, 2), A.hash(3, 9, 2));
  assert.notEqual(A.hash(3, 9, 2), A.hash(9, 3, 2));
  for (let i = 0; i < 200; i++) assert.ok(A.hash(i, i * 3, i) >= 0 && A.hash(i, i * 3, i) < 1);
  const g = B.normGrid({ cols: 10, rows: 10 }),
    a = '.'.repeat(100),
    b = a.slice(0, 55) + 'w' + a.slice(56);
  assert.equal(A.changed(g, a, a.slice()), null);
  assert.deepEqual(A.changed(g, a, b), { x0: 3, y0: 3, x1: 7, y1: 7 });
  assert.deepEqual(A.changed(g, a, 'g'), { x0: 0, y0: 0, x1: 9, y1: 9 });
  // El lienzo nunca pasa de 3072 px de lado y las casillas no bajan de 12 px.
  assert.equal(A.tileFor(B.normGrid({ cols: 30, rows: 20 })), 64);
  assert.equal(A.tileFor(B.normGrid({ cols: 100, rows: 80 })), 30);
});

test('el arte del tablero se carga en las tres pantallas con mapa y queda disponible sin conexión', () => {
  const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  for (const f of ['index.html', 'dm.html', 'board.html']) {
    const h = read(f);
    assert.ok(h.indexOf('board-art.js') > h.indexOf('board-core.js'), f);
    assert.ok(h.indexOf('board-art.js') < h.indexOf('./board.js'), f);
  }
  assert.match(read('sw.js'), /'\.\/board-art\.js'/);
});
