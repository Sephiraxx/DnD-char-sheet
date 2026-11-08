// Recorridos en un navegador real para fallas que las pruebas de lógica no ven (auditoría del 8/11/2026).
// Uso: npm run browser   (necesita Playwright con Chromium: npm i -D playwright && npx playwright install chromium)
// Sirve la carpeta en un puerto libre, abre la app en un origen limpio y falla con código 1 si algo no anda.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok(server)));
}

const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/wizard-3.json'), 'utf8'));
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'ok  ' : 'FALLA'} ${name}${detail && !ok ? ' — ' + detail : ''}`);
};

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('Falta Playwright: npm i -D playwright && npx playwright install chromium');
    process.exit(2);
  }
  const server = await serve(),
    base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + 'index.html');
    // Una ficha guardada como lo haría la app.
    await page.evaluate(s => {
      const id = CharacterStorage.add(Rules.validate(s));
      localStorage.setItem('dnd-party-active-v1', id);
    }, fixture);
    // Otra dirección (con «?abrir») para que cargue de cero con la ficha activa.
    await page.goto(base + 'index.html?abrir#journal');
    await page.waitForSelector('#journal-notes');

    // 1. Notas: lo escrito sobrevive a cambiar de sección sin tocar nada.
    await page.fill('#journal-notes', 'El posadero se llama Bram y debe 30 po.');
    await page.goto(base + 'index.html?abrir#combat');
    await page.goto(base + 'index.html?abrir#journal');
    await page.waitForSelector('#journal-notes');
    check(
      'Diario: las notas siguen después de cambiar de sección',
      (await page.inputValue('#journal-notes')).includes('Bram'),
    );

    // 2. Notas: lo escrito sobrevive a recargar antes del guardado automático.
    await page.type('#journal-notes', ' Pista: la llave roja.');
    await page.reload();
    await page.waitForSelector('#journal-notes');
    check(
      'Diario: las notas siguen después de recargar',
      (await page.inputValue('#journal-notes')).includes('llave roja'),
    );
    await page.waitForTimeout(1800);
    await page.goto(base + 'index.html?abrir#combat');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(CharacterStorage.activeKey())).notes);
    check('Diario: las notas quedan guardadas en la ficha', saved.includes('llave roja'), saved);

    // 3. Crear personaje: el teclado queda dentro del asistente y vuelve al botón al salir.
    await page.goto(base + 'index.html?abrir#combat');
    await page.evaluate(() => Creator.start());
    await page.waitForSelector('#creator:not([hidden])');
    const inside = () => page.evaluate(() => document.getElementById('creator').contains(document.activeElement));
    check('Crear personaje: el foco empieza dentro', await inside());
    let escaped = false;
    for (let i = 0; i < 40 && !escaped; i++) {
      await page.keyboard.press('Tab');
      escaped = !(await inside());
    }
    check('Crear personaje: Tab no sale del asistente', !escaped);
    check(
      'Crear personaje: lo de atrás queda inerte',
      await page.evaluate(() => document.getElementById('main').closest('[inert]') !== null),
    );
    await page.keyboard.press('Escape');
    check(
      'Crear personaje: al salir, nada queda inerte',
      await page.evaluate(() => !document.querySelector('[data-overlay-inert]')),
    );

    // 4. Subir de nivel: misma pantalla superpuesta, mismas reglas de foco.
    await page.evaluate(() => LevelUp.start());
    await page.waitForSelector('#levelup:not([hidden])');
    check(
      'Subir de nivel: el foco empieza dentro',
      await page.evaluate(() => document.getElementById('levelup').contains(document.activeElement)),
    );
    await page.keyboard.press('Escape');
    check(
      'Subir de nivel: al salir, nada queda inerte',
      await page.evaluate(() => !document.querySelector('[data-overlay-inert]')),
    );

    // 5. Notas de clase: mismo guardado automático.
    await page.goto(base + 'index.html?abrir#class');
    await page.waitForSelector('#class-notes');
    await page.fill('#class-notes', 'Enemigo predilecto: no muertos.');
    await page.goto(base + 'index.html?abrir#combat');
    await page.goto(base + 'index.html?abrir#class');
    await page.waitForSelector('#class-notes');
    check(
      'Notas de clase: siguen después de cambiar de sección',
      (await page.inputValue('#class-notes')).includes('no muertos'),
    );
    check('Sin errores de JavaScript', !errors.length, errors.join(' | '));
  } finally {
    await browser.close();
    server.close();
  }
  const failed = checks.filter(c => !c.ok).length;
  console.log(`\n${checks.length - failed} de ${checks.length} recorridos bien.`);
  process.exit(failed ? 1 : 0);
}
main();
