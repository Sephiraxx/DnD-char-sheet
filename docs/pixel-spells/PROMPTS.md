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

### Batch 43

```text
Batch 43. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-43.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- sapping-sting: Sapping Sting (level 0, strike). Was: Tiny dark purple specks. Make: A sickly green-white necrotic barb stabs up out of the ground into the target, a thick pale-green drain ripple pulls out of the body, and the figure is knocked down with a dust puff (prone). One hit beat.
- magic-stone: Magic Stone (level 0, projectile). Was: Tiny pebble. Make: A fist-sized pebble (6–8 px) glowing white-violet is flung from the hand in an arc with a bright trail and cracks on the target with a big rune-flash star and stone chips.
- prestidigitation: Prestidigitation (level 0, utility). Was: Tiny sparkles. Make: A quick show of harmless tricks at the target point, each at least half a square and bright: a puff of coloured sparks, a little dancing flame, a twinkling star, a pop of confetti; settle into a few drifting twinkles.
- mending: Mending (level 0, utility). Was: Tiny. Make: Two halves of a broken outlined cup float together over the target, a bright gold seam glows where they join with a pulse ring, then a clean sparkle. At least half a square.
- gust: Gust (level 0, utility). Was: Small swirl. Make: Three thick curling gust lines (2 px with outline, white-blue) sweep from the hand to the target, swirl around it with leaves and dust, and blow past it. One soft hit beat.
- resistance: Resistance (level 0, buff). Was: Small shield above. Make: A big pale-silver shield (about a square) rises out of a ring at the target's feet over the body, flashes once, then shrinks into a small glowing ward circle at the feet that fades.
- chill-touch: Chill Touch (level 0, projectile). Was: Small dark hand. Make: A large ghostly skeletal hand (about a square, pale grey-green with a white rim and dark outline) flies from the caster, grips the target, frosty necrotic wisps burst, the hand clenches and fades.
- alarm: Alarm (level 1, cube). Was: Small bell. Make: A glowing outlined ward square fills the cube, a big bell glyph (half a square) rings above it with sound arcs, a bright rune blinks at each corner; settles to a faint outline.
- animal-friendship: Animal Friendship (level 1, buff). Was: Tiny hearts floating. Make: A green-gold calming swirl wraps the beast, a big outlined paw print with a heart pops above it, leaves and sparkles drift, a soft green shimmer clings to the figure.
- bless: Bless (level 1, buff). Was: Tiny ring + speck. Make: Holy light pours down on each target: a column of gold-white rays about a square wide, a bright halo ring settles over each head, a few gold motes rise. One soft beat per target.
- feather: Feather Fall (level 1, buff). Was: Thin white streaks, no figure link. Make: Big white outlined feathers (half a square each) sway down around each target, a soft pale-blue cushion ring under the feet, the figure bobs gently as its fall slows.
- create-or-destroy-water: Create or Destroy Water (level 1, cube). Was: Thin dark-blue drips. Make: A bright cyan water column (about a square wide) splashes up in the cube with big outlined droplets and leaves a puddle ring.
```

### Batch 44

```text
Batch 44. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-44.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- cure: Cure Wounds (level 1, heal). Was: Small ring + sparks, same as kind:heal. Make: Warm green-gold light wells up from the target's feet into the body, a big outlined plus sign (half a square) blooms on the chest with a pulse ring, then a few rising motes. One soft beat.
- tensers-floating-disk: Tenser's Floating Disk (level 1, utility). Was: Tiny dark-blue disk. Make: A pale-blue glowing disc a square wide (2 px rim with outline and a white highlight) spins up out of a flash at the point and floats at knee height, bobbing, with a soft shadow below.
- catapult: Catapult (level 1, projectile). Was: Tiny pebble. Make: A large outlined rock (half a square) is hurled from the hand in a high arc with a motion trail and smashes into the target with a big impact star, chips and dust.
- wrathful-smite: Wrathful Smite (level 1, on-hit). Was: Small pink squiggle. Make: The weapon hit lands with a crimson flare, a big screaming fear-face glyph (half a square, pale highlights) bursts out of the target with dark-red shock rings, and the figure cowers.
- disguise-self: Disguise Self (level 1, buff). Was: Small mask floating. Make: A curtain of pale-violet shimmering pixels (ordered dither) sweeps down over the caster from head to feet, a mask glyph flashes, and a faint violet shimmer outline stays on the figure.
- gift-of-alacrity: Gift Of Alacrity (level 1, buff). Was: Small cyan clock. Make: A big pale-cyan clock face (about a square) with fast-spinning hands appears over the target, speed streaks whirl around it, then it collapses into a bright ring around the figure.
- illusory-script: Illusory Script (level 1, utility). Was: Tiny scroll. Make: A large scroll (about a square) unrolls over the point, glowing violet runes write across it, scramble into gibberish, and the scroll rolls shut.
- false-life: False Life (level 1, buff). Was: Small dark-pink. Make: A dark necrotic aura swells up the caster, then a bright pale-violet shell of borrowed vitality forms around the body (2 px outline) and a skull-heart glyph pulses once.
- divine-favor: Divine Favor (level 1, buff). Was: Tiny sword. Make: A shaft of golden light strikes the caster's weapon hand and the weapon blazes as a tall bright radiant shape with sparks, settling to a glow on the hand.
- find-familiar: Find Familiar (level 1, summon). Was: Small purple blob, no creature. Make: A summoning circle with a pale flame, a puff of smoke, and a clearly readable familiar sprite (an owl or a cat, two thirds of a square, outlined, pale colours) blinks and settles.
- faeriefire: Faerie Fire (level 1, cube, area cube 20 ft). Was: Thin dark-purple box outlines, figures not lit. Make: Every creature in the cube gets a bright violet-pink glowing outline (2 px, around the whole figure) with drifting bright motes, and the cube floor glimmers with dancing sparks. The outlined figures are the iconic image.
- zephyr-strike: Zephyr Strike (level 1, on-hit). Was: Thin 1 px lines. Make: The caster blurs forward with thick white-cyan wind streaks behind, the weapon hit lands with a gust-burst star, leaves swirl. Strokes 2 px with outline.
```

### Batch 45

```text
Batch 45. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-45.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- grease: Grease (level 1, cube). Was: Brown box over the figure reads as a crate, not a slick. Make: A glossy amber-black slick spreads over the floor of the cube under the figures (ground only, never over them): dark amber puddle with bright yellow-white highlights and ripple rings, drips splash, a slip spark on each target. It must read as slippery liquid on the floor, not a box. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- charm-person: Charm Person (level 1, buff). Was: Tiny hearts. Make: A pink swirl spirals from the caster to the target and wraps its head, a big outlined heart (half a square) pops out with sparkles, and a faint pink glow stays on the figure.
- heroism: Heroism (level 1, buff). Was: Small gold badge. Make: A golden-orange column of courage bursts up from the target's feet, a big chevron badge glyph flashes over the chest, and a bright gold outline stays around the figure.
- hex: Hex (level 1, buff). Was: Small dark purple. Make: A dark-violet curse sigil about a square (bright magenta outline over the dark fill) slams onto the target, an eye glyph opens over the head, wisps coil around the figure.
- hunters-mark: Hunters Mark (level 1, buff). Was: Small green glyph. Make: A bright green crosshair (about a square, 2 px with outline) locks onto the target, tightens with a snap, and a small glowing arrow glyph stays above the head.
- thunderwave: Thunderwave (level 1, cube, area cube 15 ft (from caster)). Was: Thin square outline + dashed box, no wave. Make: A massive pale-blue shock wave bursts out of the caster across the 15 ft cube: thick concentric pressure rings (2–3 px, outline) slam outward, dust and pebbles blow away, the air ripples, a thunderclap flash. It must fill the cube. A blast beat on each target.
- inflict-wounds: Inflict Wounds (level 1, touch). Was: Dark purple vanishes. Make: A black-violet necrotic burst at the touch with a bright sickly green-white core, necrotic cracks racing over the target's body, a puff of dark motes.
- command: Command (level 1, buff). Was: Small crown. Make: A big glowing gold-white word glyph (a speech bubble, about a square) flies from the caster and stamps onto the target with a shock ring; an exclamation glyph stays over the head.
- healingword: Healing Word (level 1, heal). Was: Small cross, heal must pop. Make: A bright green-gold word glyph flies from the caster and bursts on the target into a big outlined plus sign with a ring and rising sparkles. One soft beat.
- bane: Bane (level 1, buff). Was: Small pink. Make: A sickly purple-red curse falls on each target: a cracked downward chevron glyph slams onto the head and dark wisps drain downward. Pale highlights so it reads.
- protection-from-evil-and-good: Protection from Evil and Good (level 1, buff). Was: Small dome. Make: A bright pale-gold dome (about a square, 2 px rim with outline) closes over the target, holy runes circle it, it flashes, and a faint ward ring stays at the feet.
- expeditious-retreat: Expeditious Retreat (level 1, buff). Was: Tiny chevrons. Make: The caster's legs glow, big white speed lines and dust blast backward, a winged-boot glyph flashes, and the figure blurs with an afterimage trail.
```

### Batch 46

```text
Batch 46. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-46.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- laughter: Tasha's Hideous Laughter (level 1, buff). Was: Small pink squiggles. Make: Big bright HA glyphs and laugh lines burst around the target with a pink-yellow swirl, and the figure topples (prone), shaking with laughter.
- jump: Jump (level 1, buff). Was: Small green. Make: A spring-green coil glyph under the target, a bright arcing motion trail as the figure is shown springing up, and a landing dust ring.
- sanctuary: Sanctuary (level 1, buff). Was: Small dome. Make: A soft white-gold bubble ward (about a square) closes around the target, an ankh glyph glows on it, and a ring of light stays at the feet.
- witch-bolt: Witch Bolt (level 1, beam). Was: Dark-blue bolt vanishes on green. Make: A thick crackling blue-white lightning beam with a white core from the caster to the target, arcing and sustained, the target lit up with sparks; the bolt then holds a dimmer crackle.
- earthbind: Earthbind (level 2, buff). Was: Small tan glyph. Make: A heavy golden-brown chain of earth energy whips around the target and drags it down to the ground with a dust slam.
- nystuls-magic-aura: Nystul's Magic Aura (level 2, buff). Was: Small. Make: A shimmering pale-violet rune circle (about a square) wraps the target, flips between two different glyphs, and settles as a faint outline.
- wristpocket: Wristpocket (level 2, utility). Was: Tiny. Make: A swirling spatial pocket (half a square) opens at the caster's wrist, a sparkle is sucked in, and it closes with a pop.
- heat-metal: Heat Metal (level 2, buff). Was: Small orange squiggle. Make: The target's armour and weapon glow red-hot: a bright orange-white outline over the figure's gear, heat-shimmer lines rising, sparks and a sizzle burst.
- calm-emotions: Calm Emotions (level 2, sphere, area circle 20 ft). Was: Thin ring + dark specks like kind:sphere. Make: A soothing pale-blue wave flows across the 20 ft sphere: a thick soft ring, calm ripple lines, a gentle drop glyph above each creature, motes drifting down.
- enthrall: Enthrall (level 2, buff). Was: Tiny lips. Make: Pink-violet song notes stream at the target, a hypnotic eye glyph opens above it, spirals swirl around its head, and the figure sways.
- blindness-deafness: Blindness/Deafness (level 2, buff). Was: Small dark. Make: A dark blindfold band with a bright violet outline wraps across the target's eyes, a crossed-out eye glyph pops above the head, darkness wisps.
- borrowed-knowledge: Borrowed Knowledge (level 2, buff). Was: Small book. Make: A big glowing book (about a square) opens above the caster, bright pages flutter out and dissolve into its head, a star glyph flashes.
```

### Batch 47

```text
Batch 47. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-47.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- blur: Blur (level 2, buff). Was: Small blue ghosting. Make: The target splits into three pale-blue offset ghost copies (dithered afterimages of the figure, shifting left and right), and a shimmer outline holds.
- crown-of-madness: Crown Of Madness (level 2, buff). Was: Small dark crown. Make: A jagged purple-gold crown (half a square, bright outline) with twisted spikes forms over the target's head, mad spirals swirl around it.
- detect-thoughts: Detect Thoughts (level 2, utility). Was: Small pink. Make: A bright pink brain glyph above the caster sends a psychic wave to the target, and thought bubbles with squiggles pop above the target's head.
- find-traps: Find Traps (level 2, utility). Was: Thin orange ellipses. Make: A gold radar sweep pulses out from the caster and bright red-orange warning triangle glyphs pop up at spots in range.
- healing-spirit: Healing Spirit (level 2, heal). Was: Small green specks, no spirit. Make: A small spectral spirit (a bright green-white wisp creature, half a square, outlined) appears in the cube and floats, healing motes and a plus sign drift onto a creature. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- fortunes-favor: Fortunes Favor (level 2, buff). Was: Tiny. Make: A big golden coin flips in the air above the target, a star flashes, and gold sparkles rain down onto the figure.
- melfs-acid-arrow: Melf's Acid Arrow (level 2, projectile). Was: Tiny arrow, small splash. Make: A large bright green acid arrow (half a square, outlined) streaks to the target and bursts into a big acid splash with dripping blobs and a sizzle, leaving bubbling drops on the figure.
- flock-of-familiars: Flock Of Familiars (level 2, summon). Was: Dark purple blobs. Make: Three readable familiar sprites (owl, cat and bat, each half a square, pale and outlined) burst out of a smoke ring and flutter around the caster.
- gift-of-gab: Gift Of Gab (level 2, utility). Was: Tiny bubbles. Make: A large speech bubble (about a square) pops over the caster with glowing scribbles, sparkles fly out, then a small mouth glyph glows.
- flame-blade: Flame Blade (level 2, buff). Was: Thin small blade. Make: A scimitar of fire a full square long (bright yellow-white core, orange body, outline) ignites in the caster's hand with a whoosh and flickering flame tips.
- shadow-blade: Shadow Blade (level 2, buff). Was: Small dark blade. Make: A sword of solid shadow a full square long forms in the hand: deep violet blade with a bright violet-white edge and trailing wisps.
- invisibility: Invisibility (level 2, buff). Was: Tiny specks, figure never fades. Make: A bright shimmer sweeps up the target, its figure breaks into a dithered pale outline that thins to a faint heat-shimmer.
```

### Batch 48

```text
Batch 48. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-48.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- hold: Hold Person (level 2, buff). Was: Small yellow bars beside. Make: Glowing golden-violet bands (2 px with outline) wrap around the target's body, lock with a flash, and a padlock glyph stays above the head.
- freedom-of-the-winds: Freedom Of The Winds (level 2, teleport). Was: Tiny cyan specks. Make: A burst of white-cyan wind swirls around the caster, bright cloud wisps under the feet, and the figure lifts with wind streaks.
- animal-messenger: Animal Messenger (level 2, utility). Was: Tiny bird. Make: A small bird sprite (half a square, bright, outlined) flies up from the caster carrying a scroll, circles once and darts off with a trail.
- cloud-of-daggers: Cloud Of Daggers (level 2, cube, area cube 5 ft). Was: A few tiny daggers, lasting zone must read as a whirling cube of blades. Make: A whirling cube of many bright silver daggers (each 5–6 px, white edge, outline) spinning around the cube centre with glints, a beat on each target. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- immovable-object: Immovable Object (level 2, utility). Was: Small. Make: A glowing violet rune anchor (half a square) slams onto the target point, chains lock it in place, a heavy shock ring.
- pass-without-trace: Pass Without Trace (level 2, buff). Was: Dark grey-blue mound. Make: A soft grey-green mist wraps the party's feet, glowing footprints fade one by one, and a leaf glyph flashes. Use pale highlights.
- kinetic-jaunt: Kinetic Jaunt (level 2, buff). Was: Small cyan. Make: Bright cyan kinetic trails spiral around the target's legs and a dash afterimage streaks behind the figure.
- barkskin: Barkskin (level 2, buff). Was: Small bark bits beside the figure. Make: Thick bark plates (brown with bright tan highlights and green leaf accents) grow up over the target from the feet to the shoulders and settle as a bark outline on the figure.
- prayer-of-healing: Prayer Of Healing (level 2, heal). Was: Small crosses. Make: A gentle golden light descends on every target, with a big plus sign and a halo ring on each and rising motes.
- enhance-ability: Enhance Ability (level 2, buff). Was: Small gold specks. Make: A bright golden aura flares up the target and a big animal-head glyph (bull, cat or bear) flashes over it.
- ray-of-enfeeblement: Ray Of Enfeeblement (level 2, beam). Was: Near-black beam vanishes. Make: A thick ray of sickly pale green-grey light with a white core from the caster to the target; the figure sags, a drooping-arrow glyph and drain wisps.
- gentle-repose: Gentle Repose (level 2, buff). Was: Small. Make: A soft white-blue shroud settles over the target with a glowing hourglass glyph and a frosty preserving shimmer.
```

### Batch 49

```text
Batch 49. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-49.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- lesser-restoration: Lesser Restoration (level 2, heal). Was: Thin green outline. Make: A bright green-white cleansing swirl lifts dark sickness motes off the target and a plus sign glows.
- beast-sense: Beast Sense (level 2, buff). Was: Small eyes. Make: A big pale-gold beast eye glyph (about a square) opens over the target, a glowing link line runs to the caster, and a matching eye glows on the caster.
- suggestion: Suggestion (level 2, buff). Was: Tiny pink. Make: A soft pink-violet whisper spiral wraps the target's head, a speech bubble with a glowing glyph floats above, the figure's eyes glaze.
- spider-climb: Spider Climb (level 2, buff). Was: Small. Make: A bright web pattern glows under the target's feet and hands, spider-leg glyphs flash, and sticky web strands cling to the figure.
- protection-from-poison: Protection From Poison (level 2, buff). Was: Small green. Make: A green-white ward bubble surrounds the target and a poison-skull glyph shatters inside it.
- see-invisibility: See Invisibility (level 2, buff). Was: Small. Make: A big eye glyph opens over the caster and a pale gold sweep reveals shimmering outlines of hidden things around it.
- warding-wind: Warding Wind (level 2, aura-persistent, area circle 10 ft (from caster)). Was: Thin dashed 1 px rings. Make: A strong wind wall whirls around the caster at 10 ft: thick white-cyan curling gusts with leaves and dust whipping round. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- warding-bond: Warding Bond (level 2, buff). Was: Thin dotted tether, tiny hearts. Make: A glowing silver ring forms on each creature with a thick bright tether between them and a shield glyph pulsing along it.
- darkvision: Darkvision (level 2, buff). Was: Small. Make: The target's eyes glow bright green and a dark vision cone sweeps forward with green-white highlights.
- vortex-warp: Vortex Warp (level 2, teleport). Was: Dark purple swirl. Make: A bright violet-blue swirling vortex (a full square) engulfs the target, it vanishes in a twist and reappears with a vortex pop.
- haste: Haste (level 3, buff). Was: Small, key buff. Make: A bright gold-white speed aura: fast afterimages of the figure, a big clock glyph with spinning hands, sparks, the figure flickering with speed lines.
- animate-dead: Animate Dead (level 3, summon). Was: Small dark. Make: A sickly green necromantic circle on the ground, a skeletal hand bursts out, and a readable skeleton sprite (two thirds of a square, bone-white, outlined) rises.
```

### Batch 50

```text
Batch 50. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-50.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- elemental-weapon: Elemental Weapon (level 3, buff). Was: Small sparks. Make: The target's weapon glows with a big bright elemental shape along the blade (flame, frost or lightning by palette) and sparks.
- aura-of-vitality: Aura Of Vitality (level 3, aura-persistent, area circle 30 ft (from caster)). Was: Thin huge arc off-frame, like kind:buff. Make: A bright green-gold aura ring at 30 ft from the caster (2–3 px with outline) with healing motes rising inside and a plus glyph at the caster. The radius is large, so also put a strong glow and a pulse ring on the caster itself: that is the centre of the read. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- water-walk: Water Walk (level 3, buff). Was: Small. Make: Rippling blue water rings at each target's feet, a bright white-blue glow under the soles, little splashes.
- blinding-smite: Blinding Smite (level 3, on-hit). Was: Small. Make: The weapon hit bursts into a huge radiant white-gold flash on the target with rays stabbing outward and a blinded-eye glyph.
- clairvoyance: Clairvoyance (level 3, utility). Was: Small eye. Make: A floating spectral eye (about a square, pale blue with a bright iris) materialises at the point, looks around, and ripples.
- dispel: Dispel Magic (level 3, utility). Was: Small purple ring, the key "magic unravels" read is missing. Make: A bright pale-blue unravelling ring hits the target: glowing threads of magic are torn off the figure and dissolve into scattering rune shards. The iconic image is magic coming apart.
- enemies-abound: Enemies Abound (level 3, buff). Was: Small pink. Make: A crimson-pink confusion haze wraps the target's head, red outlines flash around nearby figures, question and exclamation glyphs.
- beacon-of-hope: Beacon Of Hope (level 3, buff). Was: Small spark + ring. Make: A tall bright beacon of gold-white light rises from the caster, rays spread to the targets, and a gold halo appears above each.
- fast-friends: Fast Friends (level 3, buff). Was: Small pink ellipse. Make: A bright pink-gold ribbon flows from the caster to the target and a big heart-and-handshake glyph pops above the target.
- feign-death: Feign Death (level 3, buff). Was: Small dark. Make: The target slumps, a pale grey-blue deathly shroud covers it and a skull glyph floats above with a wisp of mist.
- speak-with-dead: Speak With Dead (level 3, utility). Was: Small skull. Make: A pale green-white ghostly face (about a square) rises from the target with a speech bubble of glyphs and spectral wisps.
- incite-greed: Incite Greed (level 3, buff, area circle 30 ft). Was: Thin huge arc like kind:buff, tiny diamonds. Make: Big bright golden coins and gems spill and glitter around each target and gold gleams flash in their eyes. No huge thin ring.
```

### Batch 51

```text
Batch 51. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-51.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- nondetection: Nondetection (level 3, buff). Was: Thin ring. Make: A soft grey-violet veil wraps the target, an eye glyph closes and fades, a faint shimmer stays.
- blink: Blink (level 3, teleport). Was: Small flicker, figure never vanishes. Make: The caster flickers out with a bright violet-white flash and pixel scatter, its figure goes ghostly for a moment, then pops back.
- speak-with-plants: Speak With Plants (level 3, utility). Was: Small green specks. Make: Bright green leaves and vines unfurl around the caster and a flower with a face pops up with a speech bubble.
- tongues: Tongues (level 3, buff). Was: Small glyphs. Make: A large speech bubble (about a square) over the target with runes that shift between alphabets, sparkles.
- motivational-speech: Motivational Speech (level 3, buff). Was: Small. Make: A big rousing banner glyph over the caster, gold rays rising to each target and chevron glyphs over their heads.
- spirit-shroud: Spirit Shroud (level 3, aura-persistent). Was: Thin dashed ring + tiny skulls. Make: Three spectral spirits (pale wisps with faces, half a square each) orbit tightly around the caster within 10 ft over a bright misty floor ring. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- mass-healing-word: Mass Healing Word (level 3, heal). Was: Small rings per target. Make: A bright green-gold word bursts from the caster and splits toward every target, each blooming with a big outlined plus sign and a ring.
- hypnotic: Hypnotic Pattern (level 3, cube). Was: Hypnotic pattern: tiny dark specks, should be a big shimmering colour cube. Make: A big shimmering cube of swirling colour: bands of bright magenta, cyan, gold and violet spiralling over the whole area (ordered dither), hypnotic spirals in each target's eyes. Big and bright, it fills the cube.
- protection-from-energy: Protection From Energy (level 3, buff). Was: Small. Make: An elemental ward shell (tinted by palette) forms around the target with a big element glyph on it.
- remove-curse: Remove Curse (level 3, heal). Was: Small. Make: Dark cursed chains and wisps are pulled out of the target and shatter into bright gold light.
- slow: Slow (level 3, cube). Was: Thin dashed ring + tiny clock. Make: Heavy pale-blue time-warp rings roll slowly over the cube, each target gets a big slowing clock glyph and drag lines.
- sending: Sending (level 3, utility). Was: Tiny. Make: A bright message orb (half a square) shoots off from the caster with a trail and turns into a glowing envelope glyph that flips open.
```

### Batch 52

```text
Batch 52. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-52.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- water-breathing: Water Breathing (level 3, buff). Was: Small bubbles. Make: Big bright bubbles rise from each target's head with a bubble glyph and a blue shimmer.
- revivify: Revivify (level 3, heal). Was: Small, a resurrection should be a big moment. Make: A radiant gold-white pillar of light strikes the fallen target, a big heart glyph pulses, and the figure rises in gold sparkles.
- catnap: Catnap (level 3, buff). Was: Tiny Zs. Make: Big Z glyphs and a crescent moon rise over each target with a soft blue drowsy glow.
- vampiric-touch: Vampiric Touch (level 3, touch). Was: Small hand, dark drain. Make: The touch drains a thick bright crimson ribbon of blood motes from the target back into the caster, a fang glyph flashes, the caster glows red.
- life-transference: Life Transference (level 3, heal). Was: Small. Make: A bright red life stream flows from the caster to the target, the caster dims, and the target flares with a big heal plus sign.
- fly: Fly (level 3, buff). Was: Small cyan wings. Make: Big bright white feathered wings (a square each) unfold from the target's back and flap once, a wind ring under it as the figure lifts.
- ashardalons-stride: Ashardalon's Stride (level 3, aura-persistent, area circle 5 ft (from caster)). Was: Small orange. Make: Flaming footprints blaze under the caster and a wreath of orange-white fire flares around its feet. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- aura-of-purity: Aura Of Purity (level 4, aura-persistent, area circle 30 ft (from caster)). Was: Thin 1 px arc at 30 ft. Make: A strong pale blue-white aura ring at 30 ft from the caster (2–3 px with outline), a soft glow inside and pure motes. The radius is large, so also put a strong glow and a pulse ring on the caster itself: that is the centre of the read. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- aura-of-life: Aura Of Life (level 4, aura-persistent, area circle 30 ft (from caster)). Was: Thin arc + tiny sparkles. Make: A strong green-white aura ring at 30 ft from the caster with life sparks and leaves rising inside. The radius is large, so also put a strong glow and a pulse ring on the caster itself: that is the centre of the read. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- leomunds-secret-chest: Leomund's Secret Chest (level 4, teleport). Was: Small chest. Make: A large ornate chest (about a square, bright gold trim) appears, its lid snaps shut, and it sinks into a violet portal.
- death-ward: Death Ward (level 4, buff). Was: Small badge. Make: A bright gold-white ward glyph (an ankh, about a square) seals onto the target with a halo ring.
- charm-monster: Charm Monster (level 4, buff). Was: Small heart. Make: A big pink swirl wraps the monster, a large heart with a crown pops above it, sparkles.
```

### Batch 53

```text
Batch 53. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-53.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- greaterinvis: Greater Invisibility (level 4, buff). Was: Small grey checker pillar, figure never fades. Make: The target fades into a shimmering pale dithered outline with a burst of motes, leaving only a faint heat-shimmer.
- freedom-of-movement: Freedom Of Movement (level 4, buff). Was: Small. Make: Broken chains fly off the target with bright sparks and a flowing white-blue ribbon swirls around it.
- raulothims-psychic-lance: Raulothim's Psychic Lance (level 4, projectile). Was: Small dart, thin ring. Make: A long bright pink-violet lance of psychic light (thick, outlined) stabs from the caster through the target's head with a psychic shock ring.
- raise-dead: Raise Dead (level 5, heal). Was: Small green ring, resurrection must be big. Make: A massive pillar of white-gold light descends on the fallen target, the figure is lifted among golden halos and rays, a heart pulses.
- seeming: Seeming (level 5, buff). Was: Small dark. Make: A shimmering violet veil sweeps over each target, a mask glyph flashes, and a soft violet shimmer outline stays on each figure.
- holy-weapon: Holy Weapon (level 5, buff). Was: Small gold ring. Make: The weapon blazes with a big radiant white-gold glow and rays, holy sparks.
- swift-quiver: Swift Quiver (level 5, buff). Was: Tiny arrows. Make: A glowing quiver on the caster's back sprouts many bright arrows and two arrows zip off with trails.
- dawn: Dawn (level 5, column, area cylinder 30 ft). Was: Opaque brown disc reads as a wooden table, should be a bright column of sunlight. Make: A bright column of sunlight in the 30 ft cylinder: a pale gold-white disc on the floor with sunbeam rays, a dazzling core, motes rising, light slanting down. It must look like sunlight, not a brown disc. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- conjure-volley: Conjure Volley (level 5, column). Was: Thin 1 px arrow lines scattered, no rain of arrows. Make: A dense rain of bright ghostly arrows (each 6–8 px, white-silver, outlined) falls into the area, impacts burst all over it, dust.
- hallow: Hallow (level 5, sphere). Was: Thin arcs + small sun. Make: A large golden sacred circle rune forms on the ground with holy light pillars at its edge. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- contagion: Contagion (level 5, touch). Was: Small dark specks. Make: A sickly green plague cloud bursts on the target with pustule bubbles and a disease-skull glyph.
- control-winds: Control Winds (level 5, cube). Was: Thin dotted lines. Make: Strong visible gusts (thick white-cyan curls) whip across the cube with small dust devils and leaves. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
```

### Batch 54

```text
Batch 54. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-54.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- creation: Creation (level 5, cube). Was: Small. Make: A shimmering violet-white shape builds up from pixels into a crate-sized object (about a square, outlined) that solidifies.
- mass-cure-wounds: Mass Cure Wounds (level 5, heal). Was: Small. Make: Bright green-gold healing light pours onto every target, each with a big plus sign and a ring.
- danse-macabre: Danse Macabre (level 5, summon). Was: Tiny notes, small skeletons. Make: Bone-white skeleton sprites (two thirds of a square each, outlined) rise from the ground in a ring among eerie green motes.
- commune-with-nature: Commune With Nature (level 5, utility). Was: Thin lines. Make: Bright green roots and leaves spread from the caster in a wide circle and a glowing tree glyph rises above it.
- contact-other-plane: Contact Other Plane (level 5, utility). Was: Small purple. Make: A big swirling violet rift opens above the caster with eldritch eyes peering through.
- awaken: Awaken (level 5, buff). Was: Small eyes. Make: A bright green-gold spark of mind descends into the target, a big eye-opening glyph, leaves swirl.
- geas: Geas (level 5, buff). Was: Small. Make: A glowing gold chain-rune binds around the target's head and a scroll glyph with a seal stamps on.
- enervation: Enervation (level 5, beam). Was: Dark purple beam. Make: A thick violet-green beam with a bright white core drains from the target to the caster, life motes flowing back along it.
- dispel-evil-and-good: Dispel Evil and Good (level 5, buff). Was: Thin 1 px dome outline. Make: A bright white-gold shell of holy light around the caster and a radiant burst that drives dark wisps away.
- hold-monster: Hold Monster (level 5, buff). Was: Small purple bars. Make: Bright golden-violet ring bands lock around the monster and a padlock glyph flashes above it.
- wrath-of-nature: Wrath Of Nature (level 5, cube). Was: Thin scattered green lines, one small tree. Make: The whole cube erupts with nature: thick vines whip out, roots burst, rocks fly and leaves storm, bright greens and browns with pale highlights. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- modify-memory: Modify Memory (level 5, buff). Was: Small. Make: A pink-violet film-strip of memory frames swirls around the target's head, frames swap, a gentle flash.
```

### Batch 55

```text
Batch 55. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-55.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- negative-energy-flood: Negative Energy Flood (level 5, strike). Was: Small dark. Make: A torrent of black-violet negative energy erupts around the target with a bright sickly green-white core, skulls flickering in it.
- destructive-wave: Destructive Wave (level 5, sphere, area circle 30 ft (from caster)). Was: Thin 1 px orange rays and arcs, no wave. Make: A massive shock wave bursts out of the caster across 30 ft: thick bright rings (3 px, outline) of thunder and holy light, a cracked ground ring, dust.
- insect-plague: Insect Plague (level 5, sphere, area circle 20 ft). Was: Thin dark brown specks. Make: A dense swarm of locusts (bright tan and yellow 2–3 px sprites with dark outline) fills the 20 ft sphere and swirls. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- skill-empowerment: Skill Empowerment (level 5, buff). Was: Small. Make: A bright gold star badge glyph above the target with a skill rune and sparkles.
- wall-of-force: Wall Of Force (level 5, wall). Was: Thin dark-blue lattice, should be a pale glassy pane. Make: A pale translucent glassy pane of force (ordered dither of pale blue-white, bright edge highlights) shimmers into place along the wall. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- conjure-fey: Conjure Fey (level 6, summon). Was: Thin ellipse + specks, no fey. Make: A ring of bright fey motes and flowers on the ground and a readable fey creature sprite (a full square, pale green with gold accents) appears in a burst.
- contingency: Contingency (level 6, buff). Was: Small. Make: A glowing gold clockwork rune circle wraps the caster, a gem locks into it with a click, then it fades to a faint gem glow.
- create-homunculus: Create Homunculus (level 6, summon). Was: Small. Make: A small winged homunculus sprite (half a square, outlined) emerges from a crimson-violet alchemical flash.
- create-undead: Create Undead (level 6, summon). Was: Small dark. Make: A green-black necromantic burst and three readable ghoul sprites (two thirds of a square each) claw up out of the ground.
- primordial-ward: Primordial Ward (level 6, buff). Was: Small. Make: A big shell of shifting elemental colours (fire, ice, stone) forms around the target with element glyphs orbiting.
- harm: Harm (level 6, strike). Was: Small. Make: A massive black-violet necrotic burst on the target with a bright sickly green-white core, the figure wracked by dark cracks.
- ottos-irresistible-dance: Otto's Irresistible Dance (level 6, buff). Was: Tiny notes. Make: Big bright music notes swirl around the target under a rainbow spotlight, and the figure bobs left and right, dancing.
```

### Batch 56

```text
Batch 56. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-56.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- flesh-to-stone: Flesh To Stone (level 6, buff). Was: Small grey, figure never turns to stone. Make: Grey stone (bright pale grey with dark outline) creeps up the target's body from the feet and cracks spread across it.
- disintegrate: Disintegrate (level 6, beam). Was: Thin green beam, target dissolves into tiny specks. Make: A thick bright green beam with a white core strikes the target and the figure crumbles into a big cloud of green-white dust that blows away. Violent and iconic.
- scatter: Scatter (level 6, teleport). Was: Small. Make: Each target vanishes in a bright violet flash and reappears nearby with a pop and a swirl ring.
- fizbans-platinum-shield: Fizban's Platinum Shield (level 6, buff). Was: Small. Make: A big gleaming platinum shield (about a square, bright silver-white with blue highlights) appears in front of the target.
- otilukes-freezing-sphere: Otiluke's Freezing Sphere (level 6, sphere). Was: Crude flat opaque discs then thin dashed lines. Make: A bright frost orb shot from the hand explodes into a huge blast of ice: white-blue shards burst outward, ice crystals spike up, frost covers the area.
- heroes-feast: Heroes Feast (level 6, buff). Was: Small. Make: A long glowing banquet table with bright gold platters of food appears, golden light and warm sparkles over the guests.
- gravity-fissure: Gravity Fissure (level 6, line, area line 100 ft (from caster)). Was: Dark purple line vanishes after the flash. Make: A long thick crack of violet-black gravity tears along the line with bright violet-white edges, debris lifting into it.
- investiture-of-stone: Investiture Of Stone (level 6, buff). Was: Small pebbles. Make: Stone plates (bright grey with tan highlights) cover the caster, rocks orbit it, the ground cracks.
- investiture-of-wind: Investiture Of Wind (level 6, buff). Was: Thin rings. Make: A white-cyan tornado swirls around the caster and lifts it with wind streaks.
- drawmijs-instant-summons: Drawmij's Instant Summons (level 6, utility). Was: Small key. Make: A glowing gold sigil appears, a violet swirl portal opens above the hand, and an object pops out of it.
- soul-cage: Soul Cage (level 6, buff). Was: Small lantern. Make: A glowing spectral lantern cage (about a square) appears and catches a bright soul wisp from the target.
- eyebite: Eyebite (level 6, buff). Was: Small eye, tiny Zs. Make: A big pulsing crimson-violet eye glyph (about a square) opens over the caster and fires a beam of dread at the target.
```

### Batch 57

```text
Batch 57. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-57.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- globe-of-invulnerability: Globe Of Invulnerability (level 6, aura-persistent, area circle 10 ft (from caster)). Was: Thin dashed globe that breaks up. Make: A bright shimmering dome (10 ft radius) of pale gold-blue with a thick bright rim and a hex pattern, sparks deflecting off it. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- magic-jar: Magic Jar (level 6, buff). Was: Small jar. Make: A glowing crystal jar (half a square) appears and a bright soul wisp flies out of the caster into it.
- chain-lightning: Chain Lightning (level 6, multi). Was: Thin jagged 1 px bolt to one target, like kind:multi; must arc target to target. Make: A thick bright blue-white lightning bolt jumps from the caster to the first target and then arcs from target to target, each with a big impact star.
- heal: Heal (level 6, heal). Was: Small sparkles; 6th-level heal must be a big burst. Make: A massive green-gold healing burst on the target: a huge plus sign, a big ring, motes rising.
- mass-suggestion: Mass Suggestion (level 6, buff). Was: Small pink rings. Make: Pink whisper spirals wrap every target's head and speech bubbles pop over each.
- crown-of-stars: Crown Of Stars (level 7, multi). Was: Tiny gold specks. Make: Seven bright gold-white stars (5–6 px, outlined) circle the caster's head and one shoots off as a mote at a target.
- create-magen: Create Magen (level 7, summon). Was: Small. Make: A glowing construct sprite (about a square) builds itself out of light inside a bright circle.
- finger-of-death: Finger Of Death (level 7, strike). Was: Thin near-black beam. Make: A thick sickly green-black necrotic bolt with a bright core strikes the target and a huge skull glyph bursts out of it.
- mordenkainens-sword: Mordenkainen's Sword (level 7, summon). Was: Thin small sword. Make: A huge spectral sword (a full square long, bright pale violet-white, outlined) materialises and slashes the target.
- etherealness: Etherealness (level 7, teleport). Was: Small. Make: The caster fades into a pale blue-white ghostly dithered form with drifting motes.
- reverse-gravity: Reverse Gravity (level 7, column, area cylinder 50 ft). Was: Thin 1 px lines, nobody lifts. Make: Creatures in the cylinder are lifted: bright violet upward arrows, rising debris, figures floating up with shadows left below. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- power-word-pain: Power Word Pain (level 7, buff). Was: Small. Make: A crimson glowing word glyph stamps onto the target and pain spikes burst out.
```

### Batch 58

```text
Batch 58. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-58.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- divine-word: Divine Word (level 7, buff). Was: Small rings. Make: A blinding gold-white word blast from the caster: a big rune, rays and a shock ring.
- mirage-arcane: Mirage Arcane (level 7, utility). Was: Small tile square. Make: The terrain in the area shimmers and turns into a large patch of different illusory ground, outlined and dithered at the edges.
- forcecage: Forcecage (level 7, cube). Was: Thin dark-blue bars. Make: A bright pale-blue translucent cage of thick force bars with white highlights slams down around the target. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- regenerate: Regenerate (level 7, heal). Was: Small green specks. Make: A bright green-white regeneration spiral climbs the target with plus signs and new-growth sparkles.
- sequester: Sequester (level 7, buff). Was: Small hourglass + thin oval. Make: A soft violet cocoon forms around the target and an hourglass glyph seals it.
- teleport: Teleport (level 7, teleport). Was: Thin rings, small flash. Make: A bright violet-white column of light swallows the targets, sparkles burst, and they vanish.
- tether-essence: Tether Essence (level 7, buff). Was: Thin 1 px tether. Make: A thick bright crimson-gold tether links the two creatures with hearts pulsing along it.
- antipathy-sympathy: Antipathy/Sympathy (level 8, cube). Was: Thin outline, tiny glyphs. Make: A pulsing aura over the area with two big glyphs (repel and attract) and visible ripples pushing out or pulling in.
- antimagic-field: Antimagic Field (level 8, aura-persistent, area circle 10 ft (from caster)). Was: Thin dark dashed ring. Make: A clear dead-zone sphere (10 ft): a pale grey-white rim with a strong outline and magic motes fizzling out at its edge. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- animal-shapes: Animal Shapes (level 8, buff). Was: Small green. Make: Each target transforms in a bright green flash into a readable beast silhouette.
- abi-dalzims-horrid-wilting: Abi Dalzim's Horrid Wilting (level 8, cube). Was: Thin outline, tiny specks; 8th-level necrotic drain must be huge. Make: The moisture is ripped out of every creature in the cube: thick bright blue water streams pulled up into the air, the ground cracks dry and brown, withered motes.
- glibness: Glibness (level 8, buff). Was: Small. Make: A golden speech-bubble glyph with sparkling words over the caster.
```

### Batch 59

```text
Batch 59. These 12 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-59.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- dominate-monster: Dominate Monster (level 8, buff). Was: Small chain + tiny. Make: A strong violet mind-chain wraps the monster's head and its eyes glow.
- holy-aura: Holy Aura (level 8, aura-persistent, area circle 30 ft (from caster)). Was: Thin arc, small halos. Make: A strong radiant gold-white aura around the caster (30 ft) with angelic halos over each ally. The radius is large, so also put a strong glow and a pulse ring on the caster itself: that is the centre of the read. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- power-word-stun: Power Word Stun (level 8, buff). Was: Small glyph. Make: A huge gold-white word glyph slams onto the target and stars spin around its head.
- reality-break: Reality Break (level 8, buff). Was: Small purple. Make: The target's surroundings shatter into fractal violet-cyan shards and glitchy fragments.
- earthquake: Earthquake (level 8, sphere). Was: One small burst; must crack and shake the whole area. Make: The ground in the area cracks: thick dark fissures with bright tan edges spread from the centre, rocks and dust fly, the whole area shakes. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- tsunami: Tsunami (level 8, wall). Was: Small block of water; must be a huge wall of water. Make: A huge wall of water (many squares wide, tall, bright blue with a white foam crest) crashes forward along the wall. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- shapechange: Shapechange (level 9, buff). Was: Small. Make: A bright swirling transformation on the caster that ends in a large creature silhouette.
- wish: Wish (level 9, utility). Was: Small star; 9th level. Make: A blinding gold-white starburst on the caster, reality ripples, a big wish-star glyph.
- time-stop: Time Stop (level 9, buff). Was: Small hourglass. Make: A huge pale-gold clock face fills the area, grey stillness falls over everything, gears turn and stop.
- imprisonment: Imprisonment (level 9, buff). Was: Small chains + gem. Make: Chains of violet-gold light wrap the target and it shrinks into a glowing gem.
- time-ravage: Time Ravage (level 9, strike). Was: Small hourglass. Make: A big hourglass glyph pours sand over the target and the figure withers with grey cracks.
- blade-of-disaster: Blade Of Disaster (level 9, summon). Was: Small dark blade. Make: A huge black-violet rift blade (a full square, bright crimson edge) rips into existence and slashes.
```

### Batch 60

```text
Batch 60. These 13 spells looked weak on the contact sheets. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-60.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first: every spell here failed it. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- invulnerability: Invulnerability (level 9, buff). Was: Shield then a thin ring. Make: A dazzling gold-white diamond shell forms around the caster and holds.
- power-word-kill: Power Word Kill (level 9, buff). Was: Small glyph; must be a stark death moment. Make: A black word glyph slams onto the target, a stark white skull bursts out, and the figure is struck down.
- power-word-heal: Power Word Heal (level 9, heal). Was: Thin outline. Make: A massive gold-green word glyph bursts on the target and full-body healing light floods it.
- true-polymorph: True Polymorph (level 9, buff). Was: Small, same as mass-polymorph. Make: A bright violet transformation swirl around the target that morphs into a clearly different creature silhouette.
- mass-polymorph: Mass Polymorph (level 9, buff). Was: Small. Make: A bright violet transformation swirl around every target, each morphing into a beast silhouette.
- foresight: Foresight (level 9, buff). Was: Small eye. Make: A big golden third-eye glyph opens above the target and future-sight rays fan out.
- mass-heal: Mass Heal (level 9, heal). Was: Small ring on one target; 9th-level heal must flood the area. Make: A massive wave of green-gold healing light floods the area and a big plus sign blooms on every target.
- kind:sphere: the fallback for every sphere spell without its own definition. Was: Thin ring, dark specks. Make: a bright burst filling the circle: a white flash disc at the centre, a thick 3 px outlined shock ring racing to the radius, a body of bright element-coloured blobs (pale core, mid rim) filling the area, debris and smoke puffs in air, settling to a scorched ring. One blast beat per target; scale the drama with level.
- kind:cube: the fallback for every cube spell without its own definition. Was: Tiny sparkles. Make: the cube's squares light up as a bright outlined tile grid in the element's pale colour, a rising pulse of bright motes or shards in every cell, one beat on each target, then the tiles fade from the edges leaving the outline for a moment.
- kind:heal: the fallback for every heal spell without its own definition. Was: Small ring. Make: a column of bright green-gold light wraps the target from feet to head (about a square wide), a big outlined plus sign pops above the head at the peak, sparkle motes rise, a soft pulse ring settles at the feet. One soft beat.
- kind:summon: the fallback for every summon spell without its own definition. Was: Tiny. Make: a bright summoning circle (2 px ring with runes, a square or more) on the floor, a pillar of light bursts up from it, a puff of smoke clears to reveal a generic outlined creature silhouette about a square tall that holds for a moment. No targets hit.
- kind:utility: the fallback for every utility spell without its own definition. Was: Tiny. Make: a clear rune glyph (half a square) flares at the caster's hand, a bright mote arcs to the target or point and blooms there into a big outlined sparkle ring, then a small rune holds and fades. One soft beat.
- kind:buff: the fallback for every buff spell without its own definition. Was: Thin huge ring, tiny diamonds. Make: a bright band of light rises from each target's feet up the body (2 px outlined, the element's pale colour), a big glyph flashes above the head at the peak, sparkles orbit the figure, a soft ring settles at the feet. Stay on the targets, no huge thin ring across the map. One soft beat per target.
```

### Batch 61

```text
Batch 61. Second pass: these 11 spells were already rebuilt once and still read too small, too dark or unclear at board scale. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-61.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first. For every spell here the iconic image at its peak must be a whole square (16 art px) or bigger, built from the ramp's pale and white steps over a dark outline, and sit on the figure or fill the area. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- kind:buff: the fallback for every buff spell without its own definition. Was: Scattered small coins and a short streak off to the side. Make: Stay on each target: a bright pale band of light (2 px, outlined) rises from the feet up the whole body, a big glyph (a whole square, bright white core) flashes just above the head and holds, 4–6 sparkles orbit the token, a soft ring settles at the feet. Nothing drifts away from the figure.
- kind:heal: the fallback for every heal spell without its own definition. Was: A plus about a third of a square, a thin ring. Make: A column of bright green-gold light a square wide wraps the target from feet to head, a big outlined plus sign (a whole square, white core) pops above the head and holds, sparkle motes rise, a soft pulse ring settles at the feet.
- kind:summon: the fallback for every summon spell without its own definition. Was: A small ring and a tiny skeleton. Make: A bright summoning circle about two squares across (2 px ring, runes on it) on the floor, a pillar of white light bursts up, a smoke puff clears to reveal a big outlined creature silhouette a whole square tall in pale colours that holds for a moment.
- kind:utility: the fallback for every utility spell without its own definition. Was: A small icon that drifts away from the figure. Make: A rune glyph (half a square) flares at the caster, a bright mote arcs to the target or point, and there a big outlined sparkle ring (a whole square) blooms with a rune in its middle that holds, then fades in place.
- kind:cube: the fallback for every cube spell without its own definition. Was: A small box of streaks on one figure; the cube itself never shows. Make: Draw the whole cube from kit.outline: every square in it lights up as a bright outlined tile in the element's pale colour, a rising pulse of bright motes or shards in every cell, one beat on each target, then the tiles fade from the edges inward leaving the outline for a moment. It must cover the full area, not one figure.
- haste: Haste (level 3, buff). Was: A small clock beside the figure. Make: Centre it on the token: a big gold-white clock face (a whole square, white rim) behind the figure with hands spinning fast, 2–3 pale afterimages of the token trailing to one side, bright speed lines streaking past, sparks at the feet. The figure must look fast.
- thunderwave: Thunderwave (level 1, cube, area cube 15 ft (from caster)). Was: Three small arcs; the 15 ft cube never fills. Make: Fill the whole 15 ft cube from the caster: 3 thick pale-blue pressure walls (3 px with outline, as wide as the cube) slam across it one after the other, a white thunderclap flash at the caster, dust and pebbles blow to the far side, a blast beat on each target. Use kit.outline for the cube edge.
- grease: Grease (level 1, cube). Was: A brown blob over the figure. Make: Ground layer only, under the figures: a glossy black-amber puddle that fills the whole cube (bright yellow-white shine streaks and ripple rings on it, so it reads on grass), drips splash at the edges, a slip spark under each target's feet. It must look like a slick floor, never a block. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- inflict-wounds: Inflict Wounds (level 1, touch). Was: Still dark: purple on grass vanishes. Make: A sickly bright green-white hand glyph (a whole square) slams onto the target, the figure flashes pale, bright necrotic cracks spread over the token, a burst of pale green motes. Use the pale and white steps of the ramp, not dark purple.
- divine-favor: Divine Favor (level 1, buff). Was: A thin 1 px blade line. Make: The caster's weapon glows: a big bright gold-white blade shape (a whole square, 2 px with outline) flashes over the token, holy rays fan out from it, a gold ring settles at the feet.
- resistance: Resistance (level 0, buff). Was: A small shield that fades fast. Make: A big pale shield glyph (a whole square, white rim) forms in front of the target and holds for the peak, a bright shimmer runs over the token, a soft ring settles at the feet.
```

### Batch 62

```text
Batch 62. Second pass: these 11 spells were already rebuilt once and still read too small, too dark or unclear at board scale. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-62.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first. For every spell here the iconic image at its peak must be a whole square (16 art px) or bigger, built from the ramp's pale and white steps over a dark outline, and sit on the figure or fill the area. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- healing-spirit: Healing Spirit (level 2, heal). Was: A small wisp; its lasting loop is tiny. Make: A spectral spirit a whole square tall (bright green-white, outlined, a beast or wisp shape) rises in the area, heal motes and a big plus fall onto a creature. Its lasting loop keeps that full-size spirit hovering and bobbing gently. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- lesser-restoration: Lesser Restoration (level 2, heal). Was: A small plus. Make: Bright white-green light washes down the target from head to feet, a big outlined plus (a whole square) pops above the head and holds, dark specks are shaken off the token and fade.
- remove-curse: Remove Curse (level 3, heal). Was: Dark chains and a small ring. Make: Bright violet-white chains wrap the target, then shatter outward in pale shards; a big gold-white ring (a whole square and a half) flashes around the token and holds. Use bright, pale colours so it reads on grass.
- see-invisibility: See Invisibility (level 2, buff). Was: Small. Make: A big pale-blue eye glyph (a whole square) opens over the caster, a bright cone of light sweeps out, and faint outlined shapes shimmer into view where it passes.
- darkvision: Darkvision (level 2, buff). Was: A small cone. Make: A big green-white eye glyph (a whole square) opens over the target, its iris glows, and a bright green sight cone 2 squares long fans out from the token and holds.
- animate-dead: Animate Dead (level 3, summon). Was: A small skeleton. Make: A dark grave opening on the floor with bright green rim light, a bone-white skeleton a whole square tall claws up out of it and stands, green soul motes rise around it.
- magic-stone: Magic Stone (level 0, projectile). Was: A small pebble and burst. Make: Three pebbles in the caster's hand glow bright blue-white, each big enough to read (a third of a square, outlined) with a halo; at the peak they flash together.
- prestidigitation: Prestidigitation (level 0, utility). Was: A small sparkle. Make: A playful burst at the caster: a big puff of bright multi-coloured sparkles and little stars (a whole square), a tiny firework pop, confetti falls.
- mending: Mending (level 0, utility). Was: A small cup. Make: A big broken object glyph (a whole square, a cracked pot) floats over the target, bright gold seams knit the pieces together and it flashes whole.
- gift-of-alacrity: Gift Of Alacrity (level 1, buff). Was: A small clock. Make: A big gold clock face (a whole square, white rim) appears over the target, its hands race forward, speed lines streak past the token.
- disguise-self: Disguise Self (level 1, buff). Was: A small mask. Make: A big pale mask glyph (a whole square) sweeps down over the caster, a shimmer ripples over the whole token, the figure flickers to a different tint for a moment.
```

### Batch 63

```text
Batch 63. Second pass: these 11 spells were already rebuilt once and still read too small, too dark or unclear at board scale. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-63.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first. For every spell here the iconic image at its peak must be a whole square (16 art px) or bigger, built from the ramp's pale and white steps over a dark outline, and sit on the figure or fill the area. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- wristpocket: Wristpocket (level 2, utility). Was: A small swirl. Make: A bright violet pocket portal (half a square, white rim) opens at the caster's wrist, an outlined object glyph spins into it, and the portal snaps shut with a flash.
- detect-thoughts: Detect Thoughts (level 2, utility). Was: Small bubbles. Make: Big thought bubbles (a whole square, white with outline) rise from the target with bright symbols in them, a pale psychic line links them to the caster.
- fortunes-favor: Fortunes Favor (level 2, buff). Was: A small coin. Make: A big gold coin (a whole square, white shine) spins and flips over the target, lands with a flash, lucky sparkles orbit the token.
- gift-of-gab: Gift Of Gab (level 2, utility). Was: A small bubble. Make: A big speech bubble (a whole square, white with outline) pops over the caster with a bright golden squiggle in it, small sparkles burst out.
- animal-messenger: Animal Messenger (level 2, utility). Was: A small bird. Make: A bright white bird a whole square across (outlined, wings spread) lifts off the caster's hand with a flash and flies away trailing pale sparkles.
- pass-without-trace: Pass Without Trace (level 2, buff). Was: Small. Make: A wide pale silver mist ring (two squares across) settles around the caster and the allies nearby, footprints on the ground fade out, figures shimmer softly.
- water-walk: Water Walk (level 3, buff). Was: Small ripples. Make: Bright blue-white ripple rings (a whole square, 2 px) spread under each target's feet and a glowing disc of water holds under the token, splashes at the edges.
- seeming: Seeming (level 5, buff). Was: A small veil. Make: A big pale shimmering veil (a whole square, outlined) drops over each target and ripples, a flash of colour changes the token's tint for a moment.
- control-winds: Control Winds (level 5, cube). Was: One small funnel and streaks at the cube edge. Make: Fill the whole cube: thick pale-blue wind bands (2 px with outline) swirl through it, a big funnel a square and a half tall spins in the middle, dust and leaves race across, the cube outline shows. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- awaken: Awaken (level 5, buff). Was: Small. Make: A tree or beast glyph a whole square tall glows bright green-gold, two big eyes open on it with a flash, leaves and sparkles burst out.
- create-homunculus: Create Homunculus (level 6, summon). Was: Small. Make: A drop of blood on a gold summoning circle (a whole square), a puff of smoke, and a small winged creature (half a square, outlined, bright) hops up and flaps.
```

### Batch 64

```text
Batch 64. Second pass: these 8 spells were already rebuilt once and still read too small, too dark or unclear at board scale. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-64.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first. For every spell here the iconic image at its peak must be a whole square (16 art px) or bigger, built from the ramp's pale and white steps over a dark outline, and sit on the figure or fill the area. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- conjure-fey: Conjure Fey (level 6, summon). Was: A smallish creature in a thin ring. Make: A bright ring of mushrooms and flowers (two squares across) springs up, green-white light bursts from it, and an outlined fey creature a whole square tall steps out and holds.
- flesh-to-stone: Flesh To Stone (level 6, buff). Was: A small grey statue, low contrast. Make: Pale stone (bright light grey with white highlights and a dark outline) creeps up over the whole token from the feet, wide cracks spread across it, the figure ends as a clear stone statue a whole square tall.
- investiture-of-stone: Investiture Of Stone (level 6, buff). Was: Small grey pebbles. Make: Big pale stone plates (bright light grey and tan, outlined) slam onto the caster and form armour a whole square tall, rocks burst up around the feet, a dust ring settles.
- magic-jar: Magic Jar (level 6, buff). Was: A small jar. Make: A big glowing jar (a whole square, pale blue glass with white shine) appears at the caster, the caster's soul (a bright white wisp) streams into it, the jar flashes and holds.
- crown-of-stars: Crown Of Stars (level 7, multi). Was: Tiny sparkles above the head. Make: A crown of 7 bright star motes (each a third of a square, white core, gold halo) circles above the caster's head and holds; one star streaks off toward the target and bursts.
- mordenkainens-sword: Mordenkainen's Sword (level 7, summon). Was: A small sword. Make: A big spectral sword a square and a half long (bright white-violet, 2 px with outline) appears beside the target, swings in a wide arc and strikes with a slash flash.
- regenerate: Regenerate (level 7, heal). Was: A small green squiggle. Make: Bright green-gold light spirals up the target's whole body, a big outlined heartbeat line or plus (a whole square) pulses over the token and holds, leaves and motes rise.
- earthquake: Earthquake (level 8, sphere). Was: Too heavy: dark cracks cover the whole frame and hide the figures. Make: Keep the cracks on the ground layer under the figures and thinner: 2 px dark fissures with bright tan edges spreading from the centre across the area, light dust puffs, shaking. Figures must stay clearly visible on top. The lasting loop keeps only the cracks, calm. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
```

### Batch 65

```text
Batch 65. Third pass: these 6 spells were rebuilt twice and still read too small for their area or target. Their old definitions have been deleted; write new ones from scratch in board-pixel-spells-65.js. Don't look for or reuse the old code. Read the "Readability" section of BRIEF.md first. Size is the problem here: work the sizes out from s.area and s.grid as each line says, and check the peak frame covers what it should. Spells marked Lasting also follow RESERVED.md for their lasting loop. Use the archetype and area noted (the board passes that template in s.area).
- kind:cube: the fallback for every cube spell without its own definition. Was: Only a small corner bracket shows; the cube never reads. Make: Work out the cube in cells (cells = s.area.feet / s.grid.feet) and draw all of it: a closed 2 px pale outline along all four sides of kit.outline(s.area, s.grid), every cell inside lit as a bright tile in the element's pale colour with a rising mote, one beat on each target, then the tiles fade from the edges inward while the full outline holds a moment. Never just a corner.
- grease: Grease (level 1, cube). Was: A round slick about one square, not the 10 ft area. Make: Work out the cube in cells (cells = s.area.feet / s.grid.feet, so 2 by 2 for 10 ft) and cover every cell edge to edge with the slick, on the ground layer under the figures: glossy black-amber with bright yellow-white shine streaks and ripple rings, drips at the edges, a slip spark under each target. The slick is a square patch the size of the area, not a round blob on one figure. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- earthquake: Earthquake (level 8, sphere). Was: Readable now, but the cracks cover only 2-3 squares of a huge area. Make: The cracks must reach the edge of the circle (radius in cells = s.area.feet / s.grid.feet; it can be bigger than the view, that's fine): 8-12 long branching fissures from the centre, 2 px dark with bright tan edges, on the ground layer under the figures, light dust puffs along them and a shake. Keep them thin and spaced out so the figures stay clear on top; no dark fill. Lasting: also add a calm linger loop (lingerAir only if something must float over figures) per RESERVED.md that keeps it drawn while it lasts.
- animate-dead: Animate Dead (level 3, summon). Was: The skeleton is still small. Make: A grave opening a square and a half across with bright green rim light on the floor at the point, and a bone-white skeleton a square and a half tall (bright white bones, dark outline, green eye glints) claws up out of it and stands for the peak, green soul motes rising around it.
- wristpocket: Wristpocket (level 2, utility). Was: Small, and it ends in scattered specks. Make: A bright violet pocket portal a whole square across (white rim, dark outline) opens beside the caster, an outlined object glyph a whole square tall spins into it, the portal snaps shut with a held white flash, then a small violet ring stays a moment and fades. No scattered specks.
- seeming: Seeming (level 5, buff). Was: The veil is small. Make: On each target a shimmering pale veil a square and a half tall (white and pale violet bands, dark outline) drops over the whole token and holds for the peak, its colours ripple, and the token's tint changes for a moment before it settles.
```

## Fix prompt (Claude fills in the failures)

```text
The checker rejected board-pixel-spells-NN.js:
<failures>
Fix only those problems and send the whole file again, same format.
```
