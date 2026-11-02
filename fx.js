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
  const THEMES = {
    undead: () =>
      fog() +
      svg(
        many(
          4,
          i =>
            `<g transform="translate(${85 + i * 145} 160)">${group(
              path(
                'M-22 70-20 10-34-28-29-33-11-9-9-61-2-64 2-13 9-75 16-73 14-10 26-59 33-56 26 4 39-29 46-25 32 28 22 70Z',
              ) +
                path('M-12 70Q-18 190-12 310T-7 430M8 70Q15 200 8 300T10 430', 'fx-arm-bones fx-lines') +
                path('M-14 35H20M-13 45H19', 'fx-bone fx-lines'),
              'fx-hand',
              `style="--d:${i * -0.15}s"`,
            )}</g>`,
        ),
        'fx-ground fx-hands',
        'preserveAspectRatio="none"',
      ) +
      many(
        4,
        i =>
          `<svg class="fx-skull-drift" viewBox="-30 -35 60 65" aria-hidden="true" style="left:${12 + i * 23}%;--d:${i * -0.63}s">${skull}</svg>`,
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
        group(
          many(2, i =>
            path(
              'M300 620 275 480 312 390 260 280 300 140M290 520 180 445 195 350 85 275 0 90M300 600 405 450 390 370 505 250 600 120M195 350 120 375 45 340M312 390 390 260 385 110 455 0M260 280 190 175 110 110M405 450 490 460 600 360',
              i ? 'fx-fracture-core' : 'fx-fracture-lip',
              'vector-effect="non-scaling-stroke"',
            ),
          ),
          'fx-fracture',
        ),
        'fx-cracks',
        'preserveAspectRatio="none"',
      ) +
      many(
        14,
        i =>
          `<svg class="fx-rock" viewBox="-30 -30 60 60" aria-hidden="true" style="left:${3 + i * 7}%;--size:${0.5 + (i % 4) * 0.35};--dx:${(i - 6.5) * 3}vw;--d:${(i % 4) * -0.19}s">${path('M-25-13 1-26 23-10 28 14 6 27-23 15Z')}${path('M-25-13 0 2 28 14M0 2 1-26M0 2 6 27', 'fx-rock-face fx-lines')}</svg>`,
      ) +
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
