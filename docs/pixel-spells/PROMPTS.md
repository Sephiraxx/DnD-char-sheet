# Prompts for Chat

How to use this file:

1. Start a **new** Chat conversation for each group of about 5 batches (long conversations get sloppy).
2. Attach `board-pixel-fx.js`, `board-pixel-spells-00.js` and `docs/pixel-spells/BRIEF.md`, then paste the **setup prompt**.
3. Paste one **batch prompt** at a time. Save what Chat returns as `board-pixel-spells-NN.js` in the repo root on the branch, then tell Claude "batch NN is in". Claude runs the checker (no need to paste the code into Claude: that keeps your usage down).
4. If the checker fails, Claude gives you a short fix prompt to paste back into Chat.

Batches 01 and 02 come first: they give every spell on the board a pixel animation. The rest make individual spells distinct; do them in order (cantrips and low levels are the ones you see most).

---

## Setup prompt (once per conversation)

```text
You are helping animate spells for a D&D 5e tabletop web app in a pixel-art style. I attached three files:
- BRIEF.md: the rules, the API contract and the output format. Follow it exactly.
- board-pixel-fx.js: the engine, the drawing kit and four reference spells (Fireball, Magic Missile, Eldritch Blast, Thorn Whip). Match their quality and feel.
- board-pixel-spells-00.js: a worked example (Fire Bolt). Copy its structure.

I will send batches of spells. For each batch, reply with one file, board-pixel-spells-NN.js, in a single code block and nothing else. Make every spell recognisable by its look in D&D (colour, shape, motion), keep the hits punchy (beats with hitstop, hit marks, debris on real time), and keep each spell under 2.5 s. Reply "ready" now.
```

---

## Batch 01: archetype fallbacks (part 1)

```text
Batch 01. Write board-pixel-spells-01.js with one definition per archetype. These are fallbacks: they draw every spell of that archetype that has no definition of its own, so use s.ramp (the damage-type palette) for colour, never a fixed palette, and keep them generic but punchy.

- kind:projectile: a bolt from the hand to the target (fast, slight arc, outlined trail), hit star + shards.
- kind:beam: a sustained ray hand → each target (use kit.beam with s.ramp), a hit per target.
- kind:line: a 5 ft wide line from s.area (x, y, dir, feet); a front that sweeps along it in ~150 ms, then breaks up; one beat for all targets.
- kind:cone: a cone from the caster (s.area apex, dir, 53° wide, length feet); a fan of particles bursting outward in bands; one beat.
- kind:sphere: a burst at s.area centre (radius feet): flash pair, an expanding ring and body in ground, debris in air; one 'blast' beat. Scale the drama with event.level.
- kind:column: a vertical pillar dropping onto s.area (cylinder; height in s.area.height ft) with a ground ring; one beat.
- kind:cube: the cube area (kit.outline) fills with a pattern that pulses once; one beat.
- kind:wall: a wall segment along the area outline rising from the ground; also a linger loop so it stays visible while active.
- kind:strike: no projectile; the effect appears on the target (sigil above, then a strike down onto it), one beat per target.
- kind:on-hit: a weapon-smite accent: a flash on the caster's weapon hand, then a heavy slash mark on the target.
```

## Batch 02: archetype fallbacks (part 2)

```text
Batch 02. Write board-pixel-spells-02.js with one definition per archetype. Same rules as batch 01 (use s.ramp, generic but punchy).

- kind:aura-instant: a shockwave expanding from the caster (s.area radius) once; one beat for every target.
- kind:aura-persistent: a ring of motes orbiting the caster; air pulse on cast; a linger loop while active.
- kind:touch: hand → target lunge spark (no travel), a close-range burst on contact.
- kind:buff: rising motes and a rune circle at the target's feet; beat kind 'soft' (no knockback, no shake).
- kind:heal: green-gold motes spiralling up the target, a soft '+' sparkle; beat kind 'soft'.
- kind:summon: a summoning circle on s.pose.target or s.area with a pillar of light and a puff; no targets hit.
- kind:teleport: departure puff at the caster, arrival burst at s.pose.target (or event.teleport.from/to if present).
- kind:multi: several projectiles fanning out, one beat per entry in event.darts/event.rays/event.targets (70–90 ms apart).
- kind:utility: a small, quiet rune flash at the caster's hand and a twinkle at the target or point; no beat stop (stop 0, kind 'soft').
```

---

## Signature batches

Each batch is a list of spells with their board archetype and area, so Chat knows what the board gives it (`s.area`, targets). Paste one block per message.

### Batch 03

```text
Batch 03. Write board-pixel-spells-03.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- shocking-grasp: Agarre electrizante (level 0, touch)
- friends: Amistad (level 0, buff)
- mockery: Burla dañina (level 0, strike)
- control-flames: Controlar llamas (level 0, cube)
- create-bonfire: Crear hoguera (level 0, cube, area cube 5 ft)
- toll-the-dead: Doblar por los muertos (level 0, strike)
- druidcraft: Druidismo (level 0, cube)
- encode-thoughts: Encode Thoughts (level 0, utility)
- mind-sliver: Esquirla mental (level 0, strike)
- spare-the-dying: Estabilizar (level 0, heal)
- sword-burst: Estallido de espadas (level 0, aura-instant, area circle 5 ft (from caster))
- thunderclap: Estruendo (level 0, aura-instant, area circle 5 ft (from caster))
- shillelagh: Garrote (level 0, buff)
- blade-ward: Guardia de cuchillas (level 0, buff)
```

### Batch 04

```text
Batch 04. Write board-pixel-spells-04.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- guidance: Guía (level 0, buff)
- booming-blade: Hoja atronadora (level 0, touch)
- green-flame-blade: Hoja de llama verde (level 0, touch)
- illusion: Ilusión menor (level 0, cube)
- true-strike: Impacto certero (level 0, buff)
- infestation: Infestación (level 0, strike)
- lightning-lure: Látigo relampagueante (level 0, beam)
- sacred-flame: Llama sagrada (level 0, strike)
- dancing-lights: Luces danzantes (level 0, utility)
- light: Luz (level 0, utility)
- magehand: Mano de mago (level 0, utility)
- message: Mensaje (level 0, utility)
- shape-water: Moldear agua (level 0, cube)
- mold-earth: Moldear tierra (level 0, cube)
```

### Batch 05

```text
Batch 05. Write board-pixel-spells-05.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- frostbite: Mordisco helado (level 0, strike)
- word-of-radiance: Palabra de resplandor (level 0, aura-instant, area circle 5 ft (from caster))
- sapping-sting: Picadura debilitante (level 0, strike)
- magic-stone: Piedra mágica (level 0, projectile)
- prestidigitation: Prestidigitación (level 0, utility)
- produce-flame: Producir llama (level 0, projectile)
- gust: Ráfaga (level 0, utility)
- ray-of-frost: Rayo de escarcha (level 0, projectile)
- mending: Reparar (level 0, utility)
- resistance: Resistencia (level 0, buff)
- poison-spray: Rociada venenosa (level 0, projectile)
- acid-splash: Salpicadura ácida (level 0, projectile)
- primal-savagery: Salvajismo primigenio (level 0, touch)
- thaumaturgy: Taumaturgia (level 0, utility)
```

### Batch 06

```text
Batch 06. Write board-pixel-spells-06.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- chill-touch: Toque helado (level 0, projectile)
- absorb-elements: Absorber elementos (level 1, buff)
- alarm: Alarma (level 1, cube)
- animal-friendship: Amistad con los animales (level 1, buff)
- magnify-gravity: Amplificar gravedad (level 1, sphere, area circle 10 ft)
- armor-of-agathys: Armadura de Agathys (level 1, buff)
- mage-armor: Armadura de mago (level 1, buff)
- bless: Bendecir (level 1, buff)
- arms-of-hadar: Brazos de Hadar (level 1, aura-instant, area circle 10 ft (from caster))
- tashas-caustic-brew: Brebaje cáustico de Tasha (level 1, line, area line 30 ft (from caster))
- goodberry: Buenas bayas (level 1, utility)
- feather: Caída de pluma (level 1, buff)
- searing-smite: Castigo abrasador (level 1, on-hit)
- thunderous-smite: Castigo atronador (level 1, on-hit)
```

### Batch 07

```text
Batch 07. Write board-pixel-spells-07.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- wrathful-smite: Castigo furioso (level 1, on-hit)
- catapult: Catapulta (level 1, projectile)
- cause-fear: Causar miedo (level 1, buff)
- ceremony: Ceremonia (level 1, utility)
- comprehend-languages: Comprender idiomas (level 1, utility)
- create-or-destroy-water: Crear o destruir agua (level 1, cube)
- ice-knife: Cuchillo de hielo (level 1, sphere, area circle 5 ft)
- cure: Curar heridas (level 1, heal)
- frost-fingers: Dedos de escarcha (level 1, cone, area cone 15 ft (from caster))
- chaos-bolt: Descarga caótica (level 1, projectile)
- detect-evil-and-good: Detectar el bien y el mal (level 1, utility)
- detectmagic: Detectar magia (level 1, utility)
- detect-poison-and-disease: Detectar venenos y enfermedades (level 1, utility)
- tensers-floating-disk: Disco flotante de Tenser (level 1, utility)
```

### Batch 08

```text
Batch 08. Write board-pixel-spells-08.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- disguise-self: Disfrazarse (level 1, buff)
- distort-value: Distort Value (level 1, utility)
- gift-of-alacrity: Don de celeridad (level 1, buff)
- sleep: Dormir (level 1, sphere, area circle 20 ft)
- compelled-duel: Duelo obligado (level 1, buff)
- find-familiar: Encontrar familiar (level 1, summon)
- illusory-script: Escritura ilusoria (level 1, utility)
- shield: Escudo (level 1, buff)
- shield-of-faith: Escudo de fe (level 1, buff)
- false-life: Falsa vida (level 1, buff)
- divine-favor: Favor divino (level 1, buff)
- faeriefire: Fuego feérico (level 1, cube, area cube 20 ft)
- ensnaring-strike: Golpe apresador (level 1, on-hit)
- zephyr-strike: Golpe de céfiro (level 1, on-hit)
```

### Batch 09

```text
Batch 09. Write board-pixel-spells-09.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- grease: Grasa (level 1, cube)
- speak-with-animals: Hablar con los animales (level 1, utility)
- charm-person: Hechizar persona (level 1, buff)
- heroism: Heroísmo (level 1, buff)
- identify: Identificar (level 1, utility)
- silent-image: Imagen silenciosa (level 1, cube)
- inflict-wounds: Infligir heridas (level 1, touch)
- jims-magic-missile: Jim's Magic Missile (level 1, multi)
- hail-of-thorns: Lluvia de espinas (level 1, on-hit)
- hex: Maleficio (level 1, buff)
- burning-hands: Manos ardientes (level 1, cone, area cone 15 ft (from caster))
- hunters-mark: Marca del cazador (level 1, buff)
- thunderwave: Onda atronadora (level 1, cube, area cube 15 ft (from caster))
- chromatic-orb: Orbe cromático (level 1, projectile)
```

### Batch 10

```text
Batch 10. Write board-pixel-spells-10.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- command: Orden imperiosa (level 1, buff)
- healingword: Palabra de curación (level 1, heal)
- bane: Perdición (level 1, buff)
- protection-from-evil-and-good: Protección contra el bien y el mal (level 1, buff)
- guiding-bolt: Proyectil guiado (level 1, projectile)
- purify-food-and-drink: Purificar comida y bebida (level 1, utility)
- witch-bolt: Rayo de bruja (level 1, beam)
- ray-of-sickness: Rayo nauseabundo (level 1, projectile)
- hellish-rebuke: Reprensión infernal (level 1, strike)
- expeditious-retreat: Retirada expeditiva (level 1, buff)
- laughter: Risa horrible de Tasha (level 1, buff)
- color-spray: Rociada de color (level 1, cone, area cone 15 ft (from caster))
- jump: Salto (level 1, buff)
- sanctuary: Santuario (level 1, buff)
```

### Batch 11

```text
Batch 11. Write board-pixel-spells-11.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- silvery: Silvery Barbs · Púas plateadas (level 1, buff)
- unseen-servant: Sirviente invisible (level 1, summon)
- dissonant-whispers: Susurros disonantes (level 1, strike)
- earth-tremor: Temblor de tierra (level 1, aura-instant, area circle 10 ft (from caster))
- snare: Trampa de lazo (level 1, sphere)
- beast-bond: Vínculo con una bestia (level 1, buff)
- longstrider: Zancada prodigiosa (level 1, buff)
- aganazzars-scorcher: Abrasador de Aganazzar (level 2, line, area line 30 ft (from caster))
- enlarge-reduce: Agrandar / reducir (level 2, buff)
- air-bubble: Air Bubble (level 2, buff)
- dragons-breath: Aliento de dragón (level 2, buff)
- alter-self: Alterar el propio aspecto (level 2, buff)
- knock: Apertura (level 2, utility)
- magic-weapon: Arma mágica (level 2, buff)
```

### Batch 12

```text
Batch 12. Write board-pixel-spells-12.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- earthbind: Atadura terrestre (level 2, buff)
- augury: Augurio (level 2, utility)
- nystuls-magic-aura: Aura mágica de Nystul (level 2, buff)
- aid: Ayuda (level 2, buff)
- magic-mouth: Boca mágica (level 2, utility)
- wristpocket: Bolsillo de muñeca (level 2, utility)
- heat-metal: Calentar metal (level 2, buff)
- calm-emotions: Calmar emociones (level 2, sphere, area circle 20 ft)
- branding-smite: Castigo marcador (level 2, on-hit)
- enthrall: Cautivar (level 2, buff)
- blindness-deafness: Ceguera / sordera (level 2, buff)
- arcane-lock: Cerradura arcana (level 2, utility)
- borrowed-knowledge: Conocimiento prestado (level 2, buff)
- blur: Contorno borroso (level 2, buff)
```

### Batch 13

```text
Batch 13. Write board-pixel-spells-13.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- cordon-of-arrows: Cordón de flechas (level 2, utility)
- crown-of-madness: Corona de locura (level 2, buff)
- spike-growth: Crecimiento espinoso (level 2, sphere, area circle 20 ft)
- detect-thoughts: Detectar pensamientos (level 2, utility)
- dust-devil: Diablo de polvo (level 2, cube)
- find-steed: Encontrar corcel (level 2, summon)
- find-traps: Encontrar trampas (level 2, utility)
- snillocs-snowball-swarm: Enjambre de bolas de nieve de Snilloc (level 2, sphere, area circle 5 ft)
- skywrite: Escritura celeste (level 2, utility)
- flaming-sphere: Esfera flamígera (level 2, sphere, area circle 2.5 ft)
- healing-spirit: Espíritu sanador (level 2, heal)
- fortunes-favor: Favor de la fortuna (level 2, buff)
- melfs-acid-arrow: Flecha ácida de Melf (level 2, projectile)
- flock-of-familiars: Flock of Familiars (level 2, summon)
```

### Batch 14

```text
Batch 14. Write board-pixel-spells-14.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- freedom-of-the-winds: Freedom of the Winds (level 2, teleport)
- phantasmal-force: Fuerza fantasmal (level 2, cube)
- gift-of-gab: Gift of Gab (level 2, utility)
- shatter: Hacer añicos (level 2, sphere, area circle 10 ft)
- rimes-binding-ice: Hielo vinculante de Rime (level 2, cone, area cone 30 ft (from caster))
- flame-blade: Hoja de fuego (level 2, buff)
- shadow-blade: Hoja sombría (level 2, buff)
- mirror-image: Imagen múltiple (level 2, buff)
- hold: Inmovilizar persona (level 2, buff)
- invisibility: Invisibilidad (level 2, buff)
- summon-beast: Invocar bestia (level 2, summon)
- jims-glowing-coin: Jim's Glowing Coin (level 2, utility)
- tashas-mind-whip: Látigo mental de Tasha (level 2, strike)
- levitate: Levitar (level 2, buff)
```

### Batch 15

```text
Batch 15. Write board-pixel-spells-15.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- continual-flame: Llama continua (level 2, utility)
- locate-animals-or-plants: Localizar animales o plantas (level 2, utility)
- locate-object: Localizar objeto (level 2, utility)
- wither-and-bloom: Marchitar y florecer (level 2, sphere)
- animal-messenger: Mensajero animal (level 2, utility)
- cloud-of-daggers: Nube de dagas (level 2, cube, area cube 5 ft)
- immovable-object: Objeto inmóvil (level 2, utility)
- pass-without-trace: Pasar sin rastro (level 2, buff)
- kinetic-jaunt: Paso cinético (level 2, buff)
- barkskin: Piel robliza (level 2, buff)
- pyrotechnics: Pirotecnia (level 2, sphere)
- prayer-of-healing: Plegaria de curación (level 2, heal)
- enhance-ability: Potenciar característica (level 2, buff)
- maximillians-earthen-grasp: Presa terrenal de Maximilian (level 2, cube)
```

### Batch 16

```text
Batch 16. Write board-pixel-spells-16.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- protection-from-poison: Protección contra el veneno (level 2, buff)
- mind-spike: Púa mental (level 2, strike)
- gust-of-wind: Ráfaga de viento (level 2, line, area line 60 ft (from caster))
- scorching-ray: Rayo abrasador (level 2, beam)
- ray-of-enfeeblement: Rayo debilitador (level 2, beam)
- gentle-repose: Reposo apacible (level 2, buff)
- lesser-restoration: Restablecimiento menor (level 2, heal)
- beast-sense: Sentidos de bestia (level 2, buff)
- spray-of-cards: Spray of Cards (level 2, cone, area cone 15 ft (from caster))
- suggestion: Sugestión (level 2, buff)
- web: Telaraña (level 2, cube, area cube 20 ft)
- nathairs-mischief: Travesuras de Nathair (level 2, cube)
- spider-climb: Trepar cual arácnido (level 2, buff)
- rope-trick: Truco de la cuerda (level 2, utility)
```

### Batch 17

```text
Batch 17. Write board-pixel-spells-17.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- see-invisibility: Ver invisibilidad (level 2, buff)
- warding-wind: Viento protector (level 2, aura-persistent, area circle 10 ft (from caster))
- warding-bond: Vínculo protector (level 2, buff)
- darkvision: Visión en la oscuridad (level 2, buff)
- vortex-warp: Vórtice de traslado (level 2, teleport)
- warp-sense: Warp Sense (level 2, utility)
- zone-of-truth: Zona de verdad (level 2, sphere, area circle 15 ft)
- haste: Acelerar (level 3, buff)
- animate-dead: Animar a los muertos (level 3, summon)
- antagonize: Antagonize (level 3, strike)
- elemental-weapon: Arma elemental (level 3, buff)
- aura-of-vitality: Aura de vitalidad (level 3, aura-persistent, area circle 30 ft (from caster))
- water-walk: Caminar sobre el agua (level 3, buff)
- blinding-smite: Castigo cegador (level 3, on-hit)
```

### Batch 18

```text
Batch 18. Write board-pixel-spells-18.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- magic-circle: Círculo mágico (level 3, column, area cylinder 10 ft)
- clairvoyance: Clarividencia (level 3, utility)
- conjure-animals: Conjurar animales (level 3, summon)
- conjure-barrage: Conjurar descarga (level 3, cone, area cone 60 ft (from caster))
- phantom-steed: Corcel fantasma (level 3, summon)
- create-food-and-water: Crear comida y agua (level 3, utility)
- plant-growth: Crecimiento vegetal (level 3, sphere)
- dispel: Disipar magia (level 3, utility)
- enemies-abound: Enemigos por doquier (level 3, buff)
- beacon-of-hope: Faro de esperanza (level 3, buff)
- fast-friends: Fast Friends (level 3, buff)
- feign-death: Fingir muerte (level 3, buff)
- lightning-arrow: Flecha relampagueante (level 3, on-hit)
- flame-arrows: Flechas ígneas (level 3, buff)
```

### Batch 19

```text
Batch 19. Write board-pixel-spells-19.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- gaseous-form: Forma gaseosa (level 3, buff)
- intellect-fortress: Fortaleza mental (level 3, buff)
- freedom-of-the-waves: Freedom of the Waves (level 3, column, area cylinder 15 ft)
- meld-into-stone: Fundirse con la piedra (level 3, utility)
- galders-tower: Galder's Tower (level 3, summon)
- glyph-of-warding: Glifo custodio (level 3, sphere)
- speak-with-plants: Hablar con las plantas (level 3, utility)
- speak-with-dead: Hablar con los muertos (level 3, utility)
- major-image: Imagen mayor (level 3, cube)
- incite-greed: Incite Greed (level 3, buff, area circle 30 ft)
- nondetection: Indetectable (level 3, buff)
- blink: Intermitencia (level 3, teleport)
- summon-shadowspawn: Invocar engendro sombrío (level 3, summon)
- summon-fey: Invocar feérico (level 3, summon)
```

### Batch 20

```text
Batch 20. Write board-pixel-spells-20.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- summon-undead: Invocar no muerto (level 3, summon)
- bestow-curse: Lanzar maldición (level 3, buff)
- tongues: Lenguas (level 3, buff)
- call-lightning: Llamar al relámpago (level 3, column, area cylinder 5 ft)
- daylight: Luz del día (level 3, sphere, area circle 60 ft)
- crusaders-mantle: Manto del cruzado (level 3, aura-persistent, area circle 30 ft (from caster))
- melfs-minute-meteors: Meteoritos diminutos de Melf (level 3, multi)
- fear: Miedo (level 3, cone, area cone 30 ft (from caster))
- spirit-shroud: Mortaja espiritual (level 3, aura-persistent)
- motivational-speech: Motivational Speech (level 3, buff)
- wall-of-water: Muro de agua (level 3, wall, area wall 30 ft)
- wall-of-sand: Muro de arena (level 3, wall, area wall 30 ft)
- wind-wall: Muro de viento (level 3, wall, area wall 50 ft)
- tidal-wave: Ola de marea (level 3, line, area line 30 ft)
```

### Batch 21

```text
Batch 21. Write board-pixel-spells-21.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- pulse-wave: Onda pulsante (level 3, cone, area cone 30 ft (from caster))
- mass-healing-word: Palabra de curación en masa (level 3, heal)
- thunder-step: Paso atronador (level 3, teleport)
- hypnotic: Patrón hipnótico (level 3, cube)
- leomunds-tiny-hut: Pequeña choza de Leomund (level 3, sphere)
- protection-from-energy: Protección contra la energía (level 3, buff)
- remove-curse: Quitar maldición (level 3, heal)
- slow: Ralentizar (level 3, cube)
- sending: Recado (level 3, utility)
- lightning-bolt: Relámpago (level 3, line, area line 100 ft (from caster))
- water-breathing: Respirar bajo el agua (level 3, buff)
- revivify: Revivir (level 3, heal)
- catnap: Siesta (level 3, buff)
- tiny-servant: Sirviente diminuto (level 3, summon)
```

### Batch 22

```text
Batch 22. Write board-pixel-spells-22.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- summon-lesser-demons: Summon Lesser Demons (level 3, summon)
- erupting-earth: Tierra en erupción (level 3, cube)
- vampiric-touch: Toque vampírico (level 3, touch)
- sleet-storm: Tormenta de aguanieve (level 3, column, area cylinder 40 ft)
- life-transference: Transferencia de vida (level 3, heal)
- fly: Volar (level 3, buff)
- ashardalons-stride: Zancada de Ashardalon (level 3, aura-persistent, area circle 5 ft (from caster))
- divination: Adivinación (level 4, utility)
- phantasmal-killer: Asesino fantasmal (level 4, strike)
- aura-of-purity: Aura de pureza (level 4, aura-persistent, area circle 30 ft (from caster))
- aura-of-life: Aura de vida (level 4, aura-persistent, area circle 30 ft (from caster))
- staggering-smite: Castigo aturdidor (level 4, on-hit)
- leomunds-secret-chest: Cofre secreto de Leomund (level 4, teleport)
- compulsion: Compulsión (level 4, buff)
```

### Batch 23

```text
Batch 23. Write board-pixel-spells-23.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- confusion: Confusión (level 4, sphere, area circle 10 ft)
- conjure-minor-elementals: Conjurar elementales menores (level 4, summon)
- conjure-woodland-beings: Conjurar seres del bosque (level 4, summon)
- control-water: Controlar agua (level 4, cube)
- death-ward: Custodia contra la muerte (level 4, buff)
- banishment: Destierro (level 4, teleport)
- dominate-beast: Dominar bestia (level 4, buff)
- find-greater-steed: Encontrar corcel mayor (level 4, summon)
- grasping-vine: Enredadera apresadora (level 4, summon)
- fire-shield: Escudo de fuego (level 4, buff)
- watery-sphere: Esfera acuosa (level 4, sphere, area circle 5 ft)
- otilukes-resilient-sphere: Esfera elástica de Otiluke (level 4, sphere)
- storm-sphere: Esfera tormentosa (level 4, sphere, area circle 20 ft)
- vitriolic-sphere: Esfera vitriólica (level 4, sphere, area circle 20 ft)
```

### Batch 24

```text
Batch 24. Write board-pixel-spells-24.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- fabricate: Fabricar (level 4, cube)
- galders-speedy-courier: Galder's Speedy Courier (level 4, summon)
- gate-seal: Gate Seal (level 4, cube)
- guardian-of-faith: Guardián de la fe (level 4, summon)
- guardian-of-nature: Guardián de la naturaleza (level 4, buff)
- charm-monster: Hechizar monstruo (level 4, buff)
- giant-insect: Insecto gigante (level 4, summon)
- greaterinvis: Invisibilidad mayor (level 4, buff)
- summon-aberration: Invocar aberración (level 4, summon)
- summon-construct: Invocar constructo (level 4, summon)
- summon-greater-demon: Invocar demonio mayor (level 4, summon)
- summon-elemental: Invocar elemental (level 4, summon)
- raulothims-psychic-lance: Lanza psíquica de Raulothim (level 4, projectile)
- freedom-of-movement: Libertad de movimiento (level 4, buff)
```

### Batch 25

```text
Batch 25. Write board-pixel-spells-25.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- locate-creature: Localizar criatura (level 4, utility)
- blight: Marchitar (level 4, strike)
- stone-shape: Moldear la piedra (level 4, utility)
- arcane-eye: Ojo arcano (level 4, utility)
- elemental-bane: Perdición elemental (level 4, buff)
- stoneskin: Piel pétrea (level 4, buff)
- polymorph: Polimorfar (level 4, buff)
- dimension: Puerta dimensional (level 4, teleport)
- sickening-radiance: Resplandor enfermizo (level 4, sphere, area circle 30 ft)
- mordenkainens-faithful-hound: Sabueso fiel de Mordenkainen (level 4, summon)
- mordenkainens-private-sanctum: Santuario privado de Mordenkainen (level 4, cube)
- shadow-of-moil: Sombra de tormento (level 4, buff)
- spirit-of-death: Spirit of Death (level 4, summon)
- gravity-sinkhole: Sumidero gravitatorio (level 4, sphere, area circle 20 ft)
```

### Batch 26

```text
Batch 26. Write board-pixel-spells-26.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- evards-black-tentacles: Tentáculos negros de Evard (level 4, cube, area cube 20 ft)
- hallucinatory-terrain: Terreno alucinatorio (level 4, cube)
- ice-storm: Tormenta de hielo (level 4, column, area cylinder 20 ft)
- raise-dead: Alzar a los muertos (level 5, heal)
- dawn: Amanecer (level 5, column, area cylinder 30 ft)
- animate-objects: Animar objetos (level 5, summon)
- seeming: Apariencia (level 5, buff)
- holy-weapon: Arma sagrada (level 5, buff)
- planar-binding: Atadura planar (level 5, buff)
- antilife-shell: Caparazón antivida (level 5, aura-persistent, area circle 10 ft (from caster))
- swift-quiver: Carcaj veloz (level 5, buff)
- banishing-smite: Castigo desterrador (level 5, on-hit)
- circle-of-power: Círculo de poder (level 5, aura-persistent, area circle 30 ft (from caster))
- teleportation-circle: Círculo de teletransportación (level 5, teleport)
```

### Batch 27

```text
Batch 27. Write board-pixel-spells-27.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- commune: Comunión (level 5, utility)
- commune-with-nature: Comunión con la naturaleza (level 5, utility)
- conjure-volley: Conjurar andanada (level 5, column)
- conjure-elemental: Conjurar elemental (level 5, summon)
- cone-of-cold: Cono de frío (level 5, cone, area cone 60 ft (from caster))
- legend-lore: Conocimiento de leyendas (level 5, utility)
- hallow: Consagrar (level 5, sphere)
- contact-other-plane: Contactar con otro plano (level 5, utility)
- contagion: Contagio (level 5, touch)
- control-winds: Controlar los vientos (level 5, cube)
- creation: Creación (level 5, cube)
- create-spelljamming-helm: Create Spelljamming Helm (level 5, utility)
- mass-cure-wounds: Curar heridas en masa (level 5, heal)
- danse-macabre: Danza macabra (level 5, summon)
```

### Batch 28

```text
Batch 28. Write board-pixel-spells-28.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- awaken: Despertar (level 5, buff)
- mislead: Despistar (level 5, buff)
- temporal-shunt: Desvío temporal (level 5, teleport)
- dispel-evil-and-good: Disipar el bien y el mal (level 5, buff)
- dominate-person: Dominar persona (level 5, buff)
- enervation: Enervación (level 5, beam)
- scrying: Escudriñar (level 5, utility)
- synaptic-static: Estática sináptica (level 5, sphere, area circle 20 ft)
- geas: Geas (level 5, buff)
- steel-wind-strike: Golpe de viento de acero (level 5, teleport)
- flame-strike: Golpe flamígero (level 5, column, area cylinder 10 ft)
- immolation: Inmolación (level 5, strike)
- hold-monster: Inmovilizar monstruo (level 5, buff)
- summon-celestial: Invocar celestial (level 5, summon)
```

### Batch 29

```text
Batch 29. Write board-pixel-spells-29.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- summon-draconic-spirit: Invocar espíritu dracónico (level 5, summon)
- wrath-of-nature: Ira de la naturaleza (level 5, cube)
- infernal-calling: Llamada infernal (level 5, summon)
- bigbys-hand: Mano de Bigby (level 5, summon)
- modify-memory: Modificar recuerdo (level 5, buff)
- wall-of-force: Muro de fuerza (level 5, wall)
- wall-of-light: Muro de luz (level 5, wall, area wall 60 ft)
- wall-of-stone: Muro de piedra (level 5, wall)
- negative-energy-flood: Oleada de energía negativa (level 5, strike)
- destructive-wave: Onda destructiva (level 5, sphere, area circle 30 ft (from caster))
- passwall: Pasamuros (level 5, utility)
- far-step: Paso lejano (level 5, teleport)
- insect-plague: Plaga de insectos (level 5, sphere, area circle 20 ft)
- skill-empowerment: Potenciar habilidad (level 5, buff)
```

### Batch 30

```text
Batch 30. Write board-pixel-spells-30.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- reincarnate: Reencarnar (level 5, heal)
- greater-restoration: Restablecimiento mayor (level 5, heal)
- dream: Sueño (level 5, buff)
- telekinesis: Telequinesis (level 5, buff)
- transmute-rock: Transmutar roca (level 5, cube)
- rarys-telepathic-bond: Vínculo telepático de Rary (level 5, buff)
- maelstrom: Vorágine (level 5, column)
- tree-stride: Zancada arbórea (level 5, teleport)
- planar-ally: Aliado planar (level 6, summon)
- tashas-otherworldly-guise: Apariencia sobrenatural de Tasha (level 6, buff)
- druid-grove: Arboleda druídica (level 6, cube)
- blade-barrier: Barrera de cuchillas (level 6, wall, area wall 100 ft)
- wind-walk: Caminar con el viento (level 6, buff)
- circle-of-death: Círculo de muerte (level 6, sphere, area circle 60 ft)
```

### Batch 31

```text
Batch 31. Write board-pixel-spells-31.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- conjure-fey: Conjurar feérico (level 6, summon)
- contingency: Contingencia (level 6, buff)
- create-homunculus: Crear homúnculo (level 6, summon)
- create-undead: Crear no muertos (level 6, summon)
- primordial-ward: Custodia primordial (level 6, buff)
- harm: Dañar (level 6, strike)
- ottos-irresistible-dance: Danza irresistible de Otto (level 6, buff)
- flesh-to-stone: De la carne a la piedra (level 6, buff)
- disintegrate: Desintegrar (level 6, beam)
- scatter: Dispersar (level 6, teleport)
- find-the-path: Encontrar el camino (level 6, utility)
- fizbans-platinum-shield: Escudo de platino de Fizban (level 6, buff)
- otilukes-freezing-sphere: Esfera congelante de Otiluke (level 6, sphere)
- heroes-feast: Festín de los héroes (level 6, buff)
```

### Batch 32

```text
Batch 32. Write board-pixel-spells-32.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- gravity-fissure: Fisura gravitatoria (level 6, line, area line 100 ft (from caster))
- globe-of-invulnerability: Globo de invulnerabilidad (level 6, aura-persistent, area circle 10 ft (from caster))
- guards-and-wards: Guardas y guardias (level 6, cube)
- bones-of-the-earth: Huesos de la tierra (level 6, column)
- programmed-illusion: Ilusión programada (level 6, cube)
- investiture-of-ice: Investidura de hielo (level 6, buff)
- investiture-of-flame: Investidura de llamas (level 6, buff)
- investiture-of-stone: Investidura de piedra (level 6, buff)
- investiture-of-wind: Investidura de viento (level 6, buff)
- drawmijs-instant-summons: Invocaciones instantáneas de Drawmij (level 6, utility)
- summon-fiend: Invocar infernal (level 6, summon)
- soul-cage: Jaula del alma (level 6, buff)
- eyebite: Mal de ojo (level 6, buff)
- move-earth: Mover la tierra (level 6, cube)
```

### Batch 33

```text
Batch 33. Write board-pixel-spells-33.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- wall-of-thorns: Muro de espinas (level 6, wall)
- wall-of-ice: Muro de hielo (level 6, wall)
- word-of-recall: Palabra de regreso (level 6, teleport)
- arcane-gate: Portal arcano (level 6, teleport)
- mental-prison: Prisión mental (level 6, buff)
- forbiddance: Prohibición (level 6, cube)
- sunbeam: Rayo solar (level 6, line, area line 60 ft (from caster))
- magic-jar: Recipiente mágico (level 6, buff)
- chain-lightning: Relámpago en cadena (level 6, multi)
- heal: Sanar (level 6, heal)
- mass-suggestion: Sugestión en masa (level 6, buff)
- tensers-transformation: Transformación de Tenser (level 6, buff)
- transport-via-plants: Transporte mediante plantas (level 6, teleport)
- true-seeing: Visión veraz (level 6, buff)
```

### Batch 34

```text
Batch 34. Write board-pixel-spells-34.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- delayed-blast-fireball: Bola de fuego de explosión retardada (level 7, sphere, area circle 20 ft)
- conjure-celestial: Conjurar celestial (level 7, summon)
- crown-of-stars: Corona de estrellas (level 7, multi)
- create-magen: Crear magen (level 7, summon)
- finger-of-death: Dedo de la muerte (level 7, strike)
- plane-shift: Desplazamiento entre planos (level 7, teleport)
- mordenkainens-sword: Espada de Mordenkainen (level 7, summon)
- mirage-arcane: Espejismo arcano (level 7, utility)
- etherealness: Etereidad (level 7, teleport)
- reverse-gravity: Invertir la gravedad (level 7, column, area cylinder 50 ft)
- forcecage: Jaula de fuerza (level 7, cube)
- mordenkainens-magnificent-mansion: Mansión magnífica de Mordenkainen (level 7, summon)
- power-word-pain: Palabra de poder: dolor (level 7, buff)
- divine-word: Palabra divina (level 7, buff)
```

### Batch 35

```text
Batch 35. Write board-pixel-spells-35.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- project-image: Proyectar imagen (level 7, utility)
- regenerate: Regenerar (level 7, heal)
- resurrection: Resurrección (level 7, heal)
- prismatic-spray: Rociada prismática (level 7, cone, area cone 60 ft (from caster))
- sequester: Secuestrar (level 7, buff)
- symbol: Símbolo (level 7, sphere)
- simulacrum: Simulacro (level 7, summon)
- dream-of-the-blue-veil: Sueño del velo azul (level 7, teleport)
- teleport: Teletransportar (level 7, teleport)
- temple-of-the-gods: Templo de los dioses (level 7, summon)
- whirlwind: Torbellino (level 7, column, area cylinder 10 ft)
- fire-storm: Tormenta de fuego (level 7, cube)
- draconic-transformation: Transformación dracónica (level 7, buff)
- tether-essence: Vincular esencias (level 7, buff)
```

### Batch 36

```text
Batch 36. Write board-pixel-spells-36.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- antipathy-sympathy: Antipatía / simpatía (level 8, cube)
- holy-aura: Aura sagrada (level 8, aura-persistent, area circle 30 ft (from caster))
- antimagic-field: Campo antimagia (level 8, aura-persistent, area circle 10 ft (from caster))
- clone: Clon (level 8, summon)
- control-weather: Controlar el clima (level 8, sphere)
- dominate-monster: Dominar monstruo (level 8, buff)
- illusory-dragon: Dragón ilusorio (level 8, summon)
- dark-star: Estrella oscura (level 8, sphere, area circle 40 ft)
- sunburst: Explosión solar (level 8, sphere, area circle 60 ft)
- animal-shapes: Formas animales (level 8, buff)
- mighty-fortress: Fortaleza poderosa (level 8, summon)
- abi-dalzims-horrid-wilting: Horrible marchitamiento de Abi-Dalzim (level 8, cube)
- maze: Laberinto (level 8, teleport)
- glibness: Labia (level 8, buff)
```

### Batch 37

```text
Batch 37. Write board-pixel-spells-37.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- feeblemind: Mente débil (level 8, strike)
- mind-blank: Mente en blanco (level 8, buff)
- incendiary-cloud: Nube incendiaria (level 8, sphere, area circle 20 ft)
- maddening-darkness: Oscuridad enloquecedora (level 8, sphere, area circle 60 ft)
- power-word-stun: Palabra de poder: aturdir (level 8, buff)
- reality-break: Ruptura de realidad (level 8, buff)
- demiplane: Semiplano (level 8, teleport)
- telepathy: Telepatía (level 8, buff)
- earthquake: Terremoto (level 8, sphere)
- tsunami: Tsunami (level 8, wall)
- shapechange: Cambio de forma (level 9, buff)
- imprisonment: Cautiverio (level 9, buff)
- wish: Deseo (level 9, utility)
- time-stop: Detener el tiempo (level 9, buff)
```

### Batch 38

```text
Batch 38. Write board-pixel-spells-38.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- weird: Enemigo fantasmal (level 9, sphere, area circle 30 ft)
- time-ravage: Estrago temporal (level 9, strike)
- psychic-scream: Grito psíquico (level 9, strike)
- blade-of-disaster: Hoja del desastre (level 9, summon)
- invulnerability: Invulnerabilidad (level 9, buff)
- meteor-swarm: Lluvia de meteoritos (level 9, sphere)
- prismatic-wall: Muro prismático (level 9, wall)
- power-word-kill: Palabra de poder: matar (level 9, buff)
- power-word-heal: Palabra de poder: sanar (level 9, heal)
- true-polymorph: Polimorfar verdadero (level 9, buff)
- mass-polymorph: Polimorfia en masa (level 9, buff)
- gate: Portal (level 9, teleport)
- foresight: Presciencia (level 9, buff)
- astral-projection: Proyección astral (level 9, teleport)
```

### Batch 39

```text
Batch 39. Write board-pixel-spells-39.js with a definition for each spell below (key = the id). Make each one recognisable: its D&D look, its damage type, how it is delivered. Use the archetype and area noted (the board passes that template in s.area). Follow BRIEF.md.

- true-resurrection: Resurrección verdadera (level 9, heal)
- mass-heal: Sanar en masa (level 9, heal)
- storm-of-vengeance: Tormenta de venganza (level 9, column)
- ravenous-void: Vacío voraz (level 9, sphere)
```

---

## Batches 40–41: the spells with board behavior

Attach `docs/pixel-spells/RESERVED.md` as well as the usual three files.

### Batch 40

```text
Batch 40. Read RESERVED.md (attached) as well as BRIEF.md. Write board-pixel-spells-40.js with definitions for these spells, following RESERVED.md exactly (which hooks to use, what the board passes in, what not to draw):
- fog-cloud, darkness, hunger-of-hadar, stinking-cloud, cloudkill, silence
```

### Batch 41

```text
Batch 41. Read RESERVED.md (attached) as well as BRIEF.md. Write board-pixel-spells-41.js with definitions for these spells, following RESERVED.md exactly:
- wall-of-fire, moonbeam, spirit-guardians, entangle, spiritual-weapon, misty-step, counterspell (also registered as counter)
```

---

### Batch 42

```text
Batch 42. These 11 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-42.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. For spirit-guardians also follow RESERVED.md exactly (it is a lasting spell). Use the archetype and area noted (the board passes that template in s.area).
- spare-the-dying: Spare the Dying (level 0, heal). Was: one dot and a 1 px dash beside the target, unreadable. Make: a bright heal-green heartbeat line (ECG trace) drawn across the target's body, about 1.5 squares wide, that spikes once with a pulse ring; then a small outlined cross or heart settles on the figure and fades. One soft beat on the target.
- friends: Friends (level 0, buff). Was: a tiny heart over a head. Make: a pink charm swirl wrapping the head and shoulders of the creature it lands on (wherever the board puts the hit), a big outlined heart that pops out of it at the peak, sparkles, then a faint pink shimmer clinging to the figure.
- control-flames: Control Flames (level 0, cube). Was: small orange marks. Make: a fire in the cube flares up tall (a full square or more), bends into a shape (a spiral or a reaching hand), then settles back to a small steady flame.
- druidcraft: Druidcraft (level 0, cube). Was: a tiny flower. Make: a ring of leaves bursts out, a plant sprouts from the ground and grows to about a square, blooms, and a small leaf swirl drifts off.
- encode-thoughts: Encode Thoughts (level 0, utility, the caster). Was: a tiny glyph. Make: a bright psychic thread pulled out of the caster's head that winds into a glowing spool or crystal held above the caster's hand, then pulses once.
- illusion: Minor Illusion (level 0, cube). Was: a dashed box that vanished. Make: a shimmer of dithered pixels that resolves into a crate-sized illusory object filling the cube (about one square), drawn with a 50% ordered dither and a flickering scanline glitch at its edges, then holds steady.
- shape-water: Shape Water (level 0, cube). Was: a tiny cyan bracket. Make: water rises out of the ground in the cube as a column, twists into a shape (a cube, then a wave crest), and splashes back with droplets, leaving a puddle ring for a moment.
- mold-earth: Mold Earth (level 0, cube). Was: a small brown block. Make: the square of earth heaves up as a block, clods fly out, and it settles into a raised mound with a trench outline.
- longstrider: Longstrider (level 1, buff). Was: tiny yellow arrows at the feet. Make: the target's feet light up, a pair of small winged-boot glyphs flashes at the feet, and wind streaks and speed lines sweep backward from the figure with a dust kick. One soft beat.
- air-bubble: Air Bubble (level 2, buff). Was: a thin 1 px circle. Make: a large clear bubble forms around the target's head and upper body (a 2 px pale-blue rim with outline and a white highlight), wobbles as it settles, and small bubbles rise from it.
- spirit-guardians: Spirit Guardians (level 3, aura-persistent, 15 ft around the caster). Was: the guardians looked like tan wooden posts. Make: clearly spectral guardians, hooded or winged, with wisp tails, drawn with an ordered dither so they read as ghostly, bobbing as they orbit at the radius. Radiant gold-white by default, or necrotic when kit.paletteFor(s.event) is the necrotic ramp. Add a stronger floor ring. Lasting part in linger, per RESERVED.md.
```

## Fix prompt (Claude fills in the failures)

```text
The checker rejected board-pixel-spells-NN.js:
<failures>
Fix only those problems and send the whole file again, same format.
```
