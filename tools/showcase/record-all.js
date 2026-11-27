const { chromium } = require('playwright');
const L = require('./lib.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
// Uso: node tools/showcase/record-all.js && python3 tools/showcase/compose.py
// Graba los cuatro segmentos (creador, mesa en vivo, conjuros, luz) en una carpeta temporal.
(async () => {
  const server = await L.serve(),
    browser = await chromium.launch(),
    base = `http://127.0.0.1:${server.address().port}/`;
  const out = path.join(os.tmpdir(), 'showcase-segments');
  fs.rmSync(out, { recursive: true, force: true });
  const res = {};
  for (const name of ['creator', 'table', 'spells', 'light']) {
    const rec = require('./seg-' + name + '.js');
    res[name] = await rec(browser, base, out);
    console.log(name, res[name]);
  }
  fs.writeFileSync(path.join(out, 'segments.json'), JSON.stringify(res, null, 2));
  await browser.close();
  server.close();
})();
