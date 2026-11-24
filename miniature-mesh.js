/* Malla de baja poligonización compartida por las figuras de sobremesa. */
(function (root) {
  'use strict';
  function create(facing) {
    const faces = [],
      turn = (facing * Math.PI) / 180,
      ct = Math.cos(turn),
      st = Math.sin(turn);
    const pitch = 0.27,
      cp = Math.cos(pitch),
      sp = Math.sin(pitch);
    let scale = 1,
      ox = 0,
      oy = 0,
      oz = 0,
      handedness = 1;
    function offset(x, y, z, side = 1) {
      handedness = side;
      ox = x;
      oy = y;
      oz = z;
    }
    function figureScale(value) {
      scale = value;
    }
    function camera([x, y, z]) {
      x = x * handedness + ox;
      y += oy;
      z += oz;
      const rx = x * ct + z * st,
        rz = z * ct - x * st;
      const level = 0.16 + (y - 0.16) * scale;
      return [rx * scale, level * cp - rz * scale * sp, rz * scale * cp + level * sp];
    }
    function polygon(points, color, edge = 0.002) {
      const p = points.map(camera);
      if (handedness < 0) p.reverse();
      const [a, b, c] = p;
      const u = b.map((v, i) => v - a[i]),
        v = c.map((n, i) => n - a[i]);
      const nx = u[1] * v[2] - u[2] * v[1],
        ny = u[2] * v[0] - u[0] * v[2],
        nz = u[0] * v[1] - u[1] * v[0];
      if (nz <= 0) return;
      const light = 0.74 + 0.43 * Math.max(0, (-0.46 * nx + 0.72 * ny + 0.52 * nz) / (Math.hypot(nx, ny, nz) || 1));
      const rgb = [1, 3, 5].map(i => Math.min(255, Math.round(parseInt(color.slice(i, i + 2), 16) * light)));
      faces.push({ p, edge, z: p.reduce((sum, n) => sum + n[2], 0) / p.length, color: 'rgb(' + rgb.join(',') + ')' });
    }
    // Secciones horizontales [altura, radio X, radio Z, desplazamiento X, desplazamiento Z].
    function form(x, y, z, sections, color, sides = 12) {
      // Las caras largas de dos piezas pueden cruzarse en la proyección. Dividirlas
      // mejora la oclusión del brazo, la empuñadura y el pelo al girar la figura.
      const slices = [sections[0]];
      for (let j = 1; j < sections.length; j++) {
        const a = sections[j - 1],
          b = sections[j],
          count = Math.ceil(Math.abs(b[0] - a[0]) / 0.11) || 1;
        for (let i = 1; i <= count; i++)
          slices.push(Array.from({ length: 5 }, (_, k) => (a[k] || 0) + (((b[k] || 0) - (a[k] || 0)) * i) / count));
      }
      const rings = slices.map(([dy, w, d, dx = 0, dz = 0]) =>
        Array.from({ length: sides }, (_, i) => {
          const a = (2 * Math.PI * i) / sides;
          return [x + dx + w * Math.cos(a), y + dy, z + dz + d * Math.sin(a)];
        }),
      );
      for (let j = 1; j < rings.length; j++)
        for (let i = 0; i < sides; i++) {
          const k = (i + 1) % sides;
          polygon([rings[j - 1][i], rings[j][i], rings[j][k], rings[j - 1][k]], color);
        }
      polygon(rings[0], color);
      polygon(rings.at(-1).slice().reverse(), color);
    }
    function oval(x, y, z, w, h, d, color) {
      form(
        x,
        y,
        z,
        [
          [-h, 0.18 * w, 0.18 * d],
          [-h * 0.62, w * 0.8, d * 0.8],
          [0, w, d],
          [h * 0.65, w * 0.77, d * 0.77],
          [h, 0.2 * w, 0.2 * d],
        ],
        color,
      );
    }
    function limb(a, b, r, tip, color) {
      const [x, y, z] = a;
      form(
        x,
        y,
        z,
        [
          [0, r, r],
          [b[1] - y, tip, tip, b[0] - x, b[2] - z],
        ],
        color,
        10,
      );
    }
    // Anillos perpendiculares al hueso, incluso para costillas y alas horizontales.
    function rod(a, b, radius, tip, color, sides = 8) {
      const delta = b.map((n, i) => n - a[i]);
      const length = Math.hypot(...delta);
      if (!length) return;
      const [x, y, z] = delta.map(n => n / length);
      const horizontal = Math.hypot(x, z);
      const u = horizontal ? [z / horizontal, 0, -x / horizontal] : [1, 0, 0];
      const v = [y * u[2], z * u[0] - x * u[2], -y * u[0]];
      const ring = (center, radius) =>
        Array.from({ length: sides }, (_, i) => {
          const angle = (i * 2 * Math.PI) / sides;
          return center.map((n, k) => n + radius * (u[k] * Math.cos(angle) + v[k] * Math.sin(angle)));
        });
      const from = ring(a, radius),
        to = ring(b, tip);
      for (let i = 0; i < sides; i++) {
        const j = (i + 1) % sides;
        polygon([from[i], from[j], to[j], to[i]], color);
      }
      polygon(from.slice().reverse(), color);
      polygon(to, color);
    }
    function membrane(a, b, c, color, edge) {
      polygon([a, b, c], color, edge);
      polygon([c, b, a], color, edge);
    }
    function base(gold) {
      form(
        0,
        0,
        0,
        [
          [0, 0.65, 0.51],
          [0.05, 0.7, 0.55],
          [0.12, 0.7, 0.55],
          [0.16, 0.63, 0.49],
        ],
        '#45515a',
        24,
      );
      form(
        0,
        0.105,
        0,
        [
          [0, 0.703, 0.552],
          [0.025, 0.691, 0.544],
        ],
        gold,
        24,
      );
    }
    function paint(ctx, size, zoom, focus) {
      ctx.save();
      let scale = size * zoom;
      // Las orejas largas y las alas deben entrar en la casilla incluso en una figura alta.
      if (!focus)
        for (const f of faces)
          for (const [x, y] of f.p) {
            if (Math.abs(x) * scale > size * 0.48) scale = (size * 0.48) / Math.abs(x);
            if (y * scale > size * 0.87) scale = (size * 0.87) / y;
            if (-y * scale > size * 0.09) scale = (size * 0.09) / -y;
          }
      if (focus) {
        const [x, y] = camera(focus);
        ctx.translate(size * 0.5 - x * scale, size * 0.5 + y * scale);
      } else ctx.translate(size * 0.5, size * 0.89);
      ctx.scale(scale, -scale);
      for (const f of faces.sort((a, b) => a.z - b.z)) {
        ctx.beginPath();
        f.p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle = f.color;
        ctx.lineWidth = f.edge;
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    return { form, oval, limb, rod, membrane, base, offset, figureScale, paint };
  }
  root.MiniatureMesh = { create };
})(globalThis);
