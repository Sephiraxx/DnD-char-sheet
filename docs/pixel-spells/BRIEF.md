# Pixel spells: brief for contributors

You are writing spell animations for a D&D 5e tabletop board (browser, canvas 2D). Four reference spells already exist (Fireball, Magic Missile, Eldritch Blast, Thorn Whip) plus a worked example (Fire Bolt, `board-pixel-spells-00.js`). Your job is to add more spells **in the same style, using only the kit below**.

Attach these files to the conversation: `board-pixel-fx.js` (the engine and reference spells), `board-pixel-spells-00.js` (the example to copy) and this brief.

## Style rules (non-negotiable)

1. **Pixel art.** Everything is drawn on a grid of 16 art pixels per 5 ft square and scaled up with hard edges. Draw with `dot`, `disc`, `ellipse`, `blit` and cached `sprite`s. No gradients, blur, glow, additive blending or anti-aliased paths.
2. **Every effect has a dark outline** (index 0 of its ramp) so it reads on light and dark maps. Draw the outline colour 2 px bigger first, then the colour on top.
3. **Clear shapes, few colours.** Use a 6-colour ramp: `[outline, deep, mid, bright, pale, white]`. Shade with bands, not noise. Dither only at band edges.
4. **Wind-up snaps, release is instant.** The engine already draws a cast circle and a hand charge for the first 300 ms (`CAST`). Your spell starts at `CAST`. Projectiles leave the hand in one frame, never fade in.
5. **Hits must land.** Each hit is a *beat* with a hitstop (`stop`, 50–230 ms). During the stop the spell's clock freezes, the target vibrates and the screen shakes; the engine does all of that. You draw a hit mark (`drawHit`) and debris (`shards`) on **real** time (`s.real(hit)`) so they keep moving through the stop.
6. **Stage big effects.** Explosions go flash → body → smoke or debris → settle. Don't end on a fade-out mush.
7. **Don't bury the figures.** Big area bodies go in `ground` (under the figures). Projectiles, beams, hit marks and debris go in `air` (over them).
8. **Short.** A whole spell, including stops, finishes in **under 2.5 s** (hard limit 3.2 s). Single-target spells are usually 0.8–1.4 s.
9. **Deterministic.** No `Math.random`; use `kit.hash(i, seed)` and `kit.noise(x, y, seed)` with `event.seed`, so the same frame always looks the same.
10. **Cheap.** Aim for under ~600 `dot` calls per frame per spell. Anything big and static (a blast frame, a sigil) goes in `kit.sprite(key, w, h, palette, paint)`, which caches it.

## The contract

```js
FX.register('<spell-id>' | 'kind:<archetype>', {
  palette,            // ramp array, or (event) => ramp. Default: by damage type (kit.paletteFor).
  travel,             // ms from CAST until the first hit, or (event) => ms. Default 0.
  beats(event, kit, travel) {    // the hits. Default: one 'hit' per target at CAST + travel.
    return [{ at, stop, target, kind, power }];
    // at: design ms from cast start (≥ CAST). stop: hitstop ms (0–260).
    // target: token id or null. power: vibration in cells (0.03–0.1).
    // kind: 'blast' | 'beam' | 'hit' | 'dart' | 'whip' | 'pull' | 'soft' (soft = no knockback, no shake).
  },
  end(event, travel),  // design ms when the animation is over. Default: last beat + 420.
  ground(s, kit),      // drawn under the figures
  air(s, kit),         // drawn over the figures
  linger(s, kit),      // optional loop under the figures while a zone, wall or aura lasts (s.linger 1 → 0)
  lingerAir(s, kit),   // optional loop over the figures while it lasts (a floating weapon, flame tips)
  fog(s, kit),         // optional obscuring cloud over everything while s.fogAlpha > 0 (see RESERVED.md)
  flash(event, e),     // optional board flash e ms after each beat: { color, alpha } or null (alpha ≤ 0.3, light then dark)
  reach(event, grid),  // optional { r, up } in cells: how far the drawing extends around the area centre
  decal,               // optional ms a ground mark stays after the impact
  cast: false,         // optional: skip the default cast circle and hand charge
});
```

`register('kind:sphere', …)` is the fallback for every sphere spell without its own definition. A spell-id definition always wins over its archetype.

### The scene `s`

| field | meaning |
|---|---|
| `s.event` | `{ id, kind, element, level, slot, seed, targets: [ids], darts, rays, beats, teleport? }` |
| `s.pose.hand` | caster's hand `{x, y}` in grid cells |
| `s.pose.base` | caster's feet `{x, y, span}` |
| `s.pose.target` | aimed point `{x, y}` (when there are no token targets) |
| `s.targets` | `[{ id, x, y, baseX, baseY, span }]`: body centre and feet of each target, in cells |
| `s.area` | area template or null: `{ kind: 'circle'\|'cone'\|'line'\|'cube'\|'cylinder'\|'wall', feet, x, y, dir, width?, height?, self }`. Circle: centre and radius. Cone/line: apex or start, direction `dir` (radians), length `feet`. `kit.outline(area, s.grid)` gives its corners. Cells = feet / `s.grid.feet`. |
| `s.c` | the clock: `c.t` (design ms since cast, frozen during hitstops), `c.raw` (real ms), `c.frozen` (the current stop or null), `c.into` (ms into that stop) |
| `s.hits` | the beats you returned, each with `.id` and `.freeze` |
| `s.real(hit)` | real ms since that hit landed: use it for hit marks and debris |
| `s.ramp` | the palette for this cast |
| `s.linger` | in `linger` only: 1 while active, falling to 0 as it ends |

### The kit (`FX.kit`)

All drawing is in **art pixels inside the current buffer**. Convert grid points with `P(point)`. One cell = `PX` (16) art px.

| function | what it does |
|---|---|
| `P({x, y})` | grid cells → art px |
| `dot(x, y, color, size=1)` | square of `size` px centred on x, y |
| `disc(x, y, r, color)` | filled pixel circle |
| `ellipse(cx, cy, rx, ry, color, size=1, gap=0, spin=0)` | ring; `gap` > 0 makes it dashed |
| `blit(img, x, y, alpha=1)` | draw a cached sprite (alpha snaps to quarters) |
| `blitRotated(img, x, y, angle, ax=0.5, ay=0.5)` | rotated sprite, snapped to 16 headings |
| `sprite(key, w, h, palette, paint, outline=true)` | cached sprite: `paint(set)` calls `set(x, y, index)` with palette indices ≥ 1; index 0 becomes an automatic outline |
| `drawHit(style, at, e)` | 8-frame hit star at `at` (art px), `e` = `s.real(hit)` |
| `hitStyle(key, ramp, { S, spikes, minor, jag, void })` | build a hit style (`S` = size in art px) |
| `shards(at, e, ramp, seed, n=7, reach=22)` | outlined debris flying out from `at` |
| `beam(H, T, e, seed, ramp)` | the Eldritch Blast beam between two art-px points (e = ms since release) |
| `contact(target, from)` | where a hit lands on a target body (grid cells), leaning toward `from` |
| `hash(a, b, c)` / `noise(x, y, seed)` / `dith(x, y)` | deterministic randomness, value noise, 4×4 ordered dither |
| `band(v, n, x, y)` | quantise 0..1 to n bands with a little dither |
| `clamp`, `mix`, `ease` (ease-out cubic), `back` (overshoot), `tau`, `CAST` (300), `WHITE` | helpers |
| `palettes` | `FIRE, SMOKE, FORCE, ELDRITCH, VINE, THORN, DUST` and element ramps `fire, frost, lightning, trueno` (thunder), `ácido` (acid), `veneno` (poison), `necrótico`, `radiante`, `psíquico`, `fuerza` (force), `heal`, `contundente` / `cortante` / `perforante` (weapon damage), `nature`, `magic` |
| `paletteFor(event)` | the ramp the board would pick for this cast |
| `outline(area, grid)` | area template corners, in cells |
| `missiles(level)`, `targetList(event, list)` | Magic Missile dart count; `list` or the event's targets |

## Output format

Return **one JavaScript file** named `board-pixel-spells-NN.js` (NN = batch number) in a single code block, shaped exactly like `board-pixel-spells-00.js`:

- The same wrapper: `(function (root) { 'use strict'; const FX = root.BoardPixelFX; if (!FX) return; const k = FX.kit; … })(typeof window !== 'undefined' ? window : globalThis);`
- One `FX.register(...)` per spell in the batch, each preceded by a one-line comment describing the look.
- Shared helpers at the top of the file are fine. Don't touch any other file. Don't redefine the reference spells.
- No explanations outside the code block.

## How your file is checked

`node tools/check-pixel-spells.js board-pixel-spells-NN.js` loads it, rejects forbidden APIs (`Math.random`, DOM, timers, gradients, blur, additive blending), checks every id and field, casts every spell on a test board, catches exceptions, enforces the 3.2 s limit and produces a contact sheet. Anything that fails comes back to you as a short fix request.
