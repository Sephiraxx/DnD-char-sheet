// Segmento 2: la mesa en vivo desde la pantalla del DM (cambios que llegan de los jugadores).
const { chromium } = require('playwright');
const L = require('./lib.js');
module.exports = async function record(browser, base, out, shots = false) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    serviceWorkers: 'block',
    recordVideo: shots ? undefined : { dir: out, size: { width: 1280, height: 720 } },
  });
  const t0 = Date.now();
  let p = L.party();
  const feed = [];
  await ctx.exposeFunction('recParty', () => p);
  await ctx.exposeFunction('recEvents', () => feed.slice().reverse());
  const page = await ctx.newPage();
  await L.cursor(page);
  await L.stubCloud(page, 'dm');
  await page.goto(base + 'dm.html#camp');
  await page.getByText('GRIS42').first().waitFor();
  // La tarjeta de la biblioteca avisa que la mesa simulada no tiene servidor: no va en el video.
  await page.addStyleTag({ content: '.library-card{display:none!important}' });
  await page.waitForTimeout(1200);
  await page.mouse.move(900, 250);
  const start = Date.now();
  await page.waitForTimeout(900);
  // Baja hasta la party y la iniciativa.
  await page.evaluate(
    () =>
      new Promise(ok => {
        const y0 = scrollY,
          y1 = 505,
          t = performance.now();
        (function f(now) {
          const k = Math.min(1, (now - t) / 1100),
            e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
          scrollTo(0, y0 + (y1 - y0) * e);
          k < 1 ? requestAnimationFrame(f) : ok();
        })(t);
      }),
  );
  await page.waitForTimeout(600);
  const push = async (table, payload) => page.evaluate(([t, x]) => window.recChanged(t, x), [table, payload]);
  // Sera se cura: llega su ficha nueva y la tirada al registro.
  const sera = p.characters.find(c => c.id === 'c3');
  sera.data = { ...sera.data, hp: 15 };
  await push('characters', { eventType: 'UPDATE', new: sera });
  await page.waitForTimeout(900);
  // El ogro recibe daño y cambia el turno.
  p = {
    ...p,
    secrets: p.secrets.map(s => (s.combatant_id === 'k2' ? { ...s, hp: 9 } : s)),
    combatants: p.combatants.map(c => (c.id === 'k2' ? { ...c, status: 'a punto de caer' } : c)),
  };
  await push('resync', {});
  await page.waitForTimeout(900);
  const bram = p.characters.find(c => c.id === 'c2');
  bram.data = { ...bram.data, hp: 9 };
  await push('characters', { eventType: 'UPDATE', new: bram });
  await page.waitForTimeout(700);
  p = { ...p, encounter: { ...p.encounter, current_id: 'k4' } };
  await push('resync', {});
  await page.waitForTimeout(1300);
  if (shots) await page.screenshot({ path: __dirname + '/s2.png' });
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
