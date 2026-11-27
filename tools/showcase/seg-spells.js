// Segmento 3: conjuros sobre el tablero (el DM lanza una bola de fuego y un relámpago).
const { chromium } = require('playwright');
const L = require('./lib.js');
module.exports = async function record(browser, base, out, shots = false) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    serviceWorkers: 'block',
    recordVideo: shots ? undefined : { dir: out, size: { width: 1280, height: 720 } },
  });
  const t0 = Date.now();
  const board = L.boardData('cave', 5, 'small', [
    { id: 't1', kind: 'pc', character_id: 'c1', name: 'Lyra', x: 4, y: 4 },
    { id: 't2', kind: 'pc', character_id: 'c2', name: 'Bram', x: 5, y: 6 },
    { id: 't3', kind: 'pc', character_id: 'c3', name: 'Sera', x: 3, y: 6 },
    { id: 't4', kind: 'pc', character_id: 'c4', name: 'Nim', x: 4, y: 8 },
    { id: 'm1', kind: 'monster', combatant_id: 'k2', name: 'Ogro', x: 10, y: 5, size: 2 },
    { id: 'm2', kind: 'monster', name: 'Goblin 1', x: 9, y: 3, stage: 'placed' },
    { id: 'm3', kind: 'monster', name: 'Goblin 2', x: 11, y: 4, stage: 'placed' },
    { id: 'm4', kind: 'monster', name: 'Goblin 3', x: 12, y: 7, stage: 'placed' },
  ]);
  await ctx.exposeFunction('recParty', () => L.party());
  await L.exposeBoard(ctx, board);
  const page = await ctx.newPage();
  await L.cursor(page);
  await L.stubCloud(page, 'dm');
  await page.goto(base + 'board.html#camp');
  await page.waitForFunction(() => window.Board?._state().mapId === 'map');
  await page.waitForTimeout(2500);
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
  // El combate ocupa la parte izquierda: a la derecha va el panel de efectos.
  await L.camera(page, [2, 1.5, 14.5, 10], { left: 20, top: 10, width: 880, height: 560 });
  await page.waitForTimeout(400);
  await page.mouse.move(700, 500);
  const start = Date.now();
  await page.waitForTimeout(500);
  await L.glide(page, '[data-action=bd-tool][data-tool=scene]');
  if (!(await page.waitForFunction(() => Board._state().tool === 'scene', null, { timeout: 800 }).catch(() => null)))
    await page.mouse.click(
      ...Object.values(
        await page
          .locator('[data-action=bd-tool][data-tool=scene]')
          .boundingBox()
          .then(b => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })),
      ),
    );
  await page.waitForTimeout(500);
  await L.glide(page, '[data-action=bd-spell][data-v=fire]');
  await page.waitForTimeout(400);
  if (shots) await page.screenshot({ path: __dirname + '/s3a.png' });
  await L.glide(page, await at(10.5, 4.6), { steps: 24 });
  await page.waitForTimeout(700);
  if (shots) await page.screenshot({ path: __dirname + '/s3b.png' });
  await page.waitForTimeout(1300);
  await L.glide(page, '[data-action=bd-spell][data-v=lightning]');
  await page.waitForTimeout(400);
  await L.glide(page, await at(12.5, 7.5), { steps: 20 });
  await page.waitForTimeout(500);
  if (shots) await page.screenshot({ path: __dirname + '/s3c.png' });
  await page.waitForTimeout(1500);
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
