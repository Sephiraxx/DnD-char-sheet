/* Geometría, materiales e iluminación de las figuras de sobremesa. */
(function (root) {
  'use strict';
  const pixelsPerSquare = 64;
  const metal = (color, strength = 0.72, roughness = 0.28) => ({
    color,
    metallic: strength,
    roughness,
    shine: 50 + strength * 80,
  });

  function lighting(x, y, z, shine, rimPower, metallic, roughness) {
    const length = Math.hypot(x, y, z) || 1;
    x /= length;
    y /= length;
    z /= length;
    const key = Math.max(0, -0.46 * x + 0.72 * y + 0.52 * z);
    const rim = Math.max(0, 0.76 * x + 0.54 * y - 0.36 * z);
    const gloss = Math.max(0, -0.26 * x + 0.4 * y + 0.88 * z) ** (8 + 25 * (1 - roughness));
    // A broad reflected softbox and a tighter highlight make the reflection read at board scale.
    const softbox = Math.max(0, 0.62 * x + 0.51 * y + 0.59 * z) ** (4 + roughness * 4);
    const diffuse = (0.51 + key * 0.65 + rim * 0.24 + Math.max(0, z) * 0.09) * (1 - metallic * 0.45);
    return [
      diffuse + metallic * softbox * 0.75,
      gloss * shine + metallic * softbox * 64,
      rim ** 2 * rimPower * (1 - metallic * 0.32),
    ];
  }

  function rasterize(ctx, faces, width, height, scale, originX, originY, outline = true) {
    const image = ctx.createImageData(width, height);
    const pixels = image.data;
    const depth = new Float32Array(width * height).fill(-Infinity);
    const layers = faces.filter(face => face.layered).sort((a, b) => a.z - b.z);
    for (const face of layers.length ? [...faces.filter(face => !face.layered), ...layers] : faces) {
      const points = face.p.map(([x, y, z]) => [originX + x * scale, originY - y * scale, z]);
      const [r, g, b] = face.rgb;
      const a = points[0];
      for (let i = 1; i < points.length - 1; i++) {
        const q = points[i],
          c = points[i + 1];
        const area = (q[1] - c[1]) * (a[0] - c[0]) + (c[0] - q[0]) * (a[1] - c[1]);
        if (Math.abs(area) < 1e-7) continue;
        const waX = (q[1] - c[1]) / area,
          waY = (c[0] - q[0]) / area;
        const wbX = (c[1] - a[1]) / area,
          wbY = (a[0] - c[0]) / area;
        const left = Math.max(0, Math.floor(Math.min(a[0], q[0], c[0])));
        const right = Math.min(width - 1, Math.ceil(Math.max(a[0], q[0], c[0])));
        const top = Math.max(0, Math.floor(Math.min(a[1], q[1], c[1])));
        const bottom = Math.min(height - 1, Math.ceil(Math.max(a[1], q[1], c[1])));
        const [lightA, highlightA, rimA] = face.lights[0];
        const [lightB, highlightB, rimB] = face.lights[i];
        const [lightC, highlightC, rimC] = face.lights[i + 1];
        for (let y = top; y <= bottom; y++) {
          const dy = y + 0.5 - c[1];
          let wa = waX * (left + 0.5 - c[0]) + waY * dy;
          let wb = wbX * (left + 0.5 - c[0]) + wbY * dy;
          for (let x = left; x <= right; x++, wa += waX, wb += wbX) {
            const wc = 1 - wa - wb;
            if (Math.min(wa, wb, wc) < -1e-6) continue;
            const z = wa * a[2] + wb * q[2] + wc * c[2];
            const index = y * width + x;
            if (z <= depth[index]) continue;
            if (!face.layered) depth[index] = z;
            const light = wa * lightA + wb * lightB + wc * lightC;
            const gloss = wa * highlightA + wb * highlightB + wc * highlightC;
            const rim = wa * rimA + wb * rimB + wc * rimC;
            const p = index * 4;
            const neutral = face.neutral;
            const red = Math.min(255, r * light + gloss + rim * (neutral ? 0.8 : 0.58));
            const green = Math.min(255, g * light + gloss * (neutral ? 1 : 0.94) + rim * 0.8);
            const blue = Math.min(255, b * light + gloss * (neutral ? 1 : 0.83) + rim * (neutral ? 0.8 : 1));
            const back = face.layered ? (pixels[p + 3] / 255) * (1 - face.alpha) : 0;
            const coverage = back + face.alpha;
            if (!coverage) continue;
            pixels[p] = (red * face.alpha + pixels[p] * back) / coverage;
            pixels[p + 1] = (green * face.alpha + pixels[p + 1] * back) / coverage;
            pixels[p + 2] = (blue * face.alpha + pixels[p + 2] * back) / coverage;
            pixels[p + 3] = coverage * 255;
          }
        }
      }
    }
    // El contorno mantiene la silueta visible sobre terreno claro u oscuro.
    const step = 2;
    if (outline)
      for (let y = step; y < height - step; y++)
        for (let x = step; x < width - step; x++) {
          const index = y * width + x;
          if (
            pixels[index * 4 + 3] ||
            (depth[index - step] === -Infinity &&
              depth[index + step] === -Infinity &&
              depth[index - width * step] === -Infinity &&
              depth[index + width * step] === -Infinity)
          )
            continue;
          pixels.set([14, 16, 22, 208], index * 4);
        }
    ctx.putImageData(image, 0, 0);
  }

  // ---------------------------------------------------------------- pixel-art mode
  // Same sculptures, drawn the way a sprite artist would: a 4-step ramp per material lit by colour
  // (cool violet shade, warm highlight), ordered dither between steps, a dark coloured outline round
  // the silhouette and a darker line wherever one part passes in front of another.
  function hsl([r, g, b]) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function rgbOf(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    if (!s) return [l * 255, l * 255, l * 255].map(Math.round);
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s,
      p = 2 * l - q;
    const channel = t => {
      t = (t + 1) % 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)].map(v => Math.round(v * 255));
  }
  const toward = (h, target, k) => h + (((((target - h) % 360) + 540) % 360) - 180) * k;
  // Steps are the material under four light levels (the same multiply the smooth renderer uses),
  // then pushed: shade toward violet, highlight toward warm yellow.
  function ramp(face) {
    if (face.tones) return face.tones;
    const lit = k => hsl(face.rgb.map(c => Math.min(255, c * k)));
    const grey = face.neutral || hsl(face.rgb)[1] < 0.08;
    const [h0, s0, l0] = lit(0.62);
    const [h1, s1, l1] = lit(0.86);
    const [h2, s2, l2] = lit(1.1);
    const [h3, s3, l3] = lit(1.1);
    face.tones = [
      rgbOf(toward(h0, 255, grey ? 0 : 0.14), grey ? 0.1 : s0 * 1.05, l0),
      rgbOf(toward(h1, 255, grey ? 0 : 0.04), grey ? Math.min(s1, 0.06) : s1, l1),
      rgbOf(h2, grey ? Math.min(s2, 0.05) : s2, l2),
      rgbOf(toward(h3, 48, grey ? 0 : 0.2), s3 * 0.75, l3 + (1 - l3) * 0.45),
    ];
    face.ink = rgbOf(toward(h0, 255, grey ? 0 : 0.3), grey ? 0.15 : Math.min(1, s0 + 0.1), Math.min(0.15, l0 * 0.35));
    return face.tones;
  }
  const bayer = [0, 2, 3, 1];
  function rasterizePixel(ctx, faces, width, height, scale, originX, originY) {
    const image = ctx.createImageData(width, height);
    const pixels = image.data;
    const depth = new Float32Array(width * height).fill(-Infinity);
    const owner = new Int32Array(width * height).fill(-1);
    const layers = faces.filter(face => face.layered).sort((a, b) => a.z - b.z);
    const order = layers.length ? [...faces.filter(face => !face.layered), ...layers] : faces;
    order.forEach((face, id) => {
      const points = face.p.map(([x, y, z]) => [originX + x * scale, originY - y * scale, z]);
      const tones = ramp(face);
      const a = points[0];
      for (let i = 1; i < points.length - 1; i++) {
        const q = points[i],
          c = points[i + 1];
        const area = (q[1] - c[1]) * (a[0] - c[0]) + (c[0] - q[0]) * (a[1] - c[1]);
        if (Math.abs(area) < 1e-7) continue;
        const waX = (q[1] - c[1]) / area,
          waY = (c[0] - q[0]) / area;
        const wbX = (c[1] - a[1]) / area,
          wbY = (a[0] - c[0]) / area;
        const left = Math.max(0, Math.floor(Math.min(a[0], q[0], c[0])));
        const right = Math.min(width - 1, Math.ceil(Math.max(a[0], q[0], c[0])));
        const top = Math.max(0, Math.floor(Math.min(a[1], q[1], c[1])));
        const bottom = Math.min(height - 1, Math.ceil(Math.max(a[1], q[1], c[1])));
        const A = face.lights[0],
          B = face.lights[i],
          C = face.lights[i + 1];
        for (let y = top; y <= bottom; y++) {
          const dy = y + 0.5 - c[1];
          let wa = waX * (left + 0.5 - c[0]) + waY * dy;
          let wb = wbX * (left + 0.5 - c[0]) + wbY * dy;
          for (let x = left; x <= right; x++, wa += waX, wb += wbX) {
            const wc = 1 - wa - wb;
            if (Math.min(wa, wb, wc) < -1e-6) continue;
            const z = wa * a[2] + wb * q[2] + wc * c[2];
            const index = y * width + x;
            if (z <= depth[index]) continue;
            if (face.layered && face.alpha < 0.5 && (x + y) & 1) continue; // see-through as a checker
            if (!face.layered || face.alpha >= 0.5) depth[index] = z;
            const light = wa * A[0] + wb * B[0] + wc * C[0];
            const gloss = wa * A[1] + wb * B[1] + wc * C[1];
            const rim = wa * A[2] + wb * B[2] + wc * C[2];
            const t =
              light +
              Math.min(0.5, gloss / 160) +
              (rim / 255) * 0.3 +
              (bayer[(y & 1) * 2 + (x & 1)] / 4 - 0.375) * 0.045;
            const step = t < 0.7 ? 0 : t < 0.93 ? 1 : t < 1.32 && gloss < 90 ? 2 : 3;
            const p = index * 4;
            pixels.set(tones[step], p);
            pixels[p + 3] = 255;
            owner[index] = id;
          }
        }
      }
    });
    // Inner lines: the part behind gets a dark edge where a nearer part overlaps it.
    const inner = new Uint8Array(width * height);
    const gap = 0.07;
    for (let y = 1; y < height - 1; y++)
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        if (owner[i] < 0) continue;
        for (const j of [i - 1, i + 1, i - width, i + width])
          if (owner[j] >= 0 && depth[j] - depth[i] > gap) inner[i] = 1;
      }
    for (let i = 0; i < inner.length; i++)
      if (inner[i]) {
        const face = order[owner[i]];
        const d = face.tones[0];
        pixels.set([d[0] * 0.62, d[1] * 0.62, d[2] * 0.68].map(Math.round), i * 4);
      }
    // Outline: tinted by the part it wraps, never flat black.
    const solid = new Uint8Array(width * height);
    for (let i = 0; i < solid.length; i++) solid[i] = owner[i] >= 0 ? 1 : 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (solid[i]) continue;
        const n = [x > 0 && i - 1, x < width - 1 && i + 1, y > 0 && i - width, y < height - 1 && i + width].find(
          j => j !== false && solid[j],
        );
        if (n === undefined) continue;
        pixels.set(order[owner[n]].ink, i * 4);
        pixels[i * 4 + 3] = 255;
      }
    ctx.putImageData(image, 0, 0);
  }

  function create(facing, context) {
    const faces = [],
      turn = ((context?.miniProfile ? 90 : facing + (context?.miniRotation || 0)) * Math.PI) / 180,
      ct = Math.cos(turn),
      st = Math.sin(turn);
    const tabletop = !!context?.miniBoard,
      collecting = typeof context?.captureMesh === 'function',
      pitch = ((context?.miniProfile ? 0 : tabletop ? 55 : 20) * Math.PI) / 180,
      cp = Math.cos(pitch),
      sp = Math.sin(pitch);
    let scale = 1,
      ox = 0,
      oy = 0,
      oz = 0,
      handedness = 1,
      tilt = null,
      buildingBase = false;
    const rimPower = context?.miniRim || 31;
    const figureGrowth = 1.17 * (context?.miniFigureScale || 1);
    function offset(x, y, z, side = 1, angle = 0, pitch = 0) {
      tilt = angle || pitch ? [Math.cos(angle), Math.sin(angle), Math.cos(pitch), Math.sin(pitch)] : null;
      handedness = side;
      ox = x;
      oy = y;
      oz = z;
    }
    function figureScale(value) {
      scale = value;
    }
    function modelPoint([x, y, z]) {
      if (tilt) {
        const [ca, sa, cp, sp] = tilt;
        const up = y * cp - z * sp;
        z = y * sp + z * cp;
        [x, y] = [x * ca + up * sa, up * ca - x * sa];
      }
      x = x * handedness + ox;
      y += oy;
      z += oz;
      if (buildingBase) return [x, y, z];
      const figure = scale * figureGrowth;
      return [x * figure, 0.108 + (y - 0.188) * figure, z * figure];
    }
    function camera(point) {
      const [x, y, z] = modelPoint(point);
      const rx = x * ct + z * st,
        rz = z * ct - x * st;
      return [rx, y * cp - rz * sp, rz * cp + y * sp];
    }
    function polygon(points, material, edge = 0.002, normals) {
      const fixture = buildingBase || material.stand;
      if ((context?.miniLayer === 'fixture' && !fixture) || (context?.miniLayer === 'figure' && fixture)) return;
      if (material.fadeBelow) {
        const y = points.reduce((sum, point) => sum + point[1], 0) / points.length;
        const t = Math.min(1, Math.max(0, (y - 0.19) / (material.fadeBelow - 0.19)));
        material = { ...material, alpha: material.fadeFloor + t * (material.alpha - material.fadeFloor) };
      }
      if (collecting) {
        const world = points.map(modelPoint);
        if (handedness < 0) world.reverse();
        context.captureMesh(world, material, buildingBase);
        return;
      }
      const p = points.map(camera);
      if (handedness < 0) {
        p.reverse();
        if (normals) normals.reverse();
      }
      const [a, b, c] = p;
      const u = b.map((v, i) => v - a[i]),
        v = c.map((n, i) => n - a[i]);
      const nx = u[1] * v[2] - u[2] * v[1],
        ny = u[2] * v[0] - u[0] * v[2],
        nz = u[0] * v[1] - u[1] * v[0];
      if (nz <= 0) return;
      const {
        color,
        shine = 5,
        alpha = 1,
        emission = 0,
        metallic = 0,
        roughness = 0.68,
        layered = false,
      } = typeof material === 'string' ? { color: material } : material;
      const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
      const light = lighting(nx, ny, nz, shine, rimPower, metallic, roughness);
      light[0] += emission * 0.32;
      const zero = !tabletop && normals && camera([0, 0, 0]);
      const lights = zero
        ? normals.map(n => lighting(...camera(n).map((v, k) => v - zero[k]), shine, rimPower, metallic, roughness))
        : p.map(() => light);
      const flat = rgb.map((channel, i) =>
        Math.min(255, Math.round(channel * light[0] + light[1] + light[2] * [0.58, 0.8, 1][i])),
      );
      faces.push({
        p,
        alpha,
        layered,
        neutral: metallic > 0 && Math.max(...rgb) - Math.min(...rgb) <= 3,
        rgb,
        lights,
        edge,
        z: p.reduce((sum, n) => sum + n[2], 0) / p.length,
        color: 'rgb(' + flat.join(',') + ')',
      });
    }
    // Secciones horizontales [altura, radio X, radio Z, desplazamiento X, desplazamiento Z].
    function form(x, y, z, sections, color, sides = 12, smooth = false) {
      if (sections[0][0] > sections.at(-1)[0]) sections = [...sections].reverse();
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
      const normals =
        smooth &&
        rings.map((ring, j) => {
          const prev = rings[Math.max(0, j - 1)],
            next = rings[Math.min(rings.length - 1, j + 1)];
          return ring.map((_, i) => {
            const a = next[i].map((v, k) => v - prev[i][k]);
            const b = ring[(i + 1) % sides].map((v, k) => v - ring[(i + sides - 1) % sides][k]);
            return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
          });
        });
      for (let j = 1; j < rings.length; j++)
        for (let i = 0; i < sides; i++) {
          const k = (i + 1) % sides;
          polygon(
            [rings[j - 1][i], rings[j][i], rings[j][k], rings[j - 1][k]],
            color,
            undefined,
            normals && [normals[j - 1][i], normals[j][i], normals[j][k], normals[j - 1][k]],
          );
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
        16,
        true,
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
      if (!collecting) polygon([c, b, a], color, edge);
    }
    function base(gold, length = 1) {
      if (context?.miniHideBase) return;
      buildingBase = true;
      form(
        0,
        0,
        0,
        [
          [0, 0.674, 0.674 * length],
          [0.024, 0.718, 0.718 * length],
          [0.055, 0.718, 0.718 * length],
          [0.104, 0.642, 0.642 * length],
        ],
        '#535861',
        24,
      );
      form(
        0,
        0.023,
        0,
        [
          [0, 0.719, 0.719 * length],
          [0.012, 0.719, 0.719 * length],
        ],
        metal(gold),
        24,
      );
      form(
        0,
        0.104,
        0,
        [
          [0, 0.642, 0.642 * length],
          [0.004, 0.632, 0.632 * length],
        ],
        '#737983',
        24,
      );
      buildingBase = false;
    }
    function paint(ctx, size, zoom, focus) {
      if (collecting) return;
      if (tabletop) {
        // miniPixel = art pixels per 5 ft square; the sprite is then blown up with nearest-neighbour.
        const pixel = context?.miniPixel;
        const scale = (pixel ? (size / pixelsPerSquare) * pixel : size) / 1.438;
        let minX = 0,
          maxX = 0,
          minY = 0,
          maxY = 0;
        for (const face of faces)
          for (const [x, y] of face.p) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, -y);
            maxY = Math.max(maxY, -y);
          }
        const left = Math.floor(minX * scale) - 4,
          top = Math.floor(minY * scale) - 4;
        const width = Math.ceil(maxX * scale) - left + 4,
          height = Math.ceil(maxY * scale) - top + 4;
        ctx.canvas.width = width;
        ctx.canvas.height = height;
        ctx.canvas.anchor = { x: -left, y: -top };
        if (pixel) return rasterizePixel(ctx, faces, width, height, scale, -left, -top);
        return rasterize(ctx, faces, width, height, scale, -left, -top, false);
      }
      let scale = size * zoom;
      // Las orejas largas y las alas deben entrar en la casilla incluso en una figura alta.
      if (!focus)
        for (const f of faces)
          for (const [x, y] of f.p) {
            if (Math.abs(x) * scale > size * 0.48) scale = (size * 0.48) / Math.abs(x);
            if (y * scale > size * 0.87) scale = (size * 0.87) / y;
            if (-y * scale > size * 0.09) scale = (size * 0.09) / -y;
          }
      const [x, y] = focus ? camera(focus) : [0, 0];
      const ox = size * 0.5 - x * scale;
      const oy = size * (focus ? 0.5 : 0.89) + y * scale;
      if (ctx.createImageData && ctx.putImageData) return rasterize(ctx, faces, size, size, scale, ox, oy);
      ctx.save();
      ctx.translate(ox, oy);
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
  root.MiniatureMesh = { create, metal, pixelsPerSquare };
})(globalThis);
