// Segmento 4: luz dinámica desde la pantalla de un jugador (mapa a oscuras, antorcha, puerta).
const { chromium } = require('playwright');
const L = require('./lib.js');
module.exports = async function record(browser, base, out, shots = false) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    serviceWorkers: 'block',
    recordVideo: shots ? undefined : { dir: out, size: { width: 1280, height: 720 } },
  });
  const t0 = Date.now();
  const board = L.boardData(
    'dungeon',
    3,
    'small',
    [{ id: 't1', kind: 'pc', character_id: 'c1', name: 'Lyra', x: 12, y: 10 }],
    {
      grid: { vision: { los: true, dark: true, light: 40 } },
      terrain: {
        lights: [
          [3.5, 6, 30],
          [16.5, 6, 20],
        ],
      },
    },
  );
  // Lyra humana (sin visión en la oscuridad) y con una antorcha: lo de afuera de su luz queda negro.
  const base0 = L.party();
  const party = {
    ...base0,
    characters: base0.characters.map(c =>
      c.id === 'c1' ? { ...c, data: { ...c.data, race: 'Humano', raceId: '' } } : c,
    ),
    encounter: null,
    combatants: [],
    secrets: [],
    viewerIsDM: false,
  };
  await ctx.exposeFunction('recParty', () => party);
  await L.exposeBoard(ctx, board);
  const page = await ctx.newPage();
  await L.cursor(page);
  await L.stubCloud(page, 'p1');
  await page.goto(base + 'board.html#camp');
  await page.waitForFunction(() => window.Board?._state().mapId === 'map');
  await page.waitForTimeout(2000);
  // Más cerca, sobre el recorrido de Lyra, sin salirse del mapa (como encuadra la vista del jugador).
  await page.evaluate(() => {
    const S = Board._state(),
      c = Miniatures.boardCell,
      r = document.querySelector('#board').getBoundingClientRect(),
      s = 1.4;
    const w = S.grid.cols * c * s,
      h = S.grid.rows * c * s;
    S.view = {
      s,
      x: Math.min(0, Math.max(r.width - w, r.width / 2 - 8.5 * c * s)),
      y: Math.min(0, Math.max(r.height - h, r.height / 2 - 7.2 * c * s)),
    };
    S.touched = true;
    S.dirty = true;
  });
  await page.waitForTimeout(300);
  const at = (x, y) =>
    page.evaluate(
      ([x, y]) => {
        const S = Board._state(),
          r = document.querySelector('#board').getBoundingClientRect(),
          c = Miniatures.boardCell * S.view.s;
        return { x: r.left + S.view.x + x * c, y: r.top + S.view.y + y * c };
      },
      [x, y],
    );
  // La vista del jugador sigue a su ficha: se espera a que quede quieta antes de cada gesto.
  const settle = () =>
    page.evaluate(
      () =>
        new Promise(ok => {
          let last = '',
            same = 0;
          (function f() {
            const v = JSON.stringify(Board._state().view);
            same = v === last ? same + 1 : 0;
            last = v;
            same >= 6 ? ok() : requestAnimationFrame(f);
          })();
        }),
    );
  const drag = async (from, to, steps = 30) => {
    await page.keyboard.press('Escape');
    await settle();
    const a = await at(...from),
      b = await at(...to);
    await page.mouse.move(a.x, a.y, { steps: 12 });
    await page.waitForTimeout(150);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(450);
    await page.keyboard.press('Escape');
  };
  const tokenAt = (x, y) =>
    page
      .waitForFunction(
        ([x, y]) => {
          const t = Board._state().tokens.find(t => t.id === 't1');
          return t.x === x && t.y === y;
        },
        [x, y],
        { timeout: 3000 },
      )
      .catch(() => null);
  await settle();
  const a0 = await at(12.5, 10.5);
  await page.mouse.move(a0.x + 120, a0.y + 60);
  const start = Date.now();
  await page.waitForTimeout(700);
  await drag([12.5, 10.5], [9.5, 8.5]);
  await tokenAt(9, 8);
  await page.waitForTimeout(1000);
  await drag([9.5, 8.5], [9.5, 5.5], 26);
  await tokenAt(9, 5);
  await page.waitForTimeout(700);
  if (shots) await page.screenshot({ path: __dirname + '/s4a.png' });
  // Abre la puerta del oeste: la pantalla del DM la guarda y el mapa llega a todos.
  await page.keyboard.press('Escape');
  await settle();
  const door = await at(8.5, 5.5);
  await page.mouse.move(door.x, door.y, { steps: 14 });
  await page.waitForTimeout(250);
  await page.mouse.click(door.x, door.y);
  const m = board.maps[0],
    i = 5 * 20 + 8;
  m.terrain = { ...m.terrain, cells: m.terrain.cells.slice(0, i) + 'O' + m.terrain.cells.slice(i + 1) };
  await page.evaluate(row => window.boardChanged('maps', { eventType: 'UPDATE', new: row }), m);
  await page.waitForTimeout(1100);
  await drag([9.5, 5.5], [5.5, 6.5], 30);
  await tokenAt(5, 6);
  const away = await at(9, 9.5);
  await page.mouse.move(away.x, away.y, { steps: 12 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1300);
  if (shots) await page.screenshot({ path: __dirname + '/s4b.png' });
  const end = Date.now();
  const video = page.video();
  await ctx.close();
  return { file: video && (await video.path()), from: (start - t0) / 1000, to: (end - t0) / 1000 };
};
if (require.main === module)
  (async () => {
    const server = await L.serve(),
      browser = await chromium.launch();
    const r = await module.exports(
      browser,
      `http://127.0.0.1:${server.address().port}/`,
      __dirname + '/out',
      process.argv[2] === 'shots',
    );
    console.log(r);
    await browser.close();
    server.close();
  })();
