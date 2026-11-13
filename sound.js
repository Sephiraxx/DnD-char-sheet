/* Sonido de la mesa, hecho en el momento con Web Audio (sin archivos): el dado que rueda y cae,
   y el ambiente del mapa (taberna, cueva, bosque, lluvia…). Se apaga con un solo interruptor
   que se recuerda en este dispositivo. */
const Sound = (() => {
  'use strict';
  const KEY = 'dnd-sound';
  // Ambientes que el DM puede elegir para un mapa.
  const AMBIENTS = [
    ['', 'Sin sonido'],
    ['tavern', 'Taberna'],
    ['cave', 'Cueva'],
    ['dungeon', 'Mazmorra'],
    ['forest', 'Bosque'],
    ['rain', 'Lluvia'],
    ['sea', 'Mar'],
    ['fire', 'Fogata'],
    ['wind', 'Viento'],
  ];
  const AMBIENT_IDS = new Set(AMBIENTS.map(a => a[0]));
  const ambientId = v => (AMBIENT_IDS.has(v) ? v : '');
  const ambientName = v => AMBIENTS.find(a => a[0] === ambientId(v))[1];

  let ctx = null,
    master = null,
    noise = null,
    scene = null, // { id, gain, stop }
    wanted = '',
    off = false;
  try {
    off = localStorage.getItem(KEY) === 'off';
  } catch {
    off = false;
  }
  const listeners = new Set();
  const muted = () => off;
  function setMuted(v) {
    off = Boolean(v);
    try {
      localStorage.setItem(KEY, off ? 'off' : 'on');
    } catch {
      /* modo privado: vale solo para esta visita */
    }
    if (off) stopScene();
    else ambient(wanted);
    listeners.forEach(fn => fn(off));
  }
  const onChange = fn => listeners.add(fn);

  // El navegador solo deja sonar después de un toque o una tecla: hasta entonces no hay contexto.
  function audio() {
    if (off) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(ctx.destination);
        // Dos segundos de ruido que se repiten: la base de casi todo.
        noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx.state === 'closed' ? null : ctx;
    } catch {
      return null;
    }
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function burst({ at = 0, dur = 0.05, type = 'bandpass', freq = 2500, q = 1, vol = 0.2, to = null }) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + at,
      src = a.createBufferSource(),
      f = a.createBiquadFilter(),
      g = a.createGain();
    src.buffer = noise;
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src
      .connect(f)
      .connect(g)
      .connect(to || master);
    src.start(t, rnd(0, 1.5), dur + 0.02);
  }
  function tone({ at = 0, dur = 0.2, from = 440, to: end = from, type = 'sine', vol = 0.15, out = null }) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + at,
      o = a.createOscillator(),
      g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    if (end !== from) o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out || master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  // ---------- Dados ----------
  // Un golpecito por cada vuelta que da el dado sobre la mesa.
  // Un sonido que falla no puede romper una tirada.
  const safe =
    fn =>
    (...a) => {
      try {
        fn(...a);
      } catch {
        /* sin sonido */
      }
    };
  function tick() {
    burst({ dur: 0.035, freq: rnd(1800, 3600), q: 2.5, vol: 0.16 });
    burst({ dur: 0.05, type: 'lowpass', freq: rnd(300, 500), vol: 0.1 });
  }
  // El dado se queda quieto: golpe seco; campanas si es crítico, un tono que cae si es pifia.
  function land(kind = '') {
    burst({ dur: 0.09, type: 'lowpass', freq: 420, vol: 0.5 });
    tone({ dur: 0.14, from: 120, to: 55, vol: 0.35 });
    if (kind === 'crit') {
      [880, 1318.5, 1760].forEach((f, i) => tone({ at: 0.05 + i * 0.07, dur: 0.9, from: f, vol: 0.09 }));
    } else if (kind === 'fumble') {
      tone({ at: 0.06, dur: 0.55, from: 196, to: 82, type: 'triangle', vol: 0.16 });
    }
    try {
      if (!off) navigator.vibrate?.(kind === 'crit' ? [30, 40, 60] : kind === 'fumble' ? [90] : [25]);
    } catch {
      /* sin vibración */
    }
  }

  // ---------- Ambiente ----------
  function stopScene() {
    if (!scene) return;
    const s = scene;
    scene = null;
    clearInterval(s.timer);
    try {
      s.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      setTimeout(() => {
        s.nodes.forEach(n => {
          try {
            n.stop?.();
            n.disconnect();
          } catch {
            /* ya estaba suelto */
          }
        });
      }, 1600);
    } catch {
      /* contexto cerrado */
    }
  }
  // Ruido continuo filtrado; lfo = [hertz, profundidad] hace que suba y baje (olas, ráfagas).
  function bed(s, { type = 'lowpass', freq = 400, q = 0.7, vol = 0.2, lfo = null, sweep = null }) {
    const src = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    src.buffer = noise;
    src.loop = true;
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    g.gain.value = vol;
    src.connect(f).connect(g).connect(s.gain);
    src.start(0, rnd(0, 1.5));
    s.nodes.push(src, f, g);
    const wobble = (param, hz, depth) => {
      const o = ctx.createOscillator(),
        d = ctx.createGain();
      o.frequency.value = hz;
      d.gain.value = depth;
      o.connect(d).connect(param);
      o.start();
      s.nodes.push(o, d);
    };
    if (lfo) wobble(g.gain, lfo[0], vol * lfo[1]);
    if (sweep) wobble(f.frequency, sweep[0], sweep[1]);
  }
  const SCENES = {
    tavern(s) {
      // Murmullo de gente (varias bandas que suben y bajan) y el fuego del hogar.
      bed(s, { type: 'bandpass', freq: 340, q: 1.2, vol: 0.2, lfo: [0.31, 0.5] });
      bed(s, { type: 'bandpass', freq: 520, q: 1.6, vol: 0.14, lfo: [0.47, 0.6] });
      bed(s, { type: 'bandpass', freq: 760, q: 2, vol: 0.07, lfo: [0.73, 0.7] });
      bed(s, { type: 'lowpass', freq: 160, vol: 0.2 });
      return () => {
        if (Math.random() < 0.7) burst({ dur: 0.03, freq: rnd(1500, 4000), q: 1, vol: rnd(0.04, 0.12), to: s.gain });
        // Cada tanto, una jarra contra la mesa.
        if (Math.random() < 0.04) tone({ dur: 0.25, from: rnd(1400, 2200), vol: 0.03, out: s.gain });
      };
    },
    cave(s) {
      bed(s, { type: 'lowpass', freq: 140, vol: 0.3, lfo: [0.07, 0.4] });
      bed(s, { type: 'bandpass', freq: 900, q: 6, vol: 0.02, sweep: [0.05, 300] });
      return () => {
        if (Math.random() > 0.16) return;
        const f = rnd(900, 1700);
        tone({ dur: 0.09, from: f, to: f * 0.55, vol: 0.09, out: s.gain });
        tone({ at: 0.28, dur: 0.09, from: f, to: f * 0.55, vol: 0.03, out: s.gain });
        tone({ at: 0.56, dur: 0.09, from: f, to: f * 0.55, vol: 0.012, out: s.gain });
      };
    },
    dungeon(s) {
      bed(s, { type: 'lowpass', freq: 110, vol: 0.34, lfo: [0.05, 0.5] });
      bed(s, { type: 'bandpass', freq: 420, q: 8, vol: 0.025, sweep: [0.03, 160] });
      return () => {
        if (Math.random() < 0.03) tone({ dur: 2.4, from: rnd(48, 70), to: 40, vol: 0.12, out: s.gain });
        if (Math.random() < 0.03)
          burst({ dur: 0.12, type: 'bandpass', freq: rnd(2000, 3200), q: 8, vol: 0.03, to: s.gain });
      };
    },
    forest(s) {
      bed(s, { type: 'bandpass', freq: 700, q: 0.6, vol: 0.09, lfo: [0.11, 0.7] });
      bed(s, { type: 'highpass', freq: 3500, vol: 0.02, lfo: [0.19, 0.8] });
      return () => {
        if (Math.random() > 0.2) return;
        const f = rnd(2400, 4200),
          n = 1 + Math.floor(rnd(0, 4));
        for (let i = 0; i < n; i++)
          tone({ at: i * rnd(0.09, 0.14), dur: 0.07, from: f, to: f * rnd(1.15, 1.5), vol: 0.035, out: s.gain });
      };
    },
    rain(s) {
      bed(s, { type: 'highpass', freq: 1400, vol: 0.1, lfo: [0.09, 0.25] });
      bed(s, { type: 'bandpass', freq: 500, q: 0.5, vol: 0.1 });
      return () => {
        for (let i = 0; i < 3; i++)
          burst({ at: rnd(0, 0.25), dur: 0.02, freq: rnd(3000, 7000), q: 3, vol: rnd(0.02, 0.06), to: s.gain });
      };
    },
    sea(s) {
      bed(s, { type: 'lowpass', freq: 500, vol: 0.26, lfo: [0.1, 0.85], sweep: [0.1, 260] });
      bed(s, { type: 'highpass', freq: 2500, vol: 0.035, lfo: [0.1, 0.95] });
      return () => {
        // Madera que cruje.
        if (Math.random() < 0.04)
          tone({ dur: 0.5, from: rnd(90, 140), to: rnd(150, 220), type: 'sawtooth', vol: 0.02, out: s.gain });
      };
    },
    fire(s) {
      bed(s, { type: 'lowpass', freq: 220, vol: 0.24, lfo: [0.6, 0.3] });
      return () => {
        const n = Math.floor(rnd(0, 4));
        for (let i = 0; i < n; i++)
          burst({
            at: rnd(0, 0.25),
            dur: rnd(0.015, 0.05),
            freq: rnd(1200, 5000),
            q: 1,
            vol: rnd(0.04, 0.16),
            to: s.gain,
          });
      };
    },
    wind(s) {
      bed(s, { type: 'bandpass', freq: 480, q: 1.6, vol: 0.2, lfo: [0.08, 0.7], sweep: [0.06, 260] });
      bed(s, { type: 'bandpass', freq: 1100, q: 4, vol: 0.04, lfo: [0.13, 0.9], sweep: [0.09, 500] });
      return () => {};
    },
  };
  // Pone el ambiente del mapa (o lo saca con ''). Si todavía no hubo un toque, queda pedido y arranca después.
  function ambient(id) {
    wanted = ambientId(id);
    if (scene?.id === wanted) return;
    stopScene();
    if (!wanted) return;
    const a = audio();
    if (!a || a.state !== 'running') return;
    const s = { id: wanted, gain: a.createGain(), nodes: [], timer: 0 };
    s.gain.gain.value = 0;
    s.gain.connect(master);
    s.nodes.push(s.gain);
    try {
      const every = safe(SCENES[wanted](s));
      s.timer = setInterval(() => {
        if (!document.hidden && scene === s) every();
      }, 250);
      s.gain.gain.setTargetAtTime(0.55, a.currentTime, 0.8);
      scene = s;
    } catch {
      scene = s;
      stopScene();
    }
  }
  // Primer toque de la visita: ya se puede sonar, arranca el ambiente que estaba pedido.
  const wake = () => {
    if (wanted && !scene && !off) {
      audio();
      setTimeout(() => ambient(wanted), 60);
    }
  };
  if (typeof document !== 'undefined') {
    ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, wake, { passive: true }));
  }
  const playing = () => scene?.id || '';
  // Interruptor: cualquier botón con data-sound-toggle prende o apaga el sonido de este dispositivo.
  const label = () => (off ? 'Sonido apagado: tocá para prenderlo' : 'Sonido prendido: tocá para apagarlo');
  const toggleHTML = () =>
    `<button type="button" class="icon-btn" data-sound-toggle aria-pressed="${!off}" aria-label="${label()}" title="${label()}">${off ? '🔇' : '🔊'}</button>`;
  function paint() {
    document.querySelectorAll('[data-sound-toggle]').forEach(b => {
      b.textContent = off ? '🔇' : '🔊';
      b.setAttribute('aria-pressed', String(!off));
      b.setAttribute('aria-label', label());
      b.title = label();
    });
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('click', e => {
      const b = e.target.closest?.('[data-sound-toggle]');
      if (!b) return;
      e.stopPropagation();
      setMuted(!off);
      if (!off) safe(tick)();
    });
    onChange(paint);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint);
    else paint();
  }
  return {
    AMBIENTS,
    ambientId,
    ambientName,
    muted,
    setMuted,
    onChange,
    tick: safe(tick),
    land: safe(land),
    ambient,
    playing,
    toggleHTML,
    wanted: () => wanted,
  };
})();
