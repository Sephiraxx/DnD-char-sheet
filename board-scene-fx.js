/* Efectos visuales del tablero. Los conjuros se dibujan en unidades de casilla;
   el clima ocupa la parte del mapa que está dentro de la cámara. */
(function (root) {
  'use strict';
  const spells = { fire: 'Bola de fuego', lightning: 'Relámpago', frost: 'Explosión de hielo', heal: 'Curación' };
  const colors = {
    fire: '#ff8832',
    lightning: '#ac96ff',
    frost: '#82deff',
    heal: '#74f4ba',
    ácido: '#adf55c',
    contundente: '#d5aa86',
    cortante: '#eee1bb',
    fuerza: '#e085ff',
    necrótico: '#a37cce',
    perforante: '#b5c8e5',
    psíquico: '#ff8bcc',
    radiante: '#ffdf6b',
    trueno: '#8bc8fb',
    veneno: '#71d99d',
    magic: '#d3bcff',
  };
  const typeKey = t => ({ fuego: 'fire', frío: 'frost', relámpago: 'lightning' })[t] || t;
  const tau = 2 * Math.PI;
  const particles = Array.from({ length: 96 }, (_, i) => ({
    x: root.BoardArt.hash(5, i),
    y: root.BoardArt.hash(13, i),
    size: root.BoardArt.hash(37, i),
  }));
  function glow(ctx, x, y, radius, center, middle) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, center);
    g.addColorStop(0.4, middle);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  function ring(ctx, radius) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, tau);
    ctx.stroke();
  }
  function spell(ctx, kind, t) {
    const color = colors[kind];
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - t) * 3);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 0, 0, 0.65 + t * 1.4, color, color + '55');
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.045;
    ring(ctx, 0.18 + Math.sin((t * Math.PI) / 2) * 1.45);
    if (kind === 'lightning') {
      ctx.beginPath();
      ctx.moveTo(-0.65, -2.8);
      ctx.lineTo(-0.12, -1.72);
      ctx.lineTo(-0.43, -1.54);
      ctx.lineTo(0.1, -0.92);
      ctx.lineTo(-0.12, -0.65);
      ctx.lineTo(0, 0);
      ctx.moveTo(-0.12, -1.72);
      ctx.lineTo(0.54, -1.43);
      ctx.lineTo(0.73, -0.94);
      ctx.lineJoin = 'round';
      ctx.lineWidth = 0.19 * (1 - t) + 0.02;
      ctx.stroke();
      ctx.strokeStyle = '#fbf8ff';
      ctx.lineWidth *= 0.35;
      ctx.stroke();
    } else if (kind === 'trueno' || kind === 'psíquico') {
      for (let i = 0; i < 3; i++) {
        const beat = Math.max(0, Math.min(1, (t - i * 0.13) / 0.72));
        if (beat === 0 || beat === 1) continue;
        ctx.globalAlpha = (1 - beat) * 0.85;
        const distance = kind === 'psíquico' ? 1 - beat : 1 - (1 - beat) ** 2;
        ring(ctx, 0.12 + distance * 1.55);
      }
    } else if (kind === 'cortante' || kind === 'perforante') {
      // La estela sigue a la punta y se recoge al terminar el impacto.
      const tip = Math.min(1, t * 2.8);
      const tail = Math.min(tip, Math.max(0, (t - 0.18) * 1.8));
      ctx.rotate(kind === 'cortante' ? -0.65 : -0.32);
      ctx.lineCap = 'round';
      for (const offset of kind === 'cortante' ? [-0.17, 0.17] : [0]) {
        ctx.beginPath();
        ctx.moveTo(tail * 2.6 - 1.3, offset + 0.24 * Math.sin(tail * Math.PI));
        ctx.lineTo(tip * 2.6 - 1.3, offset + 0.24 * Math.sin(tip * Math.PI));
        ctx.stroke();
      }
    } else if (kind === 'heal') {
      ctx.strokeStyle = '#d7ffe9';
      for (let i = 0; i < 7; i++) {
        const p = particles[i],
          x = (p.x - 0.5) * 1.9,
          y = p.y * 0.8 - t * 1.7;
        const size = 0.08 + p.size * 0.08;
        ctx.beginPath();
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + size, y);
        ctx.moveTo(x, y - size);
        ctx.lineTo(x, y + size);
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < 20; i++) {
        const p = particles[i],
          angle = tau * p.x,
          reach = (0.2 + Math.sqrt(t) * 1.8) * (0.45 + p.y * 0.55);
        ctx.save();
        ctx.rotate(angle);
        ctx.translate(0, -reach);
        if (kind === 'frost') {
          ctx.beginPath();
          ctx.moveTo(0, -0.36 * p.size - 0.12);
          ctx.lineTo(0.085, 0.03);
          ctx.lineTo(0, 0.16);
          ctx.lineTo(-0.085, 0.03);
          ctx.closePath();
          ctx.fillStyle = i % 2 ? '#8bd8fa' : '#defaff';
          ctx.fill();
        } else {
          glow(ctx, 0, 0, 0.15 + (1 - t) * p.size * 0.56, kind === 'fire' ? '#fff2ad' : color, color + 'aa');
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }
  function weather(ctx, kind, width, height, seconds) {
    ctx.save();
    if (kind === 'mist') {
      ctx.fillStyle = 'rgba(148,174,184,0.1)';
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 14; i++) {
        const p = particles[i],
          r = (0.19 + p.size * 0.2) * width;
        const x = ((p.x + seconds * 0.011) % 1) * (width + 2 * r) - r;
        ctx.save();
        ctx.translate(x, (p.y + 0.05 * Math.sin(seconds * 0.23 + i)) * height);
        ctx.scale(1, 0.48);
        glow(ctx, 0, 0, r, '#c3d6d53d', '#cad9dc28');
        ctx.restore();
      }
    } else {
      ctx.fillStyle = kind === 'storm' ? 'rgba(30,46,78,0.24)' : 'rgba(35,63,79,0.12)';
      ctx.fillRect(0, 0, width, height);
      const count = kind === 'storm' ? 96 : 50;
      ctx.strokeStyle = kind === 'storm' ? '#cee5f2a6' : '#a6d0e37a';
      ctx.lineWidth = 1.45;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const p = particles[i],
          phase = (p.y + seconds * (0.65 + p.size * 0.4)) % 1;
        const x = (p.x * width + width + 22 - phase * 95) % (width + 22);
        const y = phase * (height + 30) - 15,
          length = 8 + 12 * p.size;
        ctx.moveTo(x, y);
        ctx.lineTo(x - length * 0.32, y + length);
      }
      ctx.stroke();
      // Resplandor gradual de la tormenta, sin destellos bruscos.
      if (kind === 'storm') {
        const glowAlpha = Math.max(0, Math.cos(seconds * 0.84)) ** 12 * 0.12;
        ctx.fillStyle = `rgba(193,199,242,${glowAlpha})`;
        ctx.fillRect(0, 0, width, height);
      }
    }
    ctx.restore();
  }
  root.BoardSceneFX = { spells, spell, weather, colors, typeKey };
})(typeof window !== 'undefined' ? window : globalThis);
