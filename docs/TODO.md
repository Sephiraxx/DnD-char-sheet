# To do

In order:

1. **Finish the pixel spell batches 31–39** (levels 6–9). Batches 00–30 are done.
2. **Make the spells that move creatures actually move them** (see below).
3. **Keep lasting effects on the board for as long as they last** (see "Lasting effects" below).
4. **Bring every sprite to 32 px**, like the ones in `assets/minis-pixel` that are being tested now. While doing it, make
   mini customisation much better, including custom painting.
5. **Move the terrain to the pixel style**: generated maps, floors, walls, furniture and props, so the minis and
   spells don't clash with the map.

## Lasting effects

Effects that last should stay drawn, in the pixel style, until they end:
- **Terrain:** Grease, Spike Growth, Entangle, Web, Cloud of Daggers, Moonbeam, Spirit Guardians, clouds and fogs, walls.
- **Buffs on allies:** Bless, Shield of Faith, Haste, Heroism and similar.
- **Auras and circles around a creature:** Halo of Spores, Spirit Guardians, Aura of Vitality, the paladin auras, and so on.

What already exists:
- `board.js` (around line 1396) keeps an event alive while the spell is active: the zone's rounds, concentration, or
  the effect on the character sheet. It passes `pose.linger` (1 → 0 as it ends).
- `BoardPixelFX` calls a definition's `linger(s, kit)` loop during that time (`board-pixel-fx.js:1073`, BRIEF.md).

What's missing:
- Most pixel definitions have no `linger` loop (only about 50 of about 440 do). Without one, a zone falls back to the
  old soft look or nothing.
- Buffs and creature auras need a small loop that follows the token (a ring, sparkles, a tint).
- Check that everything that should last really does: non-concentration durations (Grease), and auras tied to a
  class feature (Halo of Spores) rather than a spell.
- **Rules change, separate from the art:** Darkness, Hunger of Hadar, Stinking Cloud and Cloudkill should hide
  figures and block sight on the board, the way Fog Cloud already does (`updateSpellClouds` and `tokenInSpellCloud`
  in `board.js`). Their pixel art (batch 40) only draws them.
- Fog Cloud, Darkness, Hunger of Hadar, Stinking Cloud, Cloudkill, Silence, Wall of Fire, Moonbeam, Spirit Guardians,
  Entangle and Spiritual Weapon get their lasting art in batches 40–41 (`linger`, `lingerAir`, `fog`, see
  `docs/pixel-spells/RESERVED.md`).
- One way to do it: a "linger pass" of batches, like the spell batches, where Codex adds `linger` to the lasting
  spells and the checker also takes a contact-sheet frame mid-linger.

## Spells that should move creatures

Today the pixel effects only shake the figure (a short visual knockback that snaps back to its square). Only
these spells change positions on the board (`board.js` `resolveSpellSave` / `spellHit`, helpers
`Spells.pushDestination` / `pullDestination` in `board-spells.js`):

- Thunderwave: pushes 10 ft on a failed save.
- Thorn Whip: pulls 10 ft toward the caster on a hit.
- Misty Step (30 ft) and Far Step (60 ft): the caster moves to the square the player picks (`destinationRange`).
- Disintegrate: the token is removed when it drops to 0.

The three kinds of work:

### 1. Pushes and pulls away from or toward the caster

Extend the existing push/pull path, using the distances given by each spell's rules.

| Spell | Movement |
|---|---|
| lightning-lure | Pull 10 ft toward the caster (failed save) |
| grasping-vine | Pull 20 ft toward the vine (hit) |
| thunderous-smite | Push 10 ft (failed save), plus prone |
| gust | Push 5 ft (failed save) |
| gust-of-wind | Push 15 ft along the line (failed save) |
| pulse-wave | Push or pull 15 ft (caster's choice, failed save) |
| bigbys-hand | Forceful Hand pushes 5 ft + 5 ft × spellcasting modifier; Grasping Hand can drag |
| telekinesis | Move the creature up to 30 ft (contest) |
| catapult | Hurls an object, not a creature (probably nothing to move) |
| eldritch-blast | Only with the Repelling Blast invocation: push 10 ft per beam |
| dust-devil | Push 10 ft away (failed save) |

### 2. Pulls toward an area's centre and area pushes

These need a new helper: a pull toward a point, or a push away from a point, applied to every creature in the area.

| Spell | Movement |
|---|---|
| gravity-sinkhole | Pull 5 ft toward the centre (failed save) |
| gravity-fissure | Pull 10 ft toward the line (failed save) |
| maelstrom | Pull 10 ft toward the centre (failed save, at turn start) |
| whirlwind | Pulls creatures in and lifts them |
| tsunami | Carries creatures along with the wave |
| watery-sphere | Creatures move with the sphere |
| destructive-wave | Prone only (no move) |
| tidal-wave | Prone only (no move) |
| control-winds | Gusts and downdraft (optional) |
| reverse-gravity | Fall upward, then back down (optional) |

### 3. Teleports that need a destination pick

These work like Misty Step: a destination square for the caster, and for some spells the targets too.

| Spell | Who moves, and how far |
|---|---|
| dimension-door | Caster up to 500 ft, plus one willing creature |
| thunder-step | Caster up to 90 ft, plus one willing creature |
| steel-wind-strike | Caster up to 5 ft from one of the targets |
| vortex-warp | Target up to 90 ft (failed save) |
| scatter | Up to five creatures, up to 120 ft each |
| tree-stride | Caster, tree to tree |
| freedom-of-the-winds | Caster |
| teleport | Removed from the map |
| plane-shift | Removed from the map |
| word-of-recall | Removed from the map |
| transport-via-plants | Removed from the map |
| banishment | Hidden until it ends |
| maze | Hidden until it ends |
| temporal-shunt | Hidden until it ends |
| blink | Hidden until it ends |
| etherealness | Hidden until it ends |

### Forced movement from conditions

Some spells only make the target move on its own turn: command ("flee", "approach"), dissonant-whispers,
fear, compelled-duel and crown-of-madness. These are probably fine left to the players.
