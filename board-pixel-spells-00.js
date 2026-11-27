/* Pixel spells, batch 00: the worked example every other batch copies (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const FIRE = k.palettes.FIRE;
  const SMOKE = k.palettes.SMOKE;

  // Fire Bolt: a fast spinning ember with a smoke-tipped trail; a burst of flame on the body.
  FX.register('fire-bolt', {
    palette: FIRE,
    travel: 300,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 75, target: event.targets?.[0] ?? null, kind: 'hit', power: 0.06 },
    ],
    end: (event, travel) => k.CAST + travel + 380,
    air(s) {
      const { pose, c, targets, hits } = s;
      const hit = hits[0];
      const target = targets.find(t => t.id === hit.id) || targets[0];
      if (!pose.hand || !target) return;
      const H = k.P(pose.hand);
      const T = k.P(k.contact(target, pose.hand));
      const start = k.CAST,
        arrive = hit.at;
      if (c.t >= start && c.t < arrive) {
        const q = (c.t - start) / (arrive - start);
        const at = u => ({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * 6 });
        for (let i = 9; i >= 1; i--) {
          const u = q - i * 0.035;
          if (u <= 0) continue;
          const p = at(u);
          const color = i < 3 ? FIRE[4] : i < 6 ? FIRE[3] : i < 8 ? FIRE[2] : SMOKE[2];
          k.dot(p.x, p.y, i < 6 ? FIRE[0] : SMOKE[0], i < 4 ? 5 : 4);
          k.dot(p.x, p.y, color, i < 4 ? 3 : 2);
        }
        const p = at(q);
        const spin = Math.floor(c.raw / 40) % 4;
        k.disc(p.x, p.y, 4.5, FIRE[0]);
        k.disc(p.x, p.y, 3.5, FIRE[3]);
        k.disc(p.x, p.y, 2, FIRE[5]);
        // four-point spark that rotates a quarter turn every 40 ms
        const [dx, dy] = [
          [1, 0],
          [0, 1],
          [-1, 0],
          [0, -1],
        ][spin];
        k.dot(p.x + dx * 5, p.y + dy * 5, k.WHITE, 1);
        k.dot(p.x - dx * 5, p.y - dy * 5, FIRE[4], 1);
      }
      const real = s.real(hit);
      k.drawHit(k.hitStyle('fire-bolt', FIRE, { S: 34, spikes: 6, jag: 0.4 }), T, real);
      k.shards(T, real, FIRE, 11, 8, 20);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
