// Segmento 1: el creador de personajes, desde el inicio de la app.
const { chromium } = require('playwright');
const L = require('./lib.js');
module.exports = async function record(browser, base, out, shots = false) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    serviceWorkers: 'block',
    recordVideo: shots ? undefined : { dir: out, size: { width: 1280, height: 720 } },
  });
  const t0 = Date.now();
  const page = await ctx.newPage();
  await L.cursor(page);
  await page.addInitScript(() => localStorage.setItem('dnd-entered-v1', '1'));
  await page.goto(base + 'app.html');
  await page.waitForSelector('[data-action=party-create]');
  await page.mouse.move(640, 420);
  await page.waitForTimeout(700);
  const start = Date.now();
  await L.glide(page, '#home-characters [data-action=party-create]');
  await page.waitForSelector('[data-cr=class][data-id=wizard]');
  await page.waitForTimeout(700);
  await L.glide(page, '[data-cr=filter][data-v=magic]');
  await page.waitForTimeout(600);
  await L.glide(page, '[data-cr=class][data-id=wizard]');
  await page.waitForTimeout(900);
  if (shots) await page.screenshot({ path: __dirname + '/s1a.png' });
  await L.glide(page, page.getByRole('button', { name: 'Siguiente', exact: true }));
  await page.waitForTimeout(700);
  await page.locator('[data-cr=background][data-id=sage-PHB]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await L.glide(page, '[data-cr=background][data-id=sage-PHB]');
  await page.waitForTimeout(800);
  await L.glide(page, page.getByRole('button', { name: 'Siguiente', exact: true }));
  await page.waitForTimeout(700);
  await page.locator('[data-cr=family][data-id=Elfo]').scrollIntoViewIfNeeded();
  await L.glide(page, '[data-cr=family][data-id=Elfo]');
  await page.waitForTimeout(800);
  if (shots) await page.screenshot({ path: __dirname + '/s1b.png' });
  const variant = page.locator('[data-cr=race]').first();
  if (await variant.count()) {
    await L.glide(page, variant);
    await page.waitForTimeout(700);
  }
  await L.glide(page, page.getByRole('button', { name: 'Siguiente', exact: true }));
  await page.waitForTimeout(800);
  await L.glide(page, page.getByRole('button', { name: 'Tirar 4d6', exact: true }));
  await page.waitForTimeout(900);
  if (shots) await page.screenshot({ path: __dirname + '/s1c.png' });
  const roll = page
    .getByRole('button', { name: /^Tirar/ })
    .filter({ hasNotText: '4d6' })
    .first();
  if (await roll.count()) {
    await L.glide(page, roll);
    await page.waitForTimeout(1500);
  }
  if (shots) await page.screenshot({ path: __dirname + '/s1d.png' });
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
