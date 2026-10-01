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

/* Aviso de combate a pantalla completa (encuentro lanzado o refuerzos): destello, temblor y un grito que cae. */
const EncounterFX = (() => {
  'use strict';
  const esc = v =>
    String(v ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  let timer;
  // Capa de fondo según el tipo de criatura (muertos vivientes, dragones, gigantes…). Solo formas CSS/SVG.
  const rand = (a, b) => a + Math.random() * (b - a);
  const many = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
  const flames = n =>
    `<div class="fx-flames">${many(n, i => `<i style="left:${(i / n) * 100 + rand(-2, 2)}%;--d:${rand(0, 0.5).toFixed(2)}s;--h:${rand(28, 60).toFixed(0)}%"></i>`)}</div>`;
  const rising = (n, glyph) =>
    many(
      n,
      () =>
        `<span class="fx-rise" style="left:${rand(4, 94).toFixed(0)}%;--d:${rand(0, 1.2).toFixed(2)}s;--s:${rand(0.8, 1.8).toFixed(2)}">${glyph}</span>`,
    );
  const circle = () =>
    `<svg class="fx-circle" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="92"/><circle cx="100" cy="100" r="74" class="dash"/><path d="M100 26 L164 137 L36 137 Z M100 174 L36 63 L164 63 Z"/><text x="100" y="15">ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ</text></svg>`;
  const THEMES = {
    undead: () => `<div class="fx-fog"></div>${rising(12, '☠')}`,
    necro: () => `<div class="fx-fog"></div>${circle()}${rising(8, '☠')}`,
    arcane: () =>
      `${circle()}${many(14, () => `<span class="fx-spark" style="left:${rand(10, 90).toFixed(0)}%;top:${rand(10, 90).toFixed(0)}%;--d:${rand(0, 1.4).toFixed(2)}s"></span>`)}`,
    cult: () => `${circle()}<div class="fx-fog"></div>`,
    dragon: () =>
      `${flames(16)}<svg class="fx-wing" viewBox="0 0 400 200" aria-hidden="true"><path d="M0 120 C60 40 120 20 200 60 C210 20 260 0 300 10 C280 40 290 60 330 70 C300 80 300 100 340 120 C300 120 280 130 300 160 C250 140 220 150 200 120 C140 150 80 150 0 120 Z"/></svg>`,
    giant: () =>
      `<svg class="fx-cracks" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true"><path d="M200 300 L190 250 L215 210 L195 160 L220 120 L205 70"/><path d="M200 300 L240 260 L230 225 L280 200 L300 150"/><path d="M200 300 L150 270 L160 230 L110 205 L95 160"/><path d="M215 210 L260 185"/><path d="M195 160 L150 140"/></svg>`,
    fiend: () =>
      `${flames(18)}<svg class="fx-sigil" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="80"/><path d="M100 20 L147 165 L23 75 L177 75 L53 165 Z"/></svg>`,
    aberration: () =>
      `<svg class="fx-tentacles" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">${['M-10 300 C60 220 20 140 90 110', 'M410 300 C340 220 380 140 310 110', 'M-10 40 C70 60 60 130 120 150', 'M410 40 C330 60 340 130 280 150', 'M120 310 C140 250 100 220 150 190', 'M280 310 C260 250 300 220 250 190'].map(d => `<path d="${d}"/>`).join('')}</svg><div class="fx-eye"><i></i></div>`,
    beast: () => `<div class="fx-claws">${many(3, i => `<i style="--i:${i}"></i>`)}</div>`,
    monstrosity: () =>
      `<div class="fx-claws">${many(3, i => `<i style="--i:${i}"></i>`)}</div>${many(3, i => `<span class="fx-ring" style="--d:${(i * 0.25).toFixed(2)}s"></span>`)}`,
    swarm: () =>
      many(
        40,
        () =>
          `<span class="fx-bug" style="left:${rand(0, 100).toFixed(0)}%;top:${rand(0, 100).toFixed(0)}%;--x:${rand(-120, 120).toFixed(0)}px;--y:${rand(-120, 120).toFixed(0)}px;--d:${rand(0, 0.8).toFixed(2)}s"></span>`,
      ),
    warband: () =>
      `${many(9, i => `<span class="fx-arrow" style="top:${(8 + i * 10 + rand(-3, 3)).toFixed(0)}%;--d:${rand(0, 0.9).toFixed(2)}s;--r:${rand(-8, 8).toFixed(0)}deg"></span>`)}${many(2, i => `<span class="fx-ring drum" style="--d:${(0.2 + i * 0.5).toFixed(2)}s"></span>`)}`,
    humanoid: () => `<div class="fx-blades"><i></i><i></i></div>`,
    web: () =>
      `<svg class="fx-web" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">${[0, 1]
        .map(side => {
          const x = side ? 400 : 0,
            dir = side ? -1 : 1;
          const spokes = [0, 20, 40, 60, 80].map(a => {
            const r = (a * Math.PI) / 180;
            return `M${x} 0 L${x + dir * Math.cos(r) * 260} ${Math.sin(r) * 260}`;
          });
          const rings = [60, 120, 180].map(
            rr =>
              `M${x + dir * rr} 0 ${[20, 40, 60, 80].map(a => `L${x + dir * Math.cos((a * Math.PI) / 180) * rr} ${Math.sin((a * Math.PI) / 180) * rr}`).join(' ')}`,
          );
          return [...spokes, ...rings].map(d => `<path d="${d}"/>`).join('');
        })
        .join('')}</svg><div class="fx-spider"><i></i></div>`,
    elemental: () => `<div class="fx-vortex"></div>`,
    construct: () =>
      `${[0, 1].map(i => `<svg class="fx-gear g${i}" viewBox="0 0 100 100" aria-hidden="true"><path d="${gear()}"/><circle cx="50" cy="50" r="14"/></svg>`).join('')}`,
    plant: () =>
      `<svg class="fx-vines" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">${['M0 300 C40 240 10 200 60 170 C90 150 70 110 110 90', 'M400 300 C360 240 390 200 340 170 C310 150 330 110 290 90', 'M0 0 C50 40 30 80 80 100', 'M400 0 C350 40 370 80 320 100'].map(d => `<path d="${d}"/>`).join('')}</svg>`,
    ooze: () =>
      many(
        10,
        i =>
          `<span class="fx-drip" style="left:${(5 + i * 10 + rand(-3, 3)).toFixed(0)}%;--d:${rand(0, 0.8).toFixed(2)}s;--l:${rand(20, 60).toFixed(0)}%"></span>`,
      ),
    fey: () =>
      many(
        26,
        () =>
          `<span class="fx-spark fey" style="left:${rand(2, 98).toFixed(0)}%;top:${rand(2, 98).toFixed(0)}%;--d:${rand(0, 1.6).toFixed(2)}s"></span>`,
      ),
    celestial: () => `<div class="fx-rays"></div>`,
  };
  function gear() {
    let d = '';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2,
        b = a + Math.PI / 12;
      const p = (r, t) => `${(50 + r * Math.cos(t)).toFixed(1)} ${(50 + r * Math.sin(t)).toFixed(1)}`;
      d += `${i ? 'L' : 'M'}${p(46, a - 0.12)} L${p(46, a + 0.12)} L${p(36, b - 0.1)} L${p(36, b + 0.1)} `;
    }
    return d + 'Z';
  }
  function show({ style = 'battle', cry = '¡Combate!', count = 0, theme = '', variant = '' } = {}) {
    document.getElementById('encounter-fx')?.remove();
    clearTimeout(timer);
    const box = document.createElement('div');
    box.id = 'encounter-fx';
    box.className = 'enc-fx enc-' + (['battle', 'ambush', 'boss', 'reinforce'].includes(style) ? style : 'battle');
    box.setAttribute('role', 'alert');
    const layer = THEMES[theme]
      ? `<div class="enc-theme theme-${theme} ${variant ? 'v-' + esc(variant) : ''}" aria-hidden="true">${THEMES[theme]()}</div>`
      : '';
    box.innerHTML = `<div class="enc-flash"></div>${layer}<div class="enc-text"><span class="enc-swords" aria-hidden="true">⚔</span><strong>${esc(cry)}</strong>${count ? `<small>${count} ${count === 1 ? 'enemigo' : 'enemigos'}</small>` : ''}</div>`;
    box.addEventListener('click', () => box.remove());
    (document.querySelector('dialog[open]') || document.body).append(box);
    document.body.classList.remove('enc-shake', 'enc-stomp');
    void document.body.offsetWidth;
    document.body.classList.add(theme === 'giant' ? 'enc-stomp' : 'enc-shake');
    navigator.vibrate?.([120, 60, 220]);
    timer = setTimeout(() => {
      box.remove();
      document.body.classList.remove('enc-shake', 'enc-stomp');
    }, 3200);
  }
  return { show, themes: Object.keys(THEMES) };
})();
