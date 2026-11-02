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
  function fire(id, height = 0.76) {
    // En TV ensanchamos el dibujo, así las llamas no se aplastan al llenar la pantalla.
    const width = Math.max(600, Math.round((600 * innerWidth) / (innerHeight * height)));
    return (
      `<svg class="fx-fire" viewBox="0 0 ${width} 600" preserveAspectRatio="none" aria-hidden="true">` +
      `<defs>${many(3, j => `<linearGradient id="enc-fire-${id}-${j}" x2="0" y2="1"><stop stop-color="${['#e56336', '#ffcc63', '#fff6c6'][j]}"/><stop offset="1" stop-color="${['#64182a', '#d63724', '#ff8d28'][j]}"/></linearGradient>`)}</defs>${many(
        3,
        j =>
          group(
            many(8, i => {
              const step = width / 8,
                breadth = Math.max(80, step * 0.65);
              const x = (i + 0.3 + j * 0.12) * step;
              const h = (1 - Math.abs(x - width / 2) / (width * 0.85)) * [550, 410, 245][j] + ((i * 47) % 105);
              const tip = x + breadth * 0.25 + ((i * 29) % 65);
              return path(
                `M${x - breadth * 0.8} 610 C${x - breadth} ${600 - h * 0.45} ${tip + breadth * 0.6} ${600 - h * 0.65} ${tip} ${600 - h} C${tip + breadth} ${600 - h * 0.7} ${x - breadth * 0.1} ${600 - h * 0.35} ${x + breadth * 0.65} ${600 - h * 0.4} Q${x + breadth * 1.4} ${600 - h * 0.25} ${x + breadth * 1.2} 610Z`,
                'fx-flame',
                `style="--d:${i * -0.23}s;--speed:${[1.6, 1.15, 0.85][j]}s"`,
              );
            }) + `<rect x="0" y="585" width="${width}" height="25"/>`,
            'fx-fire-band',
            `style="fill:url(#enc-fire-${id}-${j})"`,
          ),
      )}</svg><div class="fx-heat-glow"></div>`
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
    const eyes = `<svg class="fx-dragon-eyes" viewBox="0 0 600 180" aria-hidden="true"><defs><radialGradient id="enc-eye-${id}"><stop stop-color="#fff9d8"/><stop offset=".4" stop-color="var(--a)"/><stop offset="1" stop-color="var(--a)" stop-opacity=".06"/></radialGradient></defs>${many(2, i => at(i ? 450 : 150, 50, `<g transform="scale(${i ? -1 : 1} 1)">${group(path('M-115 0Q-40-45 105 28Q-30 90-115 0Z', '', `fill="url(#enc-eye-${id})"`) + path('M-15-14Q-29 28-12 57Q1 24-15-14Z', 'fx-dark') + path('M-122-18Q-38-63 118 16', 'fx-dragon-brow'), 'fx-dragon-lid')}</g>`))}</svg>`;
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
          group(
            many(2, i =>
              group(
                path(
                  'M125-20 155 85 128 125 180 165 148 230 205 270 170 335 240 405 218 510M148 230 95 255 110 300 55 345M180 165 230 145 245 180M475-20 435 90 460 145 405 190 430 260 385 315 425 365 365 460 390 550M430 260 490 285 472 330 530 400M405 190 360 170 340 215M300-20 280 75 310 118 265 180 295 240M280 75 245 85 230 118',
                ),
                i ? 'fx-bolt-core' : 'fx-bolt-glow',
              ),
            ),
            'fx-strikes',
          ),
          'fx-lightning',
          'preserveAspectRatio="none"',
        ) + '<div class="fx-lightning-flash"></div>',
      poison: () =>
        '<div class="fx-toxic-bed"></div>' +
        many(
          16,
          i =>
            `<i class="fx-toxic-puff" style="left:${-15 + (i % 8) * 16}%;top:${44 + Math.floor(i / 8) * 20 + (i % 3) * 5}%;--d:${i * -0.27}s;--depth:${i < 8 ? 0.65 : 1}"></i>`,
        ) +
        particles(8, 'fx-toxic-drop'),
      acid: () =>
        svg(
          `<defs><radialGradient id="enc-acid-${id}"><stop stop-color="#ffffcd"/><stop offset=".25" stop-color="#edff5d"/><stop offset="1" stop-color="#718800" stop-opacity=".15"/></radialGradient></defs><ellipse cx="330" cy="520" rx="245" ry="65" fill="url(#enc-acid-${id})"/>${group(path('M-30 90Q155 100 338 459L310 487Q110 175-30 140Z', 'fx-acid-stream') + path('M-30 110Q120 130 326 472', 'fx-acid-core fx-lines'), 'fx-acid-jet')}<ellipse class="fx-acid-pool" cx="330" cy="520" rx="180" ry="24"/>${many(14, i => at(330, 475, group(path('M0-16Q17 4 0 14Q-13 5 0-16Z', 'fx-acid-drop'), 'fx-acid-splash', `style="--dx:${(i - 6.5) * 37}px;--lift:${-65 - (i % 4) * 50}px;--d:${i * -0.17}s"`)))}${many(8, i => at(190 + i * 38, 515, `<circle class="fx-sizzle" r="${4 + (i % 3) * 3}" style="--d:${i * -0.3}s"/>`))}`,
          'fx-breath',
          'preserveAspectRatio="none"',
        ),
    };
    return `<div class="${v === 'lightning' ? 'fx-storm' : 'fx-sweep'}">${signatures[v]()}</div>${eyes}`;
  }
  // Dientes cuadrados: dos radios y cuatro esquinas por paso. La velocidad sigue la cantidad de dientes.
  function cog(id, teeth, small = false) {
    const point = (r, a) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
    const outline =
      many(teeth, i => {
        const a = (i * 2 * Math.PI) / teeth,
          step = Math.PI / teeth;
        return `${i ? 'L' : 'M'}${point(85, a - step)}L${point(85, a - step * 0.55)}L${point(102, a - step * 0.55)}L${point(102, a + step * 0.55)}L${point(85, a + step * 0.55)}L${point(85, a + step)}`;
      }) + 'Z';
    return `<svg class="fx-cog ${small ? 'fx-cog-small' : ''}" viewBox="-110 -110 220 220" aria-hidden="true" style="--speed:${teeth / 2}s"><defs><linearGradient id="enc-metal-${id}"><stop stop-color="#f2e3b3"/><stop offset=".3" stop-color="#8d9da7"/><stop offset=".55" stop-color="#d4e5e9"/><stop offset="1" stop-color="#42525f"/></linearGradient></defs>${path(outline, '', `fill="url(#enc-metal-${id})" stroke="#d1dde0" stroke-width="2"`)}<circle r="72" fill="#10212c" stroke="#56656d" stroke-width="8"/>${many(6, i => `<g transform="rotate(${i * 60})">${path('M-7-69H7V-20H-7Z', '', `fill="url(#enc-metal-${id})"`)}</g>`)}<circle r="25" fill="url(#enc-metal-${id})"/><circle r="12" fill="#071017"/></svg>`;
  }
  function forearm(i) {
    // Radio y cúbito anchos y afinados; las falanges quedan separadas por las articulaciones.
    const fingers = [
      ['M64 108 49 102M42 98 32 88M30 80Q32 70 42 74', [47, 102, 31, 85], [66, 111], 9],
      ['M73 87 62 68M59 58 62 42M66 32Q78 24 81 35', [60, 63, 63, 36], [75, 92], 7],
      ['M92 82 88 59M89 49 96 31M102 23Q115 24 111 38', [88, 54, 98, 26], [93, 88], 2],
      ['M111 88 116 68M119 58 129 45M136 40Q148 46 137 55', [117, 63, 133, 42], [110, 94], -7],
      ['M128 104 139 89M147 81 154 75M162 76Q169 86 155 89', [143, 85, 159, 74], [124, 108], -11],
    ];
    const bones =
      path('M55 357Q48 350 56 338L66 153Q60 143 66 132Q78 122 85 135L79 153 74 336Q84 348 74 359Z') +
      path('M106 358Q95 349 103 337L99 157Q91 140 102 130Q115 123 124 138L115 160 122 339Q132 351 120 360Z');
    const palm =
      path('M83 126 66 111M90 122 75 94M97 121 93 90M104 125 110 96M110 130 124 109', 'fx-phalanges') +
      many(
        6,
        j =>
          `<ellipse cx="${77 + (j % 3) * 15}" cy="${127 + Math.floor(j / 3) * 10}" rx="6" ry="5" class="fx-knuckle"/>`,
      );
    const hand = many(5, j => {
      const [d, joints, origin, curl] = fingers[j];
      return group(
        path(d, 'fx-phalanges') +
          many(2, k => `<circle cx="${joints[k * 2]}" cy="${joints[k * 2 + 1]}" r="4.5" class="fx-knuckle"/>`) +
          `<circle cx="${origin[0]}" cy="${origin[1]}" r="5" class="fx-knuckle"/>`,
        'fx-finger',
        `style="transform-origin:${origin[0]}px ${origin[1]}px;--curl:${curl}deg;--d:${(i + j) * -0.17}s"`,
      );
    });
    return `<div class="fx-grave" style="left:${13 + i * 18.5}%;--height:${[29, 32, 30, 31, 28][i]}vmin;--tilt:${[-12, 8, -4, 11, -8][i]}deg;--delay:${i * 0.065}s"><svg class="fx-forearm" viewBox="0 0 180 360" aria-hidden="true">${group(bones, 'fx-forearm-bones')}${palm}${hand}</svg></div>`;
  }
  function rock(i) {
    // Fragmentos asimétricos, con una sola cara clara: nada de centro ni rayos que parezcan una tuerca.
    const shapes = [
      ['M-28-8-11-26 2-16 24-19 19 9 4 27-21 15Z', 'M-28-8-11-26 2-16 24-19 3 1Z'],
      ['M-26-20 3-27 27-2 11 25-17 12Z', 'M-26-20 3-27 27-2-4-5Z'],
      ['M-25-5-18-24 15-28 28 9 8 16-10 29Z', 'M-25-5-18-24 15-28 4-1Z'],
      ['M-30 5-7-26 8-16 26-12 18 10 26 23-15 19Z', 'M-30 5-7-26 8-16 26-12-1 4Z'],
    ];
    const [outline, face] = shapes[i % shapes.length];
    return `<svg class="fx-rock" viewBox="-32 -32 64 64" aria-hidden="true" style="left:${3 + i * 7}%;--size:${[0.65, 1.4, 0.85, 1.8, 1.1][i % 5]};--dx:${(i - 6.5) * 3}vw;--turn:${i * 53}deg;--d:${(i % 4) * -0.19}s">${path(outline, 'fx-rock-body')}${path(face, 'fx-rock-face')}</svg>`;
  }
  function cracks() {
    // Cada grieta es una abertura rellena que termina en punta; sólo iluminamos uno de sus bordes.
    const cuts = [
      [
        'M280 620 285 480 270 400 301 320 280 230 305 90 295 235 316 321 290 405 310 480 320 620Z',
        'M280 620 285 480 270 400 301 320 280 230 305 90',
      ],
      ['M270 535 185 438 168 344 80 288 0 75 94 273 186 326 205 421 300 515Z', 'M270 535 185 438 168 344 80 288 0 75'],
      [
        'M300 585 398 450 370 362 486 275 600 110 500 291 394 373 422 453 330 605Z',
        'M300 585 398 450 370 362 486 275 600 110',
      ],
      ['M304 355 375 246 369 120 455 0 382 125 391 250 319 369Z', 'M304 355 375 246 369 120 455 0'],
      ['M183 369 106 388 35 335 110 377 180 358Z', 'M183 369 106 388 35 335'],
      ['M406 459 492 475 600 355 495 460 413 447Z', 'M406 459 492 475 600 355'],
    ];
    return svg(
      group(
        cuts.map(c => path(c[0], 'fx-fracture-cut')).join('') +
          path(cuts.map(c => c[1]).join(' '), 'fx-fracture-edge', 'vector-effect="non-scaling-stroke"'),
        'fx-fracture',
      ),
      'fx-cracks',
      'preserveAspectRatio="none"',
    );
  }
  const THEMES = {
    undead: () =>
      fog() +
      many(5, forearm) +
      many(
        10,
        i =>
          `<svg class="fx-grave-clod" viewBox="-30 -30 60 60" aria-hidden="true" style="left:${11 + Math.floor(i / 2) * 18.5 + (i % 2) * 4}%;--dx:${i % 2 ? 6 : -6}vmin;--delay:${Math.floor(i / 2) * 0.065}s;--size:${1.2 + (i % 3) * 0.45}vmin">${path('M-25-4-9-21 15-16 24 8 0 22-18 13Z')}</svg>`,
      ) +
      many(
        4,
        i =>
          `<svg class="fx-skull-drift" viewBox="-24 -28 48 50" aria-hidden="true" style="left:${12 + i * 23}%;--size:${[8, 9, 7.5, 8.5][i]}vmin;--d:${i * -0.63}s">${skull}</svg>`,
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
      cracks() +
      many(14, rock) +
      '<div class="fx-dust-bed"></div>' +
      many(5, i => `<i class="fx-dust" style="left:${i * 24 - 15}%;--d:${i * -0.25}s"></i>`),
    fiend: (_, id) => seal(id, true) + fire(id, 0.52) + particles(12, 'fx-ember'),
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
    beast: () => claws() + svg(rings()),
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
    swarm: () =>
      many(
        36,
        i =>
          `<i class="fx-bug" style="left:${i % 7 === 0 ? 42 + (i % 15) : i % 2 ? 76 + (i % 19) : 3 + (i % 19)}%;top:${5 + ((i * 29) % 90)}%;--d:${i * -0.19}s"></i>`,
      ) +
      `<div class="fx-near-bugs">${many(4, i => `<i class="fx-bug" style="left:${5 + i * 26}%;top:${12 + i * 23}%;--d:${i * -0.31}s"></i>`)}</div><div class="fx-nest"></div>`,
    warband: () =>
      svg(
        rings() +
          many(
            2,
            i =>
              `<g transform="translate(${i ? 490 : 110} 80)">${path('M0 0V450', 'fx-lines')}${path('M0 10H75L60 150 28 130 0 150Z', 'fx-banner')}</g>`,
          ),
      ) + many(8, i => `<div class="fx-arrow" style="--i:${i};left:${8 + i * 11}%;top:${18 + (i % 4) * 19}%"></div>`),
    humanoid: (_, id) =>
      svg(
        `<defs><linearGradient id="enc-steel-${id}"><stop stop-color="#51677c"/><stop offset=".45" stop-color="#eaffff"/><stop offset=".52" stop-color="#8da8bf"/><stop offset="1" stop-color="#c4d6e1"/></linearGradient></defs>` +
          many(
            2,
            i =>
              `<g transform="rotate(${i ? -42 : 42} 300 300)">${group(
                path('M300 55 325 105 318 370H282L275 105Z', 'fx-steel', `style="fill:url(#enc-steel-${id})"`) +
                  path('M240 370Q300 340 360 370L355 389Q300 375 245 389Z', 'fx-hilt') +
                  path('M289 385H311V477L300 491 289 477Z', 'fx-grip') +
                  path('M293 140H306V340H293Z', 'fx-steel-glint'),
                'fx-sword',
                `style="--i:${i}"`,
              )}</g>`,
          ),
        'fx-stage fx-duel',
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
    construct: (_, id) =>
      `<div class="fx-machine fx-machine-left"><div class="fx-cog-seat">${cog(id + '-a', 16)}</div><div class="fx-cog-seat fx-small-seat">${cog(id + '-b', 12, true)}</div></div><div class="fx-machine fx-machine-right"><div class="fx-cog-seat">${cog(id + '-c', 16)}</div></div><svg class="fx-construct-eye" viewBox="-60 -60 120 120" aria-hidden="true">${group('<circle r="48" fill="#142f38" stroke="#c9d5be" stroke-width="5"/><circle r="32"/><path class="fx-dark" d="M0-26 15 0 0 26-15 0Z"/>', 'fx-core')}</svg>${many(6, i => `<i class="fx-steam" style="left:${i % 2 ? 75 : 8}%;top:${32 + i * 6}%;--d:${i * -0.3}s"></i>`)}`,
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
      `<div class="fx-iridescence"></div><div class="fx-aurora"></div>${many(30, i => `<i class="fx-fey-mote" style="--angle:${i * 137}deg;--radius:${12 + (i % 6) * 5}vmin;--d:${i * -0.19}s"></i>`)}${svg(
        many(
          10,
          i =>
            `<g transform="translate(${50 + ((i * 97) % 510)} ${90 + (i % 3) * 190})"><g transform="scale(${0.35 + (i % 5) * 0.14})">${group(
              path('M0 0C-65-70-58 30 0 10 58 30 65-70 0 0M0 0V22', 'fx-butterfly'),
              'fx-fairy',
              `style="--d:${i * -0.4}s"`,
            )}</g></g>`,
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
    }<div class="enc-text"><svg class="enc-mark" viewBox="0 0 100 100" aria-hidden="true"><path d="M14 4 29 10 74 68 66 75 19 18ZM3 66 9 60 39 86 33 93ZM16 75 25 82 10 99 2 92ZM86 4 71 10 26 68 34 75 81 18ZM97 66 91 60 61 86 67 93ZM84 75 75 82 90 99 98 92Z"/></svg><div class="enc-heading">${echo}${split}<strong>${title}</strong></div>${count ? `<small>${esc(count)} ${count === 1 ? 'enemigo' : 'enemigos'}</small>` : ''}</div>`;
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
