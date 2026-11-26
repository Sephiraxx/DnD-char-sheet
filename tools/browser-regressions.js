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
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(ROOT, pathname === '/' ? '/index.html' : pathname);
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
    check('Inicio: el tablero no se carga junto con la ficha', await page.evaluate(() => !window.Board));
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const offline = () =>
      page.evaluate(async () => {
        const worker = await navigator.serviceWorker.ready;
        const scope = new URL(worker.scope);
        return Boolean(await caches.match(new URL('./official-monsters-data.js', scope)));
      });
    check('Sin conexión: el bestiario completo se descarga a pedido', !(await offline()));
    await page.click('#offline-download');
    await page.waitForFunction(() => document.getElementById('offline-status').textContent.includes('guardados'));
    check('Sin conexión: la descarga deja el bestiario guardado', await offline());
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

    await page.goto(base + 'index.html?abrir#gear');
    await page.getByRole('button', { name: 'Añadir del catálogo' }).click();
    const sermon = page.locator('#dialog-form [name=equipmentId] option[value=sermon]');
    const itemSearch = page.getByRole('searchbox', { name: 'Buscar objeto' });
    const keptPrivate = (await sermon.count()) === 0;
    await itemSearch.fill('Sermo');
    check('Equipo: el objeto oculto requiere su nombre completo', keptPrivate && (await sermon.count()) === 0);
    await itemSearch.fill('Sermon');
    await page.locator('#dialog-form').getByRole('button', { name: 'Guardar' }).click();
    await page.getByRole('button', { name: 'Sermon', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Sermon', exact: true }).waitFor();
    check(
      'Sermon: el efecto persiste con la ficha y solo cambia los d20 bajos',
      await page.evaluate(() => {
        const originalRandom = crypto.getRandomValues;
        const values = [0, 6, 1, 0, 19, 0, 0];
        crypto.getRandomValues = array => {
          array[0] = values.shift();
          return array;
        };
        try {
          const lower = characterD20(1);
          const upper = characterD20(13);
          const naturalHigh = characterD20(18);
          const form = new FormData();
          form.set('adv', 'dis');
          const result = RollUI.readD20(form);
          return (
            lower === 14 &&
            upper === 20 &&
            naturalHigh === 18 &&
            result.kept === 14 &&
            result.rolls.join() === '14,20' &&
            roll(8)[0] === 1 &&
            roll(20)[0] === 1
          );
        } finally {
          crypto.getRandomValues = originalRandom;
        }
      }),
    );
    await page.getByRole('button', { name: 'Restar Sermon' }).click();
    check('Sermon: al quitarlo se vuelve a tirar normalmente', (await page.evaluate(() => characterD20(1))) === 1);

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

    await page.getByRole('button', { name: 'Crear miniatura' }).click();
    await page.getByLabel('Raza de la miniatura').selectOption('minotaur');
    await page.getByLabel('Género').selectOption('woman');
    const height = page.getByRole('slider', { name: 'Altura (cm)', exact: true });
    await height.fill('218');
    await page.getByLabel('Mano principal').selectOption('hammer');
    await page.getByLabel('Mano secundaria').selectOption('shield');
    const miniSnapshot = () =>
      page.locator('#mini-preview').evaluate(async c => {
        await new Promise(requestAnimationFrame);
        return c.toDataURL();
      });
    const plainMini = await miniSnapshot();
    await page.getByLabel(/^Peinado/).selectOption('braid');
    await page.getByLabel(/^Cicatriz/).selectOption('claw');
    await page.getByLabel('Anteojos y parches').selectOption('round');
    await page.getByLabel(/^Cuello/).selectOption('pendant');
    await page.getByRole('button', { name: 'Usar atuendo encapuchado' }).click();
    const firstMini = await miniSnapshot();
    check(
      'Miniaturas: el atuendo cambia el dibujo y conserva cara y arma',
      firstMini !== plainMini &&
        (await page.getByLabel('Anteojos y parches').inputValue()) === 'round' &&
        (await page.getByLabel('Mano principal').inputValue()) === 'hammer' &&
        (await page.getByLabel('Mano secundaria').inputValue()) === 'shield',
    );
    const zoom = page.getByRole('button', { name: 'Acercar al rostro' });
    await zoom.click();
    check(
      'Miniaturas: acercamiento al rostro',
      firstMini !== (await miniSnapshot()) && (await zoom.getAttribute('aria-pressed')) === 'true',
    );
    await zoom.click();
    await page.locator('[name=facing]').focus();
    await page.locator('[name=facing]').press('End');
    check('Miniaturas: la vista previa gira en el editor', firstMini !== (await miniSnapshot()));
    await page.getByRole('button', { name: 'Guardar miniatura' }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Editar miniatura' }).click();
    check(
      'Miniaturas: raza, género, altura y arma siguen en la ficha tras recargar',
      (await page.getByLabel('Raza de la miniatura').inputValue()) === 'minotaur' &&
        (await page.getByLabel('Género').inputValue()) === 'woman' &&
        (await height.inputValue()) === '218' &&
        (await page.getByLabel('Mano principal').inputValue()) === 'hammer' &&
        (await page.getByLabel('Mano secundaria').inputValue()) === 'shield',
    );
    check(
      'Miniaturas: el vestuario, la cicatriz y el pelo se conservan tras recargar',
      await page
        .locator('#dialog-form')
        .evaluate(f =>
          ['cowl', 'vestments', 'pendant', 'round', 'claw', 'braid', '#242530'].every(
            (v, i) =>
              f.elements.namedItem(['headwear', 'outfit', 'neck', 'eyewear', 'scar', 'hair', 'headColor'][i]).value ===
              v,
          ),
        ),
    );
    check('Miniaturas: madera solo en forjados', !(await page.getByLabel('Madera', { exact: true }).isVisible()));
    await page.getByLabel('Raza de la miniatura').selectOption('warforged');
    for (const [label, color] of [
      ['Placas de hierro o acero', '#607880'],
      ['Madera', '#955331'],
    ])
      await page.getByLabel(label, { exact: true }).evaluate((input, value) => {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }, color);
    await page.getByLabel('Mano principal').selectOption('sword');
    const woodAndIron = await miniSnapshot();
    await page.getByLabel('Material del cuerpo').selectOption('iron');
    await page.getByLabel('Cables metálicos').fill('#9aa6aa');
    await page.getByLabel('Color de ojos').fill('#77ddff');
    check(
      'Miniaturas: el forjado puede cambiar a todo hierro',
      !(await page.getByLabel('Madera', { exact: true }).isVisible()) && (await miniSnapshot()) !== woodAndIron,
    );
    await page.getByRole('button', { name: 'Guardar miniatura' }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Editar miniatura' }).click();
    check(
      'Miniaturas: guarda el material, los cables y los ojos del forjado',
      (await page.getByLabel('Material del cuerpo').inputValue()) === 'iron' &&
        (await page.getByLabel('Placas de hierro o acero', { exact: true }).inputValue()) === '#607880' &&
        (await page.getByLabel('Cables metálicos').inputValue()) === '#9aa6aa' &&
        (await page.getByLabel('Color de ojos').inputValue()) === '#77ddff',
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: 'Quitar miniatura' }).click();
    await page.getByRole('button', { name: 'Crear miniatura' }).waitFor();
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
    await page.evaluate(() => {
      Cloud.enabled = false;
      TableUI.link = () => ({ campaignId: 'test-board' });
      const trigger = document.createElement('button');
      trigger.textContent = 'Abrir tablero de prueba';
      trigger.dataset.action = 'board-open';
      document.body.prepend(trigger);
    });
    await page.getByRole('button', { name: 'Abrir tablero de prueba' }).click();
    await page.waitForSelector('#board-embed:not([hidden])');
    check('El tablero se carga al abrirlo desde la ficha', await page.evaluate(() => Board.isOpen()));
    await page.evaluate(() => Board.close());
    // Lanzamiento real en una mesa simulada: pantalla → mapa → un espacio → una tirada y salvaciones.
    await page.evaluate(() => {
      window.castMessages = [];
      window.castEvents = [];
      state.extras.push('shatter');
      TableUI.link = () => ({ campaignId: 'mesa-conjuros', characterId: 'caster' });
      const monsters = ['inside', 'edge', 'outside', 'hidden'].map(id => ({ id, name: id, status: 'sano' }));
      TableUI.targets = () => ({ monsters, allies: [], selfId: 'caster' });
      TableUI.shareRoll = () => {};
      Object.assign(Cloud, {
        enabled: true,
        user: async () => ({ id: 'user' }),
        party: async () => ({
          campaign: { id: 'mesa-conjuros', dm_id: 'dm', name: 'Mesa' },
          characters: [],
          combatants: [],
          encounter: null,
        }),
        board: async () => ({
          board: { map_id: 'mapa' },
          maps: [{ id: 'mapa', name: 'Sala', grid: { cols: 11, rows: 11 }, fog: { on: false } }],
          tokens: [
            {
              id: 'caster-token',
              character_id: 'caster',
              map_id: 'mapa',
              kind: 'pc',
              name: 'Lanzador',
              x: 1,
              y: 5,
              size: 1,
            },
            ...monsters.map((m, i) => ({
              id: 'f-' + m.id,
              combatant_id: m.id,
              map_id: 'mapa',
              kind: 'monster',
              name: m.name,
              x: [5, 7, 8, 5][i],
              y: 5,
              size: 1,
              hidden: m.id === 'hidden',
            })),
          ],
        }),
        subscribeBoard: async () => ({ send: m => castMessages.push(m), close() {} }),
        spellZones: async () => [],
        post: async (c, kind, payload) => castEvents.push({ kind, payload }),
      });
      return BoardPlayer.openCast('shatter');
    });
    await page.waitForFunction(() => Board._state().mapId === 'mapa' && Board._state().channel);
    await page.locator('#board-casting .bc-aim').waitFor();
    const formula = await page.locator('#board-casting .bc-notes').innerText();
    const aim = await page.evaluate(() => {
      const rect = document.querySelector('#board').getBoundingClientRect();
      const { x, y, s } = Board._state().view;
      return { x: rect.left + x + 6 * Miniatures.boardCell * s, y: rect.top + y + 5 * Miniatures.boardCell * s };
    });
    await page.mouse.click(aim.x, aim.y);
    await page.locator('#board-casting [data-bc=confirm]').click();
    await page.locator('#board-casting .bc-result').waitFor();
    check(
      'Hacer añicos: un espacio, una onda de trueno y solo criaturas visibles dentro del radio',
      /3d8/.test(formula) &&
        (await page.evaluate(() => {
          const cast = castMessages[0]?.cast;
          return (
            state.slotsSpent[1] === 1 &&
            castMessages.length === 1 &&
            castMessages[0].t === 'spell-fx' &&
            cast.id === 'shatter' &&
            cast.element === 'trueno' &&
            cast.area.feet === 10 &&
            [...cast.targets].sort().join(',') === 'f-edge,f-inside'
          );
        })),
    );
    await page.waitForFunction(() => castEvents.some(e => e.kind === 'creature-save'));
    check(
      'Hacer añicos: la mesa recibe una misma tirada para ambas salvaciones de Constitución',
      await page.evaluate(() => {
        const q = castEvents.find(e => e.kind === 'creature-save').payload;
        return (
          q.types === 'trueno' &&
          q.ability === 'con' &&
          q.half &&
          q.targets.length === 2 &&
          q.damage >= 3 &&
          q.damage <= 24 &&
          castMessages.length === 1
        );
      }),
    );
    await page.evaluate(() => {
      document.getElementById('modal').close();
      Board.close();
      state.extras.push('cure');
      TableUI.targets = () => ({ monsters: [], allies: [{ characterId: 'ally', name: 'Aliada' }], selfId: 'caster' });
      TableUI.sendTo = async (id, kind, payload) => castEvents.push({ id, kind, payload });
      Cloud.broadcastSpellTargets = async (campaign, kinds, targets) => castMessages.push({ campaign, kinds, targets });
      cast('cure');
    });
    await page.getByRole('button', { name: 'Registrar lanzamiento' }).click();
    await page.locator('[name=who][value=self]').uncheck();
    await page.locator('[name=who][value="pc:ally"]').check();
    await page.getByRole('button', { name: 'Tirar curación', exact: true }).click();
    await page.waitForFunction(() => castEvents.some(e => e.kind === 'heal'));
    check(
      'Curar heridas: desde la ficha se cura y se ilumina al mismo aliado en el tablero',
      await page.evaluate(() => {
        const [msg] = castMessages.slice(1);
        return (
          castMessages.length === 2 &&
          msg.kinds.join(',') === 'heal' &&
          msg.targets.length === 1 &&
          msg.targets[0].character === 'ally' &&
          castEvents.find(e => e.kind === 'heal').id === 'ally' &&
          state.slotsSpent[0] === 1
        );
      }),
    );
    await page.evaluate(() => document.getElementById('modal').close());
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

    check(
      'Muebles: todas las piezas se dibujan y una taberna generada sale amueblada y con pisos',
      await page.evaluate(() => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 96;
        const c = cv.getContext('2d');
        const drawn = BoardProps.CATALOG.every(p => {
          c.clearRect(0, 0, 96, 96);
          BoardProps.drawOne(c, 32, [0, 0, p.id, 1]);
          return c.getImageData(0, 0, 96, 96).data.some(v => v);
        });
        const t = BoardGen.generate('tavern', { seed: 3, floors: 3, cellar: true });
        return drawn && t.floors.length === 4 && t.props.length > 25 && t.floors.every(f => f.props.length > 5);
      }),
    );

    // Círculo de las Esporas: la tarjeta aparece en combate y la Entidad simbiótica se activa.
    await page.goto(base + 'index.html?abrir#combat');
    await page.waitForFunction(() => typeof Spores !== 'undefined' && typeof commit === 'function');
    const spores = await page.evaluate(() => {
      const d = Rules.validate({
        ...Rules.initial(),
        classId: 'druid',
        level: 10,
        classSubclass: 'druid-circle-of-spores',
        name: 'Mirra',
      });
      d.hp = Rules.stats(d).maxHP;
      d.classSpent = { 'wild-shape': 0 };
      const before = JSON.stringify(state);
      commit('prueba', st => {
        for (const k of Object.keys(st)) delete st[k];
        Object.assign(st, Rules.validate(d));
      });
      const idle = document.querySelector('.spores h2')?.textContent;
      commit('prueba', st => Spores.start(st));
      const out = [idle, document.querySelector('.spores h2')?.textContent, state.temp, state.classSpent['wild-shape']];
      commit('prueba', st => {
        for (const k of Object.keys(st)) delete st[k];
        Object.assign(st, JSON.parse(before));
      });
      return out.join('|');
    });
    check(
      'Esporas: la Entidad simbiótica se activa desde la ficha',
      spores === 'Esporas|Entidad simbiótica activa|40|1',
    );

    // 10. Pantalla del DM y catálogo: abren sin errores (sin cuenta, muestran su portada).
    for (const file of ['dm.html', 'compendium.html', 'board.html']) {
      await page.goto(base + file);
      await page.waitForLoadState('load');
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      check(`«${file}» abre y entra en 390 px`, width <= 391, 'mide ' + width);
    }
    await page.goto(base + 'recover.html');
    await page.waitForFunction(() => document.getElementById('recovery-status').textContent.includes('no es válido'));
    check(
      'Recuperación: un enlace sin token no abre el formulario',
      !(await page.locator('#recovery-form').isVisible()),
    );
    // Flujo de aliado en la pantalla del DM, con las escrituras del servidor simuladas.
    const dm = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      serviceWorkers: 'block',
    });
    dm.on('pageerror', e => errors.push(e.message));
    await dm.route('**/config.js', route =>
      route.fulfill({ contentType: 'application/javascript', body: 'window.CLOUD_CONFIG = {};' }),
    );
    await dm.goto(base + 'dm.html');
    const drafts = new Map();
    const boards = new Map();
    const readDrafts = id => Array.from(drafts.get(id)?.values() || []);
    const readBoard = id => boards.get(id) || { board: null, maps: [], tokens: [] };
    await dm.exposeFunction('readDrafts', readDrafts);
    await dm.exposeFunction('saveDraft', (id, key, data, revision) => {
      if (!drafts.has(id)) drafts.set(id, new Map());
      const list = drafts.get(id);
      if (revision !== null && list.get(key)?.revision !== revision) return null;
      const saved = { data, revision: (revision || 0) + 1 };
      if (data) list.set(key, saved);
      else list.delete(key);
      return saved;
    });
    await dm.exposeFunction('readBoard', readBoard);
    await dm.exposeFunction('saveMap', (id, row, key) => {
      if (!boards.has(id)) boards.set(id, readBoard(id));
      const board = boards.get(id);
      const prior = board.maps.find(m => m.id === key);
      const saved = { ...prior, ...row, id: key || 'map-' + (board.maps.length + 1) };
      board.maps = [...board.maps.filter(m => m.id !== saved.id), saved];
      return saved;
    });
    await dm.exposeFunction('setMap', (id, map_id) => (boards.get(id).board = { campaign_id: id, map_id }));
    const playerId = await dm.evaluate(async saved => {
      const id = CharacterStorage.add(Rules.validate(saved));
      localStorage.setItem('dnd-party-active-v1', id);
      const campaign = { id: crypto.randomUUID(), name: 'Prueba', code: 'ALLY', dm_id: 'dm', settings: {} };
      const snapshot = { campaign, members: [], characters: [], combatants: [], secrets: [], loot: [], homebrew: [] };
      Cloud.enabled = true;
      Cloud.party = async () => snapshot;
      Cloud.events = async () => [];
      Cloud.post = async () => ({});
      Cloud.preparedEncounters = window.readDrafts;
      Cloud.savePreparedEncounter = window.saveDraft;
      Cloud.createFriendlyNpc = async (table, data) => {
        const row = { id: crypto.randomUUID(), owner_id: table.dm_id, name: data.name, data, updated_at: '2026-01-01' };
        snapshot.characters.push(row);
        return row;
      };
      Cloud.addCombatant = async (campaignId, data) => snapshot.combatants.push({ ...data, campaign_id: campaignId });
      current = campaign.id;
      party = snapshot;
      await Encounters.sync();
      draw();
      return id;
    }, fixture);
    await dm.getByRole('button', { name: 'Nuevo aliado' }).click();
    await dm.locator('#dialog-form [name=name]').fill('Tizne');
    await dm.locator('#dialog-form [name=class]').selectOption('wizard');
    await dm.locator('#dialog-form [name=level]').fill('3');
    await dm.locator('#dialog-form [name=race]').selectOption('kobold-base-MPMM');
    await dm.locator('#dialog-form [name=spell-add]').selectOption('magic-missile');
    await dm.getByRole('button', { name: 'Crear aliado' }).click();
    await dm.getByRole('button', { name: 'Sumar a iniciativa' }).click();
    check(
      'PNJ aliado: la iniciativa lo incorpora como objetivo amigo',
      await dm.evaluate(() => {
        const npc = party.characters[0],
          entry = party.combatants[0];
        return entry?.kind === 'pc' && entry.character_id === npc.id && npc.data.prepared.includes('magic-missile');
      }),
    );
    await dm.locator('.dm-ally-row [data-action=npc-control]').click();
    const npc = dm.frameLocator('#dm-ally-control iframe');
    await npc.locator('#active-character-name').filter({ hasText: 'Tizne' }).waitFor();
    check(
      'PNJ aliado: el DM controla la ficha sin cambiar de personaje activo',
      await npc.locator('body').evaluate((body, player) => {
        const sheet = JSON.parse(localStorage.getItem(CharacterStorage.activeKey()));
        return (
          body.classList.contains('dm-ally-sheet') &&
          sheet.friendlyNpc &&
          localStorage.getItem('dnd-party-active-v1') === player
        );
      }, playerId),
    );
    await dm.getByRole('button', { name: 'Cerrar ficha de aliado' }).click();
    const representative = await dm.evaluate(saved => {
      const player = { id: crypto.randomUUID(), owner_id: 'jugador', name: 'Lyra', data: { ...saved, name: 'Lyra' } };
      party.characters.push(player);
      party.combatants.push({
        id: player.id,
        character_id: player.id,
        kind: 'pc',
        name: player.name,
        init: null,
        tiebreak: 2,
      });
      for (const name of ['Guardia', 'Lobo'])
        party.combatants.push({ id: crypto.randomUUID(), kind: 'monster', name, init: 15, tiebreak: 1 });
      Cloud.post = async (campaignId, kind, payload, options) => ({
        id: 9001,
        kind,
        payload,
        target_character: options.target,
      });
      Cloud.setInitiativeOrder = async (campaignId, mode, ids) => {
        for (const row of party.combatants) row.turn_priority = ids.indexOf(row.id);
        party.encounter = { initiative_mode: mode };
      };
      draw();
      return player.id;
    }, fixture);
    await dm.getByRole('button', { name: 'Modo de iniciativa' }).click();
    await dm.locator('#dialog-form [name=mode]').selectOption('alternating');
    await dm.locator('#dialog-form [name=roller]').selectOption(representative);
    await dm.getByRole('button', { name: 'Pedir tirada al representante' }).click();
    check(
      'Iniciativa alternada: el pedido se envía al representante',
      await dm.evaluate(id => feed.find(e => e.id === 9001)?.target_character === id, representative),
    );
    await dm.evaluate(
      id =>
        onChange('events', {
          eventType: 'INSERT',
          new: {
            id: 9002,
            kind: 'roll-response',
            author_id: 'jugador',
            payload: {
              requestId: 9001,
              characterId: id,
              character: 'Lyra',
              label: 'Iniciativa de la party',
              total: 19,
            },
          },
        }),
      representative,
    );
    await dm.locator('#dialog-form [name=dm-total]').fill('10');
    await dm.getByRole('button', { name: 'Subir Lyra' }).click();
    const preview = await dm.locator('[data-init-preview]').textContent();
    await dm.getByRole('button', { name: 'Guardar iniciativa' }).click();
    await dm.waitForFunction(() => party.encounter?.initiative_mode === 'alternating');
    check(
      'Iniciativa alternada: guarda el orden que vio el DM',
      preview ===
        (await dm.evaluate(() =>
          tracker()
            .entries.map(e => e.name)
            .join(' → '),
        )) && preview.startsWith('Lyra →'),
      preview,
    );
    await dm.evaluate(() => {
      party.viewerIsDM = true;
      party.enemyNpcs = [];
      Cloud.createEnemyNpc = async (table, data) => {
        const row = { id: crypto.randomUUID(), owner_id: table.dm_id, name: data.name, data, updated_at: '2026-01-01' };
        party.enemyNpcs.push(row);
        return row.id;
      };
      Cloud.addEnemyNpcToInitiative = async (id, init, hidden) => {
        const row = party.enemyNpcs.find(e => e.id === id);
        party.combatants.push({ id, character_id: id, kind: 'monster', name: row.name, init, hidden, status: 'ileso' });
      };
    });
    await dm.getByRole('button', { name: 'Nuevo enemigo' }).click();
    await dm.locator('#dialog-form [name=name]').fill('Varka');
    await dm.locator('#dialog-form [name=class]').selectOption('wizard');
    await dm.locator('#dialog-form [name=level]').fill('3');
    await dm.locator('#dialog-form [name=race]').selectOption('kobold-base-MPMM');
    await dm.locator('#dialog-form [name=spell-add]').selectOption('magic-missile');
    await dm.getByRole('button', { name: 'Crear enemigo' }).click();
    const enemyCard = dm.locator('.dm-ally-row').filter({ hasText: 'Varka' });
    await enemyCard.getByRole('button', { name: 'Sumar a iniciativa' }).click();
    await dm.getByLabel('Ocultar al enemigo hasta revelarlo').check();
    await dm.getByRole('button', { name: 'Sumar', exact: true }).click();
    await dm.waitForFunction(() => party.combatants.some(e => e.kind === 'monster'));
    check(
      'PNJ enemigo: se guarda separado de la party y entra oculto como criatura',
      await dm.evaluate(() => {
        const row = party.enemyNpcs[0];
        const entry = party.combatants.find(c => c.character_id === row.id);
        return (
          row.data.enemyNpc && entry.kind === 'monster' && entry.hidden && !party.characters.some(c => c.id === row.id)
        );
      }),
    );
    await enemyCard.getByRole('button', { name: 'Controlar' }).click();
    await npc.locator('#active-character-name').filter({ hasText: 'Varka' }).waitFor();
    const snapshot = await dm.evaluate(() => party);
    await npc.locator('body').evaluate((body, data) => {
      Cloud.enabled = true;
      Cloud.reconcile = async () => ({ action: 'none' });
      Cloud.party = async () => data;
      Cloud.events = async () => [];
      Cloud.pendingCommands = async () => [];
      Cloud.subscribe = async () => () => {};
      window.npcTestEvents = [];
      Cloud.post = async (campaign, kind, payload, opts) => {
        window.npcTestEvents.push({ kind, payload, opts });
        return { id: window.npcTestEvents.length };
      };
      TableUI.boot();
    }, snapshot);
    await npc.locator('body').evaluate(async () => {
      for (let i = 0; i < 12 && !TableUI.targets().monsters.some(x => x.player); i++)
        await new Promise(resolve => setTimeout(resolve, 50));
    });
    check(
      'PNJ enemigo: puede atacar a un aliado de la party y enviarle daño',
      await npc.locator('body').evaluate(async () => {
        const target = TableUI.targets().monsters.find(x => x.name === 'Tizne' && x.player);
        if (!target || !Classes.usable(state).includes('magic-missile')) return false;
        const result = await TableUI.resolveTarget(target.id, 25, 20, 'Ataque de prueba');
        await TableUI.damageTarget(target.id, 6, 'Daño de prueba', { crit: true, type: 'fire' });
        return (
          result.hit &&
          window.npcTestEvents.some(
            e =>
              e.kind === 'damage' && e.opts.target === target.id && e.payload.amount === 6 && e.payload.crit === true,
          )
        );
      }),
    );
    await dm.getByRole('button', { name: 'Cerrar ficha de aliado' }).click();
    await dm.getByRole('button', { name: 'Preparar encuentro' }).click();
    await dm.locator('#dialog-form [name=name]').fill('La emboscada');
    await dm.getByRole('button', { name: 'Crear', exact: true }).click();
    await dm.getByRole('button', { name: 'PNJ guardados' }).click();
    await dm.getByLabel('Tizne · aliado').check();
    await dm.getByLabel('Varka · enemigo').check();
    await dm.locator('#dialog-form').getByRole('button', { name: 'Agregar', exact: true }).click();
    await dm.waitForFunction(() => Encounters.list()[0]?.monsters.length === 2);
    check(
      'Encuentros preparados: reutilizan las fichas aliada y enemiga',
      await dm.evaluate(() => {
        const [encounter] = Encounters.list();
        return (
          encounter.monsters.length === 2 &&
          encounter.monsters[0].npcId === party.characters.find(c => c.name === 'Tizne').id &&
          encounter.monsters[1].npcId === party.enemyNpcs[0].id
        );
      }),
    );
    await dm.evaluate(() => {
      const waiting = { ...party.characters.find(c => c.name === 'Tizne'), id: crypto.randomUUID(), name: 'Yara' };
      party.characters.push(waiting);
      party.campaign.settings.session = { n: 1, start: new Date().toISOString() };
      Cloud.updateSettings = async (id, value) => value;
      window.sessionPosts = [];
      Cloud.post = async (id, kind, payload, options) => {
        const event = { id: 9100 + window.sessionPosts.length, kind, payload, target_character: options?.target };
        window.sessionPosts.push(event);
        return event;
      };
      draw();
    });
    await dm.getByRole('button', { name: 'Terminar sesión' }).click();
    check(
      'Reparto de PX: marca a la party activa y deja fuera los aliados en reserva',
      (await dm.getByLabel('Lyra', { exact: true }).isChecked()) &&
        (await dm.getByLabel('Tizne', { exact: true }).isChecked()) &&
        !(await dm.getByLabel('Yara', { exact: true }).isChecked()),
    );
    await dm.getByLabel('Tizne', { exact: true }).uncheck();
    await dm.locator('#dialog-form [name=xp]').fill('30');
    await dm.locator('#dialog-form').getByRole('button', { name: 'Terminar sesión' }).click();
    await dm.waitForFunction(() => window.sessionPosts.some(e => e.kind === 'session-end'));
    check(
      'Reparto de PX: el DM puede quitar a un aliado y otorgar PX solo a la ficha elegida',
      await dm.evaluate(id => {
        const xp = window.sessionPosts.filter(e => e.kind === 'xp');
        const summary = window.sessionPosts.find(e => e.kind === 'session-end');
        return (
          xp.length === 1 &&
          xp[0].target_character === id &&
          xp[0].payload.amount === 30 &&
          summary.payload.recipients.join() === id
        );
      }, representative),
    );
    await dm.evaluate(() => {
      Cloud.stagedTokens = async () => {
        const [encounter] = Encounters.list();
        return encounter.monsters.map(row => ({ map_id: 'map', stage: 'enc:' + encounter.id + ':' + row.uid }));
      };
      Cloud.linkStaged = async (id, links) => (window.stagedNpcLinks = links);
      Cloud.board = async () => ({ maps: [{ id: 'map', name: 'Bosque' }], board: { map_id: 'map' } });
    });
    await dm.getByRole('button', { name: '¡Lanzar!', exact: true }).click();
    await dm.waitForFunction(() => Encounters.list()[0]?.launched);
    check(
      'Encuentros preparados: lanzar reutiliza las entradas de iniciativa y enlaza las posiciones de ambos PNJ',
      await dm.evaluate(() => {
        const links = window.stagedNpcLinks;
        return (
          links.length === 2 &&
          links.every(link => {
            const entries = party.combatants.filter(c => c.character_id === link.npcId);
            return entries.length === 1 && entries[0].id === link.combatantId;
          })
        );
      }),
    );
    await dm.evaluate(() => {
      Cloud.user = async () => ({ id: 'dm' });
      Cloud.board = window.readBoard;
      Cloud.subscribeBoard = async () => ({ send() {}, close() {} });
      Cloud.addTokens = async () => [];
      Cloud.saveMap = window.saveMap;
      Cloud.setBoardMap = window.setMap;
    });
    await dm.getByRole('button', { name: 'Tablero', exact: true }).click();
    await dm.locator('[data-action=bd-maps]').click();
    await dm.getByRole('button', { name: '+ Nuevo mapa' }).click();
    await dm.getByLabel('En blanco, para pintar el terreno').check();
    await dm.locator('#dialog-form [name=name]').fill('Mapa entre dispositivos');
    await dm.getByRole('button', { name: 'Crear mapa', exact: true }).click();
    await dm.waitForFunction(() => Board._state().board?.map_id);
    await dm.evaluate(() => {
      let failed = false;
      Cloud.saveMap = async (...args) => {
        if (!failed) {
          failed = true;
          throw Error('Corte de conexión de prueba');
        }
        return window.saveMap(...args);
      };
    });
    await dm.locator('[data-action=bd-tool][data-tool=fog]').click();
    await dm.getByLabel('Niebla activa').check();
    await dm.getByText('Cambios del mapa pendientes:', { exact: false }).waitFor();
    await dm.evaluate(() => dispatchEvent(new Event('online')));
    await dm.waitForFunction(
      () => Board._state().maps[0]?.fog?.on === true && !Object.keys(Board._state().pending).length,
    );
    const sharedParty = await dm.evaluate(() => party);

    const device = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    device.on('pageerror', e => errors.push(e.message));
    await device.exposeFunction('readDrafts', readDrafts);
    await device.exposeFunction('readBoard', readBoard);
    await device.route('**/config.js', route =>
      route.fulfill({ contentType: 'application/javascript', body: 'window.CLOUD_CONFIG = {};' }),
    );
    await device.goto(base + 'dm.html');
    await device.evaluate(async snapshot => {
      Cloud.enabled = true;
      Cloud.party = async () => snapshot;
      Cloud.user = async () => ({ id: 'dm' });
      Cloud.events = async () => [];
      Cloud.subscribe = async () => () => {};
      Cloud.subscribeBoard = async () => ({ send() {}, close() {} });
      Cloud.addTokens = async () => [];
      Cloud.applyUnloadedEnemyDamage = async () => false;
      Cloud.preparedEncounters = window.readDrafts;
      Cloud.board = window.readBoard;
      await open(snapshot.campaign.id);
    }, sharedParty);
    await device.locator('.prepared-head').filter({ hasText: 'La emboscada' }).waitFor();
    check(
      'Otro dispositivo: carga el encuentro preparado y sus dos PNJ desde la mesa',
      await device.evaluate(() => Encounters.list()[0]?.monsters.length === 2),
    );
    await device.getByRole('button', { name: 'Tablero', exact: true }).click();
    await device.locator('.board-title b').filter({ hasText: 'Mapa entre dispositivos' }).waitFor();
    check(
      'Otro dispositivo: abre el mapa creado por el DM sin copiar datos del navegador',
      await device.evaluate(() => Board._state().maps.some(m => m.name === 'Mapa entre dispositivos')),
    );
    check(
      'Otro dispositivo: recibe la niebla guardada tras recuperar la conexión',
      await device.evaluate(() => Board._state().fogOn),
    );
    await device.getByRole('button', { name: 'Cerrar el tablero' }).click();
    await device.setViewportSize({ width: 1440, height: 900 });
    const screenLink = device.getByRole('link', { name: 'Pantalla para jugadores' });
    const displayParty = structuredClone(sharedParty);
    displayParty.campaign.settings.calendar = { year: 930, day: 3, time: '21:45' };
    displayParty.combatants = [
      { id: 'ally', name: 'Lyra', init: 12 },
      { id: 'hidden', name: 'Acechador secreto', hidden: true, init: 20 },
    ];
    displayParty.encounter = { active: true, current_id: 'ally', round: 2 };
    let displayBoard = structuredClone(readBoard(sharedParty.campaign.id));
    await device.context().exposeFunction('displayParty', () => displayParty);
    await device.context().exposeFunction('displayBoard', () => displayBoard);
    await device.context().route('**/cloud.js', route =>
      route.fulfill({
        contentType: 'application/javascript',
        body:
          fs.readFileSync(path.join(ROOT, 'cloud.js'), 'utf8') +
          `
        Object.assign(Cloud, {
          enabled: true, user: async () => ({id: 'dm'}), party: displayParty, board: displayBoard,
          subscribe: async (_, handler) => { window.partyChanged = handler; },
          subscribeBoard: async (_, handler, receive) => { window.boardChanged = handler; window.boardMessage = receive; return {close() {}}; }
        });`,
      }),
    );
    const opened = device.waitForEvent('popup');
    await screenLink.click();
    const display = await opened;
    display.on('pageerror', e => errors.push(e.message));
    await display.locator('#player-screen-party time').filter({ hasText: '21:45' }).waitFor();
    await display.locator('.screen-clock [aria-label="Noche"]').waitFor();
    await display.waitForFunction(() => Board._state().fogOn && !!window.boardChanged);
    check(
      'Pantalla para jugadores: la pestaña independiente mantiene la niebla y oculta las herramientas',
      (await display.title()) === 'Pantalla para jugadores' &&
        (await device.title()) !== (await display.title()) &&
        (await display.locator('#board-tools button').count()) === 0 &&
        !(await display.evaluate(() => Board._state().isDM)),
    );
    // La pantalla del DM en el teléfono transmite al receptor real del tablero público.
    await dm.exposeFunction('sendSceneMessage', msg => display.evaluate(m => window.boardMessage(m), msg));
    await dm.evaluate(() => {
      Board._state().channel.send = window.sendSceneMessage;
    });
    await dm.locator('[data-tool=scene]').tap();
    await dm.getByRole('button', { name: 'Tormenta', exact: true }).tap();
    await dm.waitForFunction(
      () =>
        Board._state().maps.find(m => m.id === Board._state().mapId)?.grid.weather === 'storm' &&
        !Object.keys(Board._state().pending).length,
    );
    displayBoard = structuredClone(readBoard(sharedParty.campaign.id));
    const liveMap = displayBoard.maps.find(m => m.id === displayBoard.board.map_id);
    await display.evaluate(row => window.boardChanged('maps', { eventType: 'UPDATE', new: row }), liveMap);
    await display.waitForFunction(() => Board._state().grid.weather === 'storm');
    check(
      'Efectos: la tormenta elegida en el teléfono se guarda por mapa y llega a la pantalla',
      liveMap.grid.weather === 'storm',
    );
    await dm.getByRole('button', { name: 'Relámpago', exact: true }).tap();
    await dm.getByRole('button', { name: 'Plegar opciones', exact: true }).tap();
    // La casilla central está cubierta. El mismo toque solo aparece al revelarla.
    const target = dm.locator('#board');
    await target.tap();
    await dm.waitForFunction(() => Board._state().casts.some(c => c.kind === 'lightning'));
    check(
      'Efectos: un impacto dentro de la niebla queda oculto',
      await display.evaluate(() => Board._state().casts.length === 0),
    );
    await display.evaluate(
      row => window.boardChanged('maps', { eventType: 'UPDATE', new: { ...row, fog: { on: false } } }),
      liveMap,
    );
    await target.tap();
    await display.waitForFunction(() => Board._state().casts.some(c => c.kind === 'lightning'));
    await display.evaluate(() => window.boardMessage({ t: 'spell', map: 'mapa-privado', kind: 'heal', x: 1, y: 1 }));
    check(
      'Efectos: un toque llega a la casilla del otro dispositivo y un mapa privado queda aislado',
      await display.evaluate(() => Board._state().casts.every(c => c.kind === 'lightning')),
    );
    await display.waitForFunction(() => Board._state().casts.length === 0);
    const overlays = display.locator('#player-screen-party');
    check(
      'Pantalla para jugadores: muestra fecha, PG e iniciativa con inicial y nombre, sin revelar criaturas ocultas',
      (await overlays.innerText()).includes('4 de Mes 1, año 930') &&
        (await overlays.locator('.screen-initiative li').allTextContents()).join(',') === 'LLyra' &&
        (await overlays.locator('meter').count()) > 0 &&
        (await overlays.locator('[aria-current]').innerText()).includes('Lyra') &&
        !(await overlays.innerText()).includes('Acechador secreto'),
    );
    check(
      'Pantalla para jugadores: el mapa ocupa todo el ancho con reloj, party e iniciativa superpuestos',
      await display.evaluate(() => {
        const rect = sel => document.querySelector(sel).getBoundingClientRect();
        const map = rect('#board'),
          clock = rect('.screen-clock'),
          party = rect('.screen-roster'),
          turns = rect('.screen-initiative');
        return (
          Math.abs(map.width - document.documentElement.clientWidth) <= 1 &&
          clock.left - map.left < 32 &&
          clock.top - map.top < 32 &&
          getComputedStyle(document.querySelector('.screen-clock')).backgroundColor === 'rgba(0, 0, 0, 0)' &&
          map.bottom - party.bottom < 32 &&
          Math.abs((party.left + party.right - map.left - map.right) / 2) < 2 &&
          map.right - turns.right < 32 &&
          turns.bottom <= party.top &&
          turns.top >= clock.bottom
        );
      }),
    );
    await device.evaluate(cal => {
      party.campaign.settings.calendar = cal;
      Cloud.updateSettings = async (_, settings) => Cloud.cleanSettings(settings);
      draw();
    }, displayParty.campaign.settings.calendar);
    await device.getByRole('button', { name: 'Cambiar hora' }).click();
    await device.getByLabel('Hora', { exact: true }).fill('06:00');
    // El servidor simulado devuelve la hora guardada cuando la otra pestaña recibe el aviso.
    displayParty.campaign.settings.calendar.time = '06:00';
    await device.getByRole('button', { name: 'Guardar', exact: true }).click();
    await overlays.locator('time').filter({ hasText: '06:00' }).waitFor();
    check(
      'Reloj del mundo: al pasar de noche a día aparece el sol',
      await overlays.locator('.clock-sky.day').isVisible(),
    );
    const hero = displayParty.characters.find(c => c.id === representative);
    hero.data.miniature = {
      race: 'owlin',
      offhand: 'book',
      gear: 'lute',
      height: 182,
      headwear: 'cowl',
      neck: 'skull',
      scar: 'claw',
    };
    await display.evaluate(
      ({ character, map }) => {
        const pack = Miniatures.boardPack;
        Miniatures.boardPack = model => {
          window.seenMini = model;
          return pack(model);
        };
        window.boardChanged('map_tokens', {
          eventType: 'INSERT',
          new: {
            id: 'token-musico',
            character_id: character,
            map_id: map,
            kind: 'pc',
            name: 'Lyra',
            x: 2,
            y: 2,
            size: 1,
          },
        });
      },
      { character: hero.id, map: liveMap.id },
    );
    hero.updated_at = 'updated';
    hero.data.hp = 0;
    displayParty.encounter.current_id = 'hidden';
    await display.evaluate(() => window.partyChanged('characters'));
    await overlays.locator('meter[value="0"]').first().waitFor();
    check(
      'Pantalla para jugadores: los PG en cero y el turno oculto se actualizan en vivo',
      (await overlays.locator('li').filter({ hasText: 'Lyra' }).locator('meter[value="0"]').count()) === 1 &&
        (await overlays.locator('[aria-current]').count()) === 0,
    );
    await display.waitForFunction(() => window.seenMini?.gear === 'lute');
    check(
      'Miniaturas: la pantalla de jugadores dibuja la figura de la ficha vinculada',
      await display.evaluate(
        () =>
          window.seenMini.race === 'owlin' &&
          window.seenMini.offhand === 'book' &&
          window.seenMini.height === 182 &&
          window.seenMini.headwear === 'cowl' &&
          window.seenMini.neck === 'skull' &&
          window.seenMini.scar === 'claw',
      ),
    );
    await display.evaluate(map => {
      const selection = CreatureMiniatures.selection;
      window.seenCreatures = new Set();
      CreatureMiniatures.selection = (...args) => {
        const model = selection(...args);
        if (model) window.seenCreatures.add(model.id);
        return model;
      };
      const tokens = [
        ['Lobo terrible 2', null, false],
        ['El cobrador', 'mimic', false],
        ['Trol', null, true],
        ['Esqueleto', null, false],
        ['Goblin 2', null, false],
        ['Aguja', 'dragon-silver', false],
        ['Dragón azul adulto', null, true],
        ['Dragón rojo adulto', 'sigil', false],
      ];
      tokens.forEach(([name, creature_model, hidden], i) =>
        window.boardChanged('map_tokens', {
          eventType: 'INSERT',
          new: {
            id: 'creature-preview-' + i,
            map_id: map,
            kind: 'monster',
            name,
            creature_model,
            hidden,
            x: 1 + i,
            y: 3,
            size: 1,
          },
        }),
      );
    }, liveMap.id);
    await display.waitForFunction(() => window.seenCreatures.has('dragon-silver'));
    check(
      'Pantalla para jugadores: figuras automáticas y elegidas por el DM respetan la visibilidad y el emblema',
      await display.evaluate(
        () => [...window.seenCreatures].sort().join(',') === 'dragon-silver,goblin,mimic,skeleton,wolf',
      ),
    );
    displayParty.encounter.active = false;
    await display.evaluate(() => window.partyChanged('encounter'));
    await overlays.locator('.screen-initiative').waitFor({ state: 'hidden' });
    check(
      'Pantalla para jugadores: al terminar la iniciativa se retira la lista aunque queden combatientes',
      (await overlays.locator('.screen-initiative li').count()) === 0 &&
        (await overlays.locator('.screen-roster').isVisible()),
    );
    displayBoard = { board: { map_id: null }, maps: [{ id: 'prep', name: 'Mapa secreto' }], tokens: [] };
    await display.evaluate(
      id => window.boardChanged('boards', { new: { campaign_id: id, map_id: null } }),
      sharedParty.campaign.id,
    );
    await display.locator('#screen-map-empty').waitFor();
    check(
      'Pantalla para jugadores: sin mapa público sigue mostrando la party y oculta los mapas preparados',
      (await overlays.isVisible()) && !(await display.locator('body').innerText()).includes('Mapa secreto'),
    );
    await device.evaluate(() => {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android) Mobile' });
      draw();
    });
    check('Pantalla para jugadores: el acceso está oculto en Android', (await screenLink.count()) === 0);
    await display.close();
    await device.close();
    await dm.close();
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
