/* Capas de tela, peinados y objetos modelados sobre los puntos de la figura. */
(function (root) {
  'use strict';
  const leather = '#654636',
    bone = '#e3d6bc';
  function shade(color, factor) {
    return (
      '#' +
      [1, 3, 5]
        .map(i =>
          Math.min(255, Math.round(parseInt(color.slice(i, i + 2), 16) * factor))
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')
    );
  }
  function seam(mesh, points, r, color) {
    for (let i = 1; i < points.length; i++) mesh.rod(points[i - 1], points[i], r, r, color, 6);
  }
  function panel(mesh, rows, color) {
    for (let i = 1; i < rows.length; i++) {
      const [a, b] = rows[i - 1],
        [c, d] = rows[i];
      const count = Math.max(1, Math.ceil(Math.abs(c[1] - a[1]) / 0.085));
      let left = a,
        right = b;
      for (let j = 1; j <= count; j++) {
        const t = j / count,
          nextLeft = a.map((v, k) => v + (c[k] - v) * t),
          nextRight = b.map((v, k) => v + (d[k] - v) * t);
        mesh.membrane(left, right, nextLeft, color, 0.009);
        mesh.membrane(right, nextRight, nextLeft, color, 0.009);
        left = nextLeft;
        right = nextRight;
      }
    }
  }
  function clothing(mesh, m, body) {
    const { form, oval, rod } = mesh;
    const { chest, chestY, shoulderZ, hip, waist, beltY, belly, bellyZ } = body;
    const breast = shoulderZ + 0.232,
      buckle = belly + bellyZ + 0.035,
      collar = chestY + 0.092;
    // Raised cloth follows both sides of the belt and the flare of the hem.
    function strip(side, paths, color) {
      panel(
        mesh,
        paths.map(([x, y, z, w]) => [
          [side * x - w, y, z],
          [side * x + w, y, z],
        ]),
        color,
      );
    }
    const skirt = chestY - 0.68;
    if (m.outfit === 'vestments') {
      for (const side of [-1, 1]) {
        strip(
          side,
          [
            [0.12, collar, shoulderZ + 0.151, 0.046],
            [0.147, chestY - 0.07, breast, 0.048],
            [waist * 0.45, beltY + 0.04, buckle, 0.046],
            [hip * 0.5, skirt, 0.354, 0.05],
            [hip * 0.59, 0.62, 0.418, 0.054],
            [hip * 0.7, 0.328, 0.4, 0.058],
          ],
          m.accent,
        );
        seam(
          mesh,
          [
            [side * hip * 0.67 - 0.041, 0.43, 0.406],
            [side * hip * 0.67 + 0.041, 0.43, 0.406],
          ],
          0.009,
          bone,
        );
      }
    } else if (m.outfit === 'tabard') {
      strip(
        1,
        [
          [0, collar, shoulderZ + 0.145, chest * 0.5],
          [0, chestY - 0.06, breast + 0.026, chest * 0.57],
          [0, beltY + 0.03, buckle, waist * 0.57],
          [0, skirt, 0.244, hip * 0.65],
          [0, skirt - 0.22, 0.251, hip * 0.57],
        ],
        m.accent,
      );
      mesh.membrane(
        [-hip * 0.57, skirt - 0.22, 0.251],
        [hip * 0.57, skirt - 0.22, 0.251],
        [0, skirt - 0.36, 0.25],
        m.accent,
      );
    } else if (m.outfit === 'coat') {
      for (const side of [-1, 1]) {
        strip(
          side,
          [
            [0.13, collar + 0.035, shoulderZ + 0.11, 0.049],
            [0.19, chestY - 0.045, breast, 0.055],
            [0.1, beltY + 0.16, buckle + 0.003, 0.02],
            [0.11, beltY, buckle, 0.013],
            [0.12, skirt, 0.335, 0.018],
            [0.15, 0.62, 0.409, 0.02],
            [0.19, 0.34, 0.395, 0.025],
          ],
          shade(m.cloth, 0.64),
        );
        oval(side * 0.086, chestY - 0.17, Math.max(breast, buckle) + 0.022, 0.018, 0.018, 0.013, m.accent);
      }
    } else if (m.outfit === 'doublet') {
      for (let i = 0; i < 4; i++) {
        const t = i / 3,
          y = beltY + 0.1 + t * (chestY - beltY - 0.13);
        oval(0, y, (1 - t) * buckle + t * breast + 0.023, 0.025, 0.023, 0.015, m.accent);
      }
      for (const side of [-1, 1])
        oval(side * chest * 0.91, chestY + 0.014, shoulderZ + 0.018, 0.14, 0.105, 0.158, shade(m.cloth, 1.25));
    } else if (m.outfit === 'leathers') {
      form(
        0,
        chestY - 0.22,
        shoulderZ,
        [
          [0, chest * 0.92, 0.225],
          [0.12, chest * 1.07, 0.247],
          [0.23, chest * 0.98, 0.219],
          [0.29, chest * 0.72, 0.15],
        ],
        leather,
      );
      for (const s of [-1, 1])
        for (let i = 0; i < 3; i++)
          oval(
            s * (0.08 + i * 0.067),
            chestY - 0.115 + i * 0.018,
            breast + 0.005 - i * 0.02,
            0.016,
            0.016,
            0.012,
            m.accent,
          );
    }
    if (m.neck === 'scarf') {
      form(
        0,
        chestY + 0.085,
        shoulderZ,
        [
          [0, 0.223, 0.183],
          [0.043, 0.228, 0.191],
          [0.102, 0.184, 0.166],
        ],
        m.accent,
      );
      strip(
        -1,
        [
          [0.14, chestY + 0.131, shoulderZ + 0.14, 0.044],
          [0.17, chestY - 0.06, breast + 0.022, 0.052],
          [0.19, chestY - 0.2, Math.max(breast, buckle), 0.039],
        ],
        m.accent,
      );
    } else if (m.neck === 'pendant' || m.neck === 'skull') {
      const z = Math.max(breast + 0.039, buckle + 0.046),
        y = chestY - 0.175;
      for (const side of [-1, 1])
        seam(
          mesh,
          [
            [side * 0.112, collar + 0.004, shoulderZ + 0.15],
            [side * 0.095, chestY - 0.042, breast + 0.036],
            [0, y + 0.04, z],
          ],
          0.011,
          m.accent,
        );
      if (m.neck === 'skull') {
        oval(0, y, z, 0.065, 0.058, 0.03, bone);
        oval(0, y - 0.044, z + 0.003, 0.043, 0.028, 0.022, bone);
        for (const side of [-1, 1]) oval(side * 0.025, y + 0.002, z + 0.028, 0.014, 0.016, 0.006, '#393242');
      } else {
        oval(0, y, z, 0.063, 0.078, 0.028, m.accent);
        oval(0, y, z + 0.026, 0.033, 0.045, 0.014, '#639c95');
      }
    }
    const x = waist * 0.9,
      z = bellyZ + belly * 0.65;
    if (m.belt === 'pouch' || m.belt === 'satchel') {
      const bag = m.belt === 'satchel';
      if (bag)
        strip(
          1,
          [
            [-chest * 0.58, collar, shoulderZ + 0.11, 0.035],
            [-chest * 0.37, chestY - 0.08, breast + 0.02, 0.036],
            [waist * 0.32, beltY + 0.14, buckle + 0.014, 0.037],
            [x, beltY, z + 0.045, 0.04],
          ],
          leather,
        );
      oval(x, beltY - 0.096, z + 0.034, bag ? 0.145 : 0.105, bag ? 0.148 : 0.094, 0.067, leather);
      oval(x, beltY - 0.042, z + 0.087, bag ? 0.136 : 0.087, 0.059, 0.026, '#916449');
      oval(x, beltY - 0.072, z + 0.111, 0.019, 0.022, 0.009, m.accent);
    } else if (m.belt === 'vials') {
      for (const [i, color] of ['#56a19b', '#987caf', '#bd765b'].entries()) {
        const vx = x - i * 0.077,
          vz = z + 0.025 + i * 0.028;
        oval(vx, beltY - 0.08, vz, 0.036, 0.065, 0.038, color);
        rod([vx, beltY - 0.031, vz], [vx, beltY + 0.016, vz], 0.019, 0.018, bone);
      }
    }
  }
  function hairstyle(mesh, m, h, covered) {
    const { oval, form } = mesh,
      col = m.hairColor;
    // A braid can hang out of a hood; the crown stays tucked under the fabric.
    if (m.hair === 'braid') {
      for (let i = 0; i < 7; i++) {
        const y = h + 0.005 - i * 0.069,
          x = -0.214 - 0.029 * Math.sin(i * 0.94),
          z = 0.007 + i * 0.034;
        oval(x - 0.018, y, z, 0.068 - i * 0.004, 0.073, 0.057, col);
        oval(x + 0.025, y - 0.026, z + 0.011, 0.061 - i * 0.004, 0.063, 0.053, shade(col, 1.16));
      }
      oval(-0.218, h - 0.445, 0.211, 0.044, 0.025, 0.048, m.accent);
    }
    if (covered) return;
    if (m.hair === 'bun') {
      oval(0, h + 0.25, -0.12, 0.124, 0.065, 0.112, m.accent);
      oval(0, h + 0.326, -0.14, 0.15, 0.103, 0.137, col);
    } else if (m.hair === 'ponytail') {
      oval(0, h + 0.153, -0.219, 0.08, 0.08, 0.087, m.accent);
      form(
        0,
        h,
        -0.24,
        [
          [-0.233, 0.049, 0.062, 0.067, -0.128],
          [-0.087, 0.089, 0.09, 0.035, -0.142],
          [0.1, 0.117, 0.109, 0, -0.059],
          [0.167, 0.073, 0.072],
        ],
        col,
      );
    } else if (m.hair === 'bob') {
      for (const s of [-1, 1]) oval(s * 0.224, h - 0.005, -0.013, 0.088, 0.191, 0.166, col);
      oval(0, h - 0.025, -0.161, 0.249, 0.148, 0.117, col);
      oval(-0.068, h + 0.097, 0.173, 0.195, 0.063, 0.089, col);
    } else if (m.hair === 'curls' || m.hair === 'locs') {
      const locs = m.hair === 'locs';
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6,
          x = 0.231 * Math.sin(a),
          z = 0.201 * Math.cos(a),
          y = h + 0.119 + 0.025 * Math.cos(i * 2);
        if (locs) {
          const len = z > 0.12 ? 0.1 : 0.27 + 0.075 * (i % 3);
          seam(
            mesh,
            [
              [x, y + 0.036, z],
              [x * 1.12, y - 0.065, z * 1.16],
              [x * 1.06 + 0.022, y - len, z * 1.22],
            ],
            0.039,
            col,
          );
          oval(x * 1.06 + 0.022, y - len, z * 1.22, 0.041, 0.046, 0.041, col);
        } else oval(x, y, z, 0.101, 0.093, 0.092, i % 3 ? col : shade(col, 1.15));
      }
      if (!locs) for (const s of [-1, 0, 1]) oval(s * 0.127, h + 0.232, 0.01, 0.122, 0.096, 0.12, col);
    }
  }
  function hood(mesh, h, m) {
    const deep = m.headwear === 'cowl',
      col = m.headColor;
    // Rings retreat around the face, then close over the brow and the back of the head.
    const rings = [
      [-0.3, 0.229, 0.19, 0.25, 0.05],
      [-0.196, 0.307, 0.259, 0.53, 0.028],
      [-0.035, 0.339, 0.3, 0.69, 0.014],
      [0.129, 0.323, 0.329, deep ? 0.38 : 0.64, 0.018],
      [deep ? 0.185 : 0.217, 0.286, 0.31, 0, 0.011],
      [0.276, 0.202, 0.198, 0, -0.024],
      [deep ? 0.385 : 0.311, deep ? 0.026 : 0.088, 0.065, 0, -0.083],
    ].map(([y, w, d, opening, dz]) =>
      Array.from({ length: 19 }, (_, i) => {
        const a = opening + ((Math.PI * 2 - 2 * opening) * i) / 18;
        return [w * Math.sin(a), h + y, d * Math.cos(a) + dz];
      }),
    );
    for (let i = 1; i < rings.length; i++)
      for (let j = 1; j < rings[i].length; j++) {
        const a = rings[i - 1][j - 1],
          b = rings[i - 1][j],
          c = rings[i][j - 1],
          d = rings[i][j];
        mesh.membrane(a, b, c, col, 0.009);
        mesh.membrane(b, d, c, col, 0.009);
      }
    for (const index of [0, 18])
      seam(
        mesh,
        rings.slice(0, 5).map(row => row[index]),
        0.015,
        shade(col, 1.48),
      );
    mesh.form(
      0,
      h - 0.342,
      -0.01,
      [
        [0, 0.37, 0.238],
        [0.049, 0.32, 0.24],
        [0.118, 0.235, 0.181],
      ],
      col,
    );
  }
  function eyewear(mesh, m, h) {
    const y = h + 0.02,
      color = m.eyewear === 'patch' ? leather : m.accent;
    if (m.eyewear === 'none') return;
    for (const side of [-1, 1]) {
      if (side === 1 && ['monocle', 'patch'].includes(m.eyewear)) continue;
      const cx = side * 0.103,
        z = 0.262;
      if (m.eyewear === 'patch') {
        mesh.oval(cx, y, z, 0.086, 0.067, 0.025, '#42373b');
        seam(
          mesh,
          [
            [cx - 0.061, y + 0.02, z - 0.008],
            [-0.224, y + 0.09, 0.153],
            [-0.264, y + 0.108, -0.021],
          ],
          0.013,
          color,
        );
        seam(
          mesh,
          [
            [cx + 0.05, y + 0.018, z],
            [0.084, y + 0.104, 0.207],
            [0.255, y + 0.101, 0.054],
          ],
          0.012,
          color,
        );
      } else {
        const square = m.eyewear === 'square';
        const profile = square
          ? [
              [-1, -0.63],
              [-0.75, -1],
              [0.75, -1],
              [1, -0.63],
              [1, 0.72],
              [0.75, 1],
              [-0.75, 1],
              [-1, 0.72],
            ]
          : Array.from({ length: 14 }, (_, i) => [Math.cos((i * Math.PI) / 7), Math.sin((i * Math.PI) / 7)]);
        const rim = profile.map(([a, b]) => [cx + a * 0.085, y + b * (square ? 0.055 : 0.073), z - 0.02 * side * a]);
        seam(mesh, [...rim, rim[0]], 0.011, color);
        if (m.eyewear === 'monocle')
          seam(
            mesh,
            [
              [cx - 0.066, y - 0.04, z - 0.017],
              [-0.19, y - 0.157, 0.17],
              [-0.239, y - 0.185, 0.058],
            ],
            0.006,
            color,
          );
        else
          seam(
            mesh,
            [
              [side * 0.187, y + 0.005, z - 0.022],
              [side * 0.255, y + 0.012, 0.101],
              [side * 0.264, y - 0.015, -0.003],
            ],
            0.012,
            color,
          );
      }
    }
    if (['round', 'square'].includes(m.eyewear))
      seam(
        mesh,
        [
          [-0.025, y + 0.014, 0.28],
          [0, y + 0.027, 0.296],
          [0.025, y + 0.014, 0.28],
        ],
        0.01,
        color,
      );
  }
  function face(mesh, m, h, covered) {
    hairstyle(mesh, m, h, covered);
    if (m.beard !== 'none') {
      const col = m.hairColor;
      for (const s of [-1, 1]) mesh.oval(s * 0.06, h - 0.115, 0.208, 0.076, 0.029, 0.04, col);
      if (m.beard !== 'moustache') {
        mesh.form(
          0,
          h,
          0.11,
          [
            [-0.29, 0.079, 0.078],
            [-0.225, 0.154, 0.124],
            [-0.15, 0.207, 0.138],
            [-0.127, 0.18, 0.115],
          ],
          col,
        );
        if (m.beard === 'braided')
          for (let i = 0; i < 4; i++)
            mesh.oval(
              i % 2 ? 0.016 : -0.016,
              h - 0.25 - i * 0.057,
              0.17,
              0.072 - i * 0.01,
              0.067,
              0.059,
              i === 2 ? m.accent : col,
            );
      }
    }
    // Scar paths follow the cheek toward the ear; the eyelid remains visible.
    const mark =
      '#' +
      [1, 3, 5]
        .map((i, k) =>
          Math.round(parseInt(m.skin.slice(i, i + 2), 16) * 0.36 + [140, 64, 65][k] * 0.64)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('');
    if (m.scar === 'brow')
      seam(
        mesh,
        [
          [-0.141, h + 0.105, 0.174],
          [-0.091, h + 0.066, 0.229],
          [-0.065, h + 0.047, 0.244],
        ],
        0.012,
        mark,
      );
    if (m.scar === 'cheek' || m.scar === 'claw') {
      const n = m.scar === 'claw' ? 3 : 1;
      for (let i = 0; i < n; i++)
        seam(
          mesh,
          [
            [-0.207 + i * 0.029, h - 0.021, 0.157 + i * 0.025],
            [-0.169 + i * 0.028, h - 0.065, 0.2 + i * 0.012],
            [-0.143 + i * 0.028, h - 0.104, 0.209 + i * 0.01],
          ],
          0.01,
          mark,
        );
    }
    eyewear(mesh, m, h);
    if (['hood', 'cowl'].includes(m.headwear)) hood(mesh, h, m);
    else if (m.headwear === 'hat') {
      mesh.form(
        0,
        h + 0.12,
        -0.014,
        [
          [0, 0.389, 0.34],
          [0.034, 0.395, 0.341],
          [0.052, 0.242, 0.219],
          [0.194, 0.213, 0.175],
          [0.216, 0.171, 0.14],
        ],
        m.headColor,
      );
      mesh.form(
        0,
        h + 0.17,
        -0.014,
        [
          [0, 0.247, 0.22],
          [0.035, 0.241, 0.21],
        ],
        m.accent,
      );
    } else if (m.headwear === 'circlet') {
      mesh.form(
        0,
        h + 0.074,
        0,
        [
          [0, 0.284, 0.253],
          [0.028, 0.282, 0.251],
        ],
        m.accent,
      );
      mesh.oval(0, h + 0.078, 0.25, 0.037, 0.045, 0.018, m.accent);
    }
  }
  root.MiniatureWardrobe = { clothing, face };
})(globalThis);
