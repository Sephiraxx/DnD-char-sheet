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
    const dm = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    dm.on('pageerror', e => errors.push(e.message));
    await dm.route('**/config.js', route =>
      route.fulfill({ contentType: 'application/javascript', body: 'window.CLOUD_CONFIG = {};' }),
    );
    await dm.goto(base + 'dm.html');
    const playerId = await dm.evaluate(saved => {
      const id = CharacterStorage.add(Rules.validate(saved));
      localStorage.setItem('dnd-party-active-v1', id);
      const campaign = { id: crypto.randomUUID(), name: 'Prueba', code: 'ALLY', dm_id: 'dm', settings: {} };
      const snapshot = { campaign, members: [], characters: [], combatants: [], secrets: [], loot: [], homebrew: [] };
      Cloud.enabled = true;
      Cloud.party = async () => snapshot;
      Cloud.events = async () => [];
      Cloud.post = async () => ({});
      Cloud.createFriendlyNpc = async (table, data) => {
        const row = { id: crypto.randomUUID(), owner_id: table.dm_id, name: data.name, data, updated_at: '2026-01-01' };
        snapshot.characters.push(row);
        return row;
      };
      Cloud.addCombatant = async (campaignId, data) => snapshot.combatants.push({ ...data, campaign_id: campaignId });
      current = campaign.id;
      party = snapshot;
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
