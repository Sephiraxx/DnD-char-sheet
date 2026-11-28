# Pixel spells: the 13 spells with board behavior

These spells do more than animate. The **behavior lives in `board.js` and stays as it is**: who can see what, zone damage, moving figures, the weapon's attacks. A pixel definition only replaces the **art**, and once a definition exists it replaces *all* of the spell's old art, including what stays on the board. So each definition below must also draw the lasting part.

Read `BRIEF.md` first. Everything there applies; this file adds the lasting hooks and what the board passes in.

## Lasting hooks

| hook | layer | runs while | use it for |
|---|---|---|---|
| `linger(s, kit)` | under the figures | the effect lasts (`s.linger` 1, falling to 0 over its last 0.5 s) | zones, walls, beams on the ground |
| `lingerAir(s, kit)` | over the figures | same | things that float (a weapon), flame tips in front of figures |
| `fog(s, kit)` | over the figures, above everything else | the board treats the area as obscuring (`s.fogAlpha` 0 → 1 → 0) | an obscuring cloud |

`air` and `ground` still draw the cast and the impact. Lasting hooks start once the impact begins (`CAST + travel`). Multiply your alphas by `s.linger` (or `s.fogAlpha`) so the effect fades out when the board ends it. Keep lasting loops calm and cheap: they run every frame for minutes. Loop on `s.c.raw` (for example `(s.c.raw / 2400) % 1`), well under 300 `dot` calls per frame, and big static parts in cached `sprite`s.

The test lab keeps lasting spells on the board 5 s after the cast, and the checker's last two shots fall in that phase.

## The spells

1. **Fog Cloud** (`fog-cloud`, sphere 20 ft, +20 ft radius per slot above 1st, so read `s.area.feet`). The board already hides figures from players inside it. Draw the cloud in **`fog`**: soft-edged but pixel (dithered edge, no blur), grey-blue, slowly drifting puffs, opacity × `s.fogAlpha`. When `s.dm` is true, draw it at about 60% so the DM can see through. A short rolling-out puff in `air` on cast.
2. **Darkness** (`darkness`, sphere 15 ft). Magical darkness: a near-black dome with a dark violet rim and a few slow motes, in `linger`. Must stay readable as an area, but never pure black over the whole map. No hit or flash.
3. **Hunger of Hadar** (`hunger-of-hadar`, sphere 20 ft). A black void with a star-speckled interior and faint grasping tendrils at the rim, in `linger`. The board deals damage each turn; you only draw.
4. **Stinking Cloud** (`stinking-cloud`, sphere 20 ft). A sickly yellow-green rolling cloud, in `linger` (puffs drifting, a few bubbles). The `veneno` palette leaning yellow.
5. **Cloudkill** (`cloudkill`, sphere 20 ft). A heavier poison-green fog hugging the ground, with darker swirls, in `linger`.
6. **Silence** (`silence`, sphere 20 ft). A barely-there bubble: a thin dashed ring with soft pale-blue ripples, in `linger`. Quiet: no flash, no shake, no hit stars (`beats: () => []`).
7. **Wall of Fire** (`wall-of-fire`). `s.area` is either a straight wall (`kind 'wall'`, from `x, y` along `dir` for `feet`, kit.outline gives its corners) or a ring (`s.area.ring` true, centre `x, y`, radius `feet`). `s.event.wallSide` is `1` or `-1`: the side that burns, to the right (1) or left (-1) of the wall's direction, or inside/outside for a ring. `linger`: a row of tall pixel flames along the wall plus a heat band on the burning side. `lingerAir`: only the flame tips that pass in front of figures. `s.pose.wallBounds` lists the figures' rectangles `[x, y, w, h]` in cells; draw tips only inside those, at low opacity, so figures behind the wall stay visible.
8. **Moonbeam** (`moonbeam`, cylinder 5 ft radius, 40 ft high). `linger`: a pale silver beam from the top of the board to the floor circle, a bright floor disc with a few motes rising. The board moves `s.area` when the caster moves the beam, so always draw at the current `s.area`.
9. **Spirit Guardians** (`spirit-guardians`, aura 15 ft around the caster). The board recentres `s.area` on the caster every frame. `linger`: a ring of spectral guardians (small winged or ghostly sprites, radiant or necrotic) orbiting at the radius, plus a faint floor ring.
10. **Entangle** (`entangle`, 20 ft square). `linger`: grasping vines and leaves sprouting in every cell of the square (`kit.outline` gives it), swaying. The local session may add restrained/difficult-terrain rules; the art only needs to show the area.
11. **Spiritual Weapon** (`spiritual-weapon`). A floating spectral weapon. Its spot is `s.pose.target` (draw it about 0.6 cells above that point). `s.event.weaponForm` is `'hammer'` (default), `'mace'` or `'axe'`. `lingerAir`: the weapon bobbing and glowing. When `s.event.swing = { at, point }` is set and `s.c.now - swing.at` is between 0 and 550 ms, swoop from its spot to `point` and back. When `s.event.attackImpact = { at, point, span }` is set and `s.c.now - at` is under 370 ms, draw a hit star at `point`. `air`: the summoning on cast. Use `s.c.now`, the board clock that `swing.at` and `attackImpact.at` use, not `s.c.raw`.
12. **Misty Step** (`misty-step`). `s.event.teleport = { from, to }` in cells. The board hides the caster's figure between about 495 ms and 690 ms after the cast starts and shows it at `to` afterwards; match those times. `air`: a silvery mist burst at `from` (300–620 ms), a mist puff and sparkle at `to` (545–975 ms). No targets (`beats: () => []`).
13. **Counterspell** (`counterspell`, also registered as `counter`, the same spell under an older id). Cast as a reaction; the target is the enemy caster (`s.targets[0]`). `air`: a rune circle snaps onto the enemy caster, then a hard slash severs it and the rune shatters into shards. One small beat (`kind: 'hit'`, short stop). Register the same definition under both ids.
