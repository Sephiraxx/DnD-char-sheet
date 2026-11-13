// Recorridos en un navegador real para fallas que las pruebas de lógica no ven (auditoría del 8/11/2026).
// Uso: npm run browser   (necesita Playwright con Chromium: npm i --no-save playwright && npx playwright install chromium)
// Corre también en GitHub Actions, en el trabajo «browser» de .github/workflows/check.yml.
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
  '.woff2': 'font/woff2',
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
    // 6. Ninguna sección de la ficha se desborda de costado en un teléfono.
    for (const route of ['combat', 'spells', 'gear', 'character', 'traits', 'class', 'journal', 'table']) {
      await page.goto(base + 'index.html?abrir#' + route);
      await page.waitForFunction(() => document.getElementById('main')?.children.length > 0);
      await page.waitForTimeout(150);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      check(`Teléfono: «${route}» entra en 390 px`, width <= 391, 'mide ' + width);
    }

    // 7. Identidad visual: la clase tiñe la ficha y el jugador puede elegir otro color.
    await page.goto(base + 'index.html?abrir#character');
    await page.waitForSelector('#persona-card');
    check(
      'Tema: la ficha lleva el color de su clase',
      await page.evaluate(() => document.documentElement.dataset.cls === 'wizard'),
    );
    check(
      'Tema: la tipografía de títulos está disponible',
      await page.evaluate(() => document.fonts.load('600 20px Alegreya').then(f => f.length > 0)),
    );
    await page.click('[data-action="persona-color"]');
    await page.check('input[name="color"][value="#8cc474"]', { force: true });
    await page.click('#dialog-form button[type="submit"]');
    await page.waitForFunction(() => !document.querySelector('#modal')?.open);
    check(
      'Color de la ficha: se guarda y se aplica',
      await page.evaluate(
        () =>
          state.sheetColor === '#8cc474' && document.documentElement.style.getPropertyValue('--accent') === '#8cc474',
      ),
    );

    // 8. Tiradas: la tarjeta aparece y queda en el resultado.
    await page.evaluate(() => RollFX.show({ label: 'Prueba', total: 17, face: 14, detail: 'd20 (14) + 3' }));
    await page.waitForSelector('.roll-card.settled');
    check('Tiradas: la tarjeta muestra el total', (await page.textContent('.roll-card .roll-total')) === '17');
    const early = await page.evaluate(() => {
      void RollFX.show({ label: 'Ataque', total: 25, face: 20, detail: 'd20 (20) + 5', crit: true });
      const card = document.querySelector('.roll-card');
      const hidden = sel => getComputedStyle(card.querySelector(sel)).visibility === 'hidden';
      return (
        card.classList.contains('rolling') &&
        !card.classList.contains('crit') &&
        hidden('.roll-tag') &&
        hidden('.roll-detail')
      );
    });
    await page.waitForSelector('.roll-card.settled.crit');
    const late = await page.evaluate(
      () => getComputedStyle(document.querySelector('.roll-card .roll-tag')).visibility === 'visible',
    );
    check('Tiradas: el crítico y el detalle no se ven hasta que el dado cae', early && late);
    const shapes = await page.evaluate(() =>
      [4, 6, 8, 10, 12, 20, 100].map(die => {
        void RollFX.show({ label: 'd' + die, total: 2, face: 2, die });
        const icon = document.querySelector('.roll-card .roll-icon');
        return icon.dataset.die + ':' + icon.querySelector('svg').innerHTML.length;
      }),
    );
    const minis = await page.evaluate(() => {
      void RollFX.show({
        label: 'Daño',
        total: 21,
        face: '⚔',
        die: 8,
        dice: [
          { die: 8, v: 5 },
          { die: 8, v: 7 },
          { die: 6, v: 2 },
          { die: 6, v: 4 },
        ],
      });
      return [...document.querySelectorAll('.roll-card .roll-mini')].map(m => m.dataset.die).join(',');
    });
    await page.waitForSelector('.roll-card.settled');
    const miniValues = await page.evaluate(() =>
      [...document.querySelectorAll('.roll-card .roll-mini b')].map(b => b.textContent).join(','),
    );
    check('Tiradas: un daño con varios dados los muestra uno por uno', minis === '8,8,6,6' && miniValues === '5,7,2,4');
    await page.click('[data-sound-toggle]');
    const mutedNow = await page.evaluate(() => Sound.muted() && localStorage.getItem('dnd-sound') === 'off');
    await page.click('[data-sound-toggle]');
    await page.evaluate(() => Sound.ambient('tavern'));
    await page.waitForFunction(() => Sound.playing() === 'tavern', { timeout: 3000 }).catch(() => {});
    const ambientOn = await page.evaluate(() => Sound.playing());
    await page.evaluate(() => Sound.ambient(''));
    check(
      'Sonido: el interruptor se recuerda y el ambiente arranca y se apaga',
      mutedNow && ambientOn === 'tavern' && (await page.evaluate(() => !Sound.muted() && Sound.playing() === '')),
    );
    check(
      'Tiradas: cada dado tiene su forma (el d100 usa la del d10)',
      new Set(shapes.slice(0, 6)).size === 6 && shapes[6] === shapes[3],
    );

    // 9. Mapas: cada tipo del generador se dibuja completo, y las luces alumbran en la oscuridad.
    const maps = await page.evaluate(() => {
      const out = [];
      for (const [type] of BoardGen.TYPES) {
        const m = BoardGen.generate(type, { size: 'small', seed: 5 }),
          canvas = document.createElement('canvas'),
          tile = 16;
        canvas.width = m.cols * tile;
        canvas.height = m.rows * tile;
        const ctx = canvas.getContext('2d');
        BoardArt.paint(ctx, BoardCore.normGrid({ cols: m.cols, rows: m.rows }), m.terrain, tile);
        // Ningún píxel queda transparente: todo el mapa se pintó.
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let empty = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] === 0) empty++;
        if (empty) out.push(type + ': ' + empty + ' píxeles sin pintar');
      }
      return out;
    });
    check(`Mapas: los tipos del generador se dibujan`, !maps.length, maps.join(' | '));
    check(
      'Mapas: una antorcha a la vista se ve en la oscuridad',
      await page.evaluate(() => {
        const g = BoardCore.normGrid({ cols: 30, rows: 6 }),
          bits = BoardCore.sight(
            g,
            '.'.repeat(180),
            [],
            [{ x: 2.5, y: 3.5, range: 2 }],
            [{ x: 20.5, y: 3.5, range: 3 }],
          );
        return bits[3 * 30 + 20] === 1 && bits[3 * 30 + 10] === 0;
      }),
    );
    check(
      'Fichas del mapa: hay emblema para la clase y para las criaturas',
      await page.evaluate(() => Sigils.has('wizard') && Sigils.forName('Dragón rojo') === 'dragon'),
    );

    // 10. Pantalla del DM y catálogo: abren sin errores (sin cuenta, muestran su portada).
    for (const file of ['dm.html', 'compendium.html', 'board.html']) {
      await page.goto(base + file);
      await page.waitForLoadState('load');
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      check(`«${file}» abre y entra en 390 px`, width <= 391, 'mide ' + width);
    }
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
