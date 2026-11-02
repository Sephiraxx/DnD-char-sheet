/* Tarjeta con el resultado de una tirada: el número «rueda» un instante y se asienta. Tocala para cerrarla. */
const RollFX = (() => {
  'use strict';
  let timer, ticker, settle;
  const esc = v =>
    String(v ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Contorno de un d20 visto de frente: hexágono con el triángulo central.
  const D20 =
    '<svg viewBox="0 0 56 56" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M28 3 51 16v24L28 53 5 40V16Z"/><path d="M28 13 44 39H12Z"/><path d="M28 3v10M5 16l7 23M51 16l-7 23M12 39l16 14 16-14"/></g></svg>';

  function hide(box) {
    const card = box.firstElementChild;
    if (!card) return;
    card.classList.add('leaving');
    setTimeout(() => card.remove(), 200);
  }
  // face: d20 que quedó (número) o un símbolo; total: resultado final.
  // Devuelve una promesa que se cumple cuando el número queda fijo (para mostrar el resultado en otros lados).
  function show({ label, total, face = '', detail = '', crit = false, fumble = false }) {
    const host = document.querySelector('dialog[open]') || document.body;
    let box = document.getElementById('roll-fx');
    if (!box || box.parentElement !== host) {
      box?.remove();
      box = document.createElement('div');
      box.id = 'roll-fx';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      box.addEventListener('click', () => hide(box));
      host.append(box);
    }
    clearTimeout(timer);
    clearTimeout(ticker);
    settle?.();
    let done;
    const landed = new Promise(r => (done = r));
    settle = done;
    const tag = crit ? '¡Crítico!' : fumble ? 'Pifia' : '';
    box.innerHTML = `<button type="button" class="roll-card ${crit ? 'crit' : fumble ? 'fumble' : ''}" aria-label="${esc(label)}: ${esc(total)}. Tocá para cerrar."><span class="roll-icon">${D20}<b>${esc(face)}</b></span><span class="roll-label">${esc(label)}${tag ? `<span class="roll-tag">${tag}</span>` : ''}</span><span class="roll-total">${esc(total)}</span>${detail ? `<span class="roll-detail">${esc(detail)}</span>` : ''}</button>`;
    const card = box.firstElementChild,
      out = card.querySelector('.roll-total'),
      dieOut = card.querySelector('.roll-icon b'),
      final = Number(total),
      faceNum = Number(face);
    // Números al azar que se frenan de a poco hasta quedar en el resultado real.
    if (!calm() && Number.isFinite(final)) {
      const steps = [45, 45, 50, 55, 65, 75, 90, 110, 135, 165];
      const spread = Math.max(8, Math.abs(final));
      card.classList.add('rolling');
      let i = 0;
      const tick = () => {
        if (i >= steps.length) {
          out.textContent = total;
          if (dieOut) dieOut.textContent = face;
          card.classList.remove('rolling');
          card.classList.add('settled');
          settle = null;
          done();
          return;
        }
        out.textContent = Math.max(0, Math.round(final + (Math.random() - 0.5) * spread));
        if (dieOut && Number.isInteger(faceNum)) dieOut.textContent = 1 + Math.floor(Math.random() * 20);
        ticker = setTimeout(tick, steps[i++]);
      };
      tick();
    } else {
      card.classList.add('settled');
      settle = null;
      done();
    }
    timer = setTimeout(() => hide(box), 4000);
    return landed;
  }
  return { show };
})();

/* Aviso de combate a pantalla completa: golpe, suspenso y retirada en tres tiempos. */
const EncounterFX = (() => {
  'use strict';
  const esc = v =>
    String(v ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  let timer,
    serial = 0,
    current;
  const many = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
  const path = (d, cls = '', extra = '') => `<path class="${cls}" d="${d}" ${extra}/>`;
  const svg = (art, cls = 'fx-stage', extra = '') =>
    `<svg class="${cls}" viewBox="0 0 600 600" aria-hidden="true" ${extra}>${art}</svg>`;
  const group = (art, cls, extra = '') => `<g class="${cls}" ${extra}>${art}</g>`;
  const at = (x, y, art) => `<g transform="translate(${x} ${y})">${art}</g>`;
  const skull =
    '<path d="M-17 2C-30-33 30-33 17 2L12 8V19H-12V8Z"/><path class="fx-dark" d="M-15-9h10v10h-10Zm20 0h10v10H5ZM-3 3l6 0-3-6ZM-7 9h3v10h-3Zm11 0h3v10H4Z"/>';
  const fog = () => '<div class="fx-fog"></div><div class="fx-fog fx-fog-back"></div>';
  const particles = (n, cls = 'fx-mote') =>
    many(
      n,
      i =>
        `<i class="${cls}" style="--i:${i};left:${8 + ((i * 37) % 85)}%;top:${12 + ((i * 23) % 76)}%;--d:${(i % 6) * -0.27}s"></i>`,
    );
  const rings = () => many(3, i => `<circle class="fx-shock" cx="300" cy="300" r="80" style="--d:${i * -0.65}s"/>`);
  // El trazo punteado ya está dibujado: la máscara se abre con transform, sin repintar el trazo.
  function seal(id, infernal = false) {
    const key = `enc-reveal-${id}`;
    return svg(
      `<defs><clipPath id="${key}"><rect class="fx-reveal" width="600" height="600"/></clipPath></defs><g clip-path="url(#${key})" class="fx-lines"><circle cx="300" cy="300" r="224" stroke-dasharray="6 8"/><circle cx="300" cy="300" r="200"/>${path(infernal ? 'M300 95 420 465 105 235H495L180 465Z' : 'M300 105 470 397H130ZM300 495 130 203H470Z')}</g>${many(
        12,
        i =>
          `<g transform="rotate(${i * 30} 300 300)">${path('M290 65v30m0-24 17 10-17 8', 'fx-rune', `style="--d:${i * 0.07}s"`)}</g>`,
      )}`,
      'fx-stage fx-seal',
    );
  }
  function fire(id) {
    return svg(
      `<defs><linearGradient id="enc-fire-${id}" x2="0" y2="1"><stop stop-color="#fff4bd"/><stop offset=".38" stop-color="#ffb332"/><stop offset="1" stop-color="#b62435"/></linearGradient></defs>${many(
        3,
        j =>
          group(
            many(7, i => {
              const x = i * 100 - 30;
              return path(
                `M${x} 610 C${x - 45} 480 ${x + 85} 410 ${x + 20} ${190 + (i % 3) * 65} C${x + 155} 330 ${x + 42} 410 ${x + 110} 435 C${x + 165} 470 ${x + 160} 560 ${x + 175} 610Z`,
                'fx-flame',
                `style="--d:${(i % 3) * -0.4}s"`,
              );
            }),
            'fx-fire-band',
            `style="--i:${j};fill:url(#enc-fire-${id})"`,
          ),
      )}`,
      'fx-fire',
      'preserveAspectRatio="none"',
    );
  }
  const claws = () =>
    svg(
      many(3, i =>
        at(
          0,
          i * 65 - 55,
          group(
            path('M100 175 450 340 432 344 485 383 370 341 385 338 95 190Z', 'fx-cut'),
            'fx-claw',
            `style="--i:${i}"`,
          ),
        ),
      ),
    );
  function dragon(v, id) {
    const wing = svg(
      path('M60 250Q90 65 295 100L225 170 340 130 290 210 430 160 375 260Q250 205 180 290Z', 'fx-wing') +
        path('M360 135q35-30 70 0-35 26-70 0Z', 'fx-glint'),
      'fx-stage fx-dragon',
    );
    const signatures = {
      fire: () => fire(id) + particles(12, 'fx-ember'),
      ice: () =>
        svg(
          many(
            12,
            i =>
              `<g transform="translate(${30 + i * 48} ${220 + (i % 3) * 75})">${path('M0 100 18-100 42 45 25 80Z', 'fx-ice', `style="--d:${(i % 4) * -0.2}s"`)}</g>`,
          ),
          'fx-breath',
          'preserveAspectRatio="none"',
        ),
      lightning: () =>
        svg(
          path('M0 300 180 230 142 320 340 200 295 303 600 160 390 350 412 275 205 410 235 330Z', 'fx-lightning') +
            path('M300 300 345 425 320 400 375 545M390 270 420 100 450 145 510 20', 'fx-lines'),
        ),
      poison: () =>
        fog() +
        svg(
          many(
            7,
            i =>
              `<circle class="fx-cloud" cx="${65 + i * 80}" cy="${310 + (i % 2) * 90}" r="90" style="--d:${i * -0.3}s"/>`,
          ),
        ) +
        particles(8, 'fx-drop'),
      acid: () =>
        svg(
          path('M0 390Q180 140 390 300T600 320L600 440Q300 300 0 520Z', 'fx-acid-wave') +
            many(
              10,
              i =>
                `<g transform="translate(${50 + i * 55} ${200 + (i % 3) * 90})">${path('M0-28Q30 12 0 20Q-24 10 0-28Z', 'fx-acid', `style="--d:${i * -0.18}s"`)}</g>`,
            ),
          'fx-breath',
          'preserveAspectRatio="none"',
        ),
    };
    return `<div class="fx-sweep">${signatures[v]()}</div>${wing}`;
  }
  const THEMES = {
    undead: () =>
      fog() +
      svg(
        many(
          4,
          i =>
            `<g transform="translate(${85 + i * 145} 480)">${group(
              path(
                'M-22 130-20 10-34-28-29-33-11-9-9-61-2-64 2-13 9-75 16-73 14-10 26-59 33-56 26 4 39-29 46-25 32 28 22 130Z',
              ) + group(skull, 'fx-bone', 'transform="translate(0 65)"'),
              'fx-hand',
              `style="--d:${i * -0.15}s"`,
            )}</g>`,
        ),
        'fx-ground',
      ),
    necro: (_, id) =>
      seal(id) +
      fog() +
      svg(
        many(
          6,
          i =>
            `<g transform="rotate(${i * 60} 300 300)">${group(
              group(skull, 'fx-soul-head', 'transform="translate(300 100)"') +
                path('M300 115q-30 50 0 100-5-60 12-90', 'fx-soul-tail'),
              'fx-soul',
              `style="--d:${i * -0.3}s"`,
            )}</g>`,
        ),
      ),
    arcane: (_, id) =>
      `${
        seal(id) +
        svg(
          group(
            '<circle cx="300" cy="300" r="165" stroke-dasharray="80 15 3 15"/><ellipse cx="300" cy="300" rx="255" ry="100"/>',
            'fx-orbit fx-lines',
          ) +
            many(
              8,
              i =>
                `<g transform="rotate(${i * 45} 300 300)">${group('<circle cx="300" cy="60" r="5"/>', 'fx-orbit')}</g>`,
            ),
        )
      }<div class="fx-entry-light"></div>`,
    cult: (_, id) =>
      seal(id, true) +
      svg(
        many(
          2,
          i =>
            `<g transform="translate(${i ? 525 : 75} 210)">${path('M-80 350Q-65 25 0-80 65 25 80 350Z', 'fx-hood')}${path('M-20 20Q0-55 20 20L12 60H-12Z', 'fx-dark')}</g>`,
        ) +
          many(
            7,
            i =>
              `<g transform="translate(${60 + i * 80} ${500 + Math.abs(3 - i) * 18})"><path d="M-6 0H6V55H-6Z" fill="#9c655b"/>${path('M0 0Q-20-18 0-44 17-18 0 0Z', 'fx-candle', `style="--d:${i * -0.2}s"`)}</g>`,
          ),
      ),
    dragon,
    giant: () =>
      svg(
        path(
          'M300 600 283 510 315 450 270 380 310 300M300 600 390 515 374 470 480 400 510 320M300 600 180 530 194 480 110 450 70 360M315 450 390 410M270 380 200 350',
          'fx-crack fx-lines',
        ) +
          many(
            12,
            i =>
              `<g transform="translate(${60 + i * 45} 550)">${path('M-12-8 4-17 18 2 7 16-17 7Z', 'fx-debris', `style="--i:${i};--d:${(i % 4) * -0.15}s"`)}</g>`,
          ),
        'fx-ground',
      ) + fog(),
    fiend: (_, id) => seal(id, true) + fire(id) + particles(12, 'fx-ember'),
    aberration: () =>
      svg(
        many(
          4,
          i =>
            `<g transform="rotate(${i * 90} 300 300)">${path(
              'M-20 0C160 30 15 210 120 220S220 140 165 120Q125 100 136 145',
              'fx-tentacle',
              `style="--d:${i * -0.3}s"`,
            )}</g>`,
        ) +
          group(
            `<ellipse cx="300" cy="190" rx="102" ry="53" fill="#efd6bb"/>${group(
              '<circle cx="300" cy="190" r="42" fill="#be783c"/><ellipse cx="300" cy="190" rx="9" ry="38" fill="#080b13"/><circle cx="312" cy="176" r="6" fill="white"/>',
              'fx-pupil',
            )}`,
            'fx-eye',
          ),
      ),
    beast: () =>
      claws() +
      svg(
        rings() +
          path(
            'M270 440Q240 420 245 458 260 487 300 480 340 487 355 458 360 420 330 440ZM243 416a13 20 0 1 0-1 0M275 402a13 20 0 1 0-1 0M312 402a13 20 0 1 0-1 0M345 416a13 20 0 1 0-1 0',
            'fx-paw',
          ),
      ),
    monstrosity: () =>
      claws() +
      svg(
        rings() +
          group(
            path('M150 165 260 195Q225 225 150 165ZM450 165 340 195Q375 225 450 165Z') +
              path('M225 188v21m150-21v21', 'fx-dark fx-lines'),
            'fx-predator',
          ),
      ),
    swarm: () => `${particles(36, 'fx-bug')}<div class="fx-nest"></div>`,
    warband: () =>
      svg(
        rings() +
          many(
            2,
            i =>
              `<g transform="translate(${i ? 490 : 110} 80)">${path('M0 0V450', 'fx-lines')}${path('M0 10H75L60 150 28 130 0 150Z', 'fx-banner')}</g>`,
          ),
      ) + many(8, i => `<div class="fx-arrow" style="--i:${i};left:${8 + i * 11}%;top:${18 + (i % 4) * 19}%"></div>`),
    humanoid: () =>
      svg(
        many(
          2,
          i =>
            `<g transform="rotate(${i ? -42 : 42} 300 300)">${group(
              path('M300 90 315 130 308 370H292L285 130Z', 'fx-steel') +
                path('M260 370H340V385H307V465H293V385H260Z', 'fx-hilt') +
                path('M297 145H302V350H297Z', 'fx-steel-glint'),
              'fx-sword',
              `style="--i:${i}"`,
            )}</g>`,
        ),
      ) + particles(14, 'fx-metal-spark'),
    web: () =>
      svg(
        many(
          2,
          i =>
            `<g transform="${i ? 'translate(600 0) scale(-1 1)' : ''}">${group(
              path(
                'M0 0 450 70M0 0 380 210M0 0 240 360M0 0 70 450M0 0 0 500M120 18Q100 55 100 57T64 96 18 120M240 37Q190 115 201 112T128 192 37 240M360 56Q290 175 300 168T192 288 56 360',
                'fx-lines',
              ),
              'fx-web',
            )}</g>`,
        ) +
          group(
            `${path('M430-300V215', 'fx-lines')}<ellipse cx="430" cy="235" rx="16" ry="24"/>${path(
              'M420 220 395 202 382 220M418 231 387 227 377 247M419 242 391 254 388 271M440 220 465 202 478 220M442 231 473 227 483 247M441 242 469 254 472 271',
              'fx-lines',
            )}`,
            'fx-spider',
          ),
      ),
    elemental: () =>
      `<div class="fx-vortex"></div>${svg(
        many(
          4,
          i =>
            `<g transform="rotate(${i * 90} 300 300)">${group(
              path(
                'M300 80Q500 100 510 300',
                'fx-element fx-lines',
                `style="stroke:${['#ff8d49', '#67d9ff', '#b5bd7b', '#e6eeff'][i]}"`,
              ) + path('M280 77 300 56 322 80 300 104Z'),
              'fx-orbit',
            )}</g>`,
        ),
      )}`,
    construct: () =>
      svg(
        many(
          2,
          i =>
            `<g transform="translate(${i ? '375 375' : '225 225'})">${group(
              `<circle r="90" stroke-dasharray="24 22" stroke-width="30"/><circle r="73"/><circle r="35"/>${path('M-35 0H35M0-35V35')}`,
              'fx-gear fx-lines',
              `style="--i:${i}"`,
            )}</g>`,
        ) +
          group(`<circle cx="300" cy="300" r="42"/>${path('M275 300 300 275 325 300 300 325Z', 'fx-dark')}`, 'fx-core'),
      ) + fog(),
    plant: (_, id) =>
      svg(
        `<defs><clipPath id="enc-vine-${id}"><rect class="fx-reveal" width="600" height="600"/></clipPath></defs><g clip-path="url(#enc-vine-${id})">${many(
          2,
          i =>
            `<g transform="${i ? 'translate(600 0) scale(-1 1)' : ''}">${path(
              'M0 600C180 470 0 420 90 310S20 200 120 70M60 440 30 410M74 337 110 330M80 245 45 230',
              'fx-vine fx-lines',
            )}${many(
              5,
              j =>
                `<g transform="translate(${70 + (j % 2) * 20} ${120 + j * 90})">${path('M0 0Q-65-55-40-75 10-65 0 0Q55-10 60-48 8-50 0 0Z', 'fx-leaf', `style="--d:${j * 0.08}s"`)}</g>`,
            )}</g>`,
        )}</g>`,
      ) + particles(10, 'fx-petal'),
    ooze: () =>
      `<div class="fx-slime-cap"></div>${many(9, i => `<i class="fx-drip" style="left:${i * 12}%;--i:${i}"></i>`)}${particles(12, 'fx-bubble')}`,
    fey: () =>
      `<div class="fx-iridescence"></div>${particles(20)}${svg(
        many(
          5,
          i =>
            `<g transform="translate(${90 + i * 105} ${170 + (i % 2) * 240})">${group(
              path('M0 0C-65-70-58 30 0 10 58 30 65-70 0 0M0 0V22', 'fx-butterfly'),
              'fx-fairy',
              `style="--d:${i * -0.4}s"`,
            )}</g>`,
        ),
      )}`,
    celestial: () =>
      `<div class="fx-rays"></div>${svg(
        `<ellipse class="fx-halo" cx="300" cy="165" rx="140" ry="35"/>${many(
          9,
          i =>
            `<g transform="translate(${60 + i * 60} ${90 + (i % 3) * 130})">${group(
              path('M0 100Q-38 25 15-65 55 0 0 100Z') +
                path('M0 90 15-50M6 35 30 6M9 8 34-20M2 58-18 30', 'fx-feather-vein fx-lines'),
              'fx-feather',
              `style="--d:${i * -0.25}s"`,
            )}</g>`,
        )}`,
      )}`,
  };
  function clear() {
    clearTimeout(timer);
    current?.remove();
    current = null;
    document.body.classList.remove('enc-shake', 'enc-stomp');
  }
  function show({ style = 'battle', cry = '¡Combate!', count = 0, theme = '', variant = '' } = {}) {
    clear();
    const id = ++serial;
    const validTheme = Object.hasOwn(THEMES, theme);
    const kind = ['battle', 'ambush', 'boss', 'reinforce'].includes(style) ? style : 'battle';
    const element = ['fire', 'ice', 'lightning', 'poison', 'acid'].includes(variant) ? variant : 'fire';
    const box = document.createElement('div');
    current = box;
    box.id = 'encounter-fx';
    box.className = `enc-fx enc-${kind}`;
    box.setAttribute('role', 'alert');
    const title = esc(cry);
    const echo =
      kind === 'reinforce'
        ? many(3, i => `<span class="enc-echo" aria-hidden="true" style="--i:${i}">${title}</span>`)
        : '';
    const split =
      kind === 'ambush'
        ? `<span class="enc-half enc-left" aria-hidden="true">${title}</span><span class="enc-half enc-right" aria-hidden="true">${title}</span>`
        : '';
    box.innerHTML = `<div class="enc-flash"></div>${
      validTheme
        ? `<div class="enc-theme theme-${theme} v-${element}" aria-hidden="true">${THEMES[theme](element, id)}</div>`
        : ''
    }<div class="enc-text"><div class="enc-heading">${echo}${split}<strong>${title}</strong></div>${count ? `<small>${esc(count)} ${count === 1 ? 'enemigo' : 'enemigos'}</small>` : ''}</div>`;
    box.addEventListener('click', clear);
    (document.querySelector('dialog[open]') || document.body).append(box);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void document.body.offsetWidth;
      document.body.classList.add(theme === 'giant' ? 'enc-stomp' : 'enc-shake');
      navigator.vibrate?.([120, 60, 220]);
    }
    timer = setTimeout(clear, 3200);
  }
  return { show, themes: Object.keys(THEMES) };
})();
