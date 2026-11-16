const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');

const g = load();
const F = g.SubclassFX;
const audit = fixture('subclass-audit.json');
const pc = (classId, level, classSubclass, extra = {}) => {
  const s = g.Rules.validate({ ...g.Rules.initial(), classId, level, classSubclass, ...extra });
  s.hp = g.Rules.stats(s).maxHP;
  return s;
};
const weapon = (s, equipmentId, extra = {}) => {
  const it = {
    id: 'w-' + equipmentId,
    equipmentId,
    name: equipmentId,
    qty: 1,
    category: 'Armas',
    weight: 1,
    location: '',
    notes: '',
    ...extra,
  };
  s.inventory.push(it);
  return it;
};

test('cobertura: cada rasgo con datos existe en la auditoría y nombra una subclase real', () => {
  const rows = new Set(audit.map(r => r.sub + ':' + r.feature));
  const bad = F.keys().filter(k => !rows.has(k));
  assert.equal(JSON.stringify(bad), '[]');
  for (const id of new Set(F.keys().map(k => k.split(':')[0])))
    assert.ok(
      g.ClassData.subclasses.some(s => s.id === id),
      id,
    );
  // El nivel de cada rasgo coincide con el de la auditoría.
  for (const r of audit) {
    const spec = g.SubclassFXData[r.sub]?.[r.feature];
    if (spec && r.feature !== 'Additional Superiority Die' && r.feature !== 'Inspiring Surge')
      assert.equal(spec.lv, r.level, r.sub + ':' + r.feature);
  }
  // Todos los rasgos auditados tienen nombre en castellano.
  assert.ok(audit.every(r => g.SubclassFXNames[r.sub + ':' + r.feature]));
});

test('ataque adicional por id de subclase aunque el nombre esté traducido', () => {
  assert.notEqual(g.Classes.sub(pc('bard', 6, 'bard-college-of-valor')).name, 'College of Valor');
  for (const [c, l, sub] of [
    ['bard', 6, 'bard-college-of-valor'],
    ['bard', 6, 'bard-college-of-swords'],
    ['artificer', 5, 'artificer-battle-smith'],
    ['artificer', 5, 'artificer-armorer'],
    ['wizard', 6, 'wizard-bladesinging'],
  ]) {
    assert.equal(g.Attacks.attacksPerAction(pc(c, l, sub)), 2, sub);
    assert.equal(g.Attacks.attacksPerAction(pc(c, l - 1, sub)), 1, sub + ' antes del nivel');
  }
  assert.equal(g.Attacks.attacksPerAction(pc('bard', 6, 'bard-college-of-lore')), 1);
});

test('maestro de batalla: dados de superioridad por id, con su escala', () => {
  const sup = l => g.Classes.resources(pc('fighter', l, 'fighter-battle-master')).find(r => r.id === 'superiority');
  assert.equal(sup(3).max, 4);
  assert.match(sup(3).name + sup(3).text, /d8/);
  assert.equal(sup(7).max, 5);
  assert.match(sup(10).text, /d10/);
  assert.equal(sup(15).max, 6);
  assert.match(sup(18).text, /d12/);
  assert.equal(sup(2), undefined);
});

test('campeón: crítico con 19 y luego 18; Superviviente cura al empezar el turno', () => {
  const s = pc('fighter', 3, 'fighter-champion');
  weapon(s, 'longsword');
  const p = g.Attacks.profile(s, s.inventory.at(-1));
  assert.equal(p.crit, 19);
  assert.equal(g.Attacks.rollAttack(p, '', () => 19).crit, true);
  assert.equal(g.Attacks.rollAttack(p, '', () => 18).crit, false);
  assert.equal(F.crit(pc('fighter', 15, 'fighter-champion')), 18);
  assert.equal(g.Attacks.profile(s, g.Attacks.options(s).at(-1)).crit, 20, 'sin armas no cuenta');
  const t = pc('fighter', 18, 'fighter-champion', {
    abilities: { str: 16, dex: 10, con: 14, int: 10, wis: 10, cha: 10 },
  });
  t.hp = 10;
  const notes = g.Combat.start(t);
  assert.equal(t.hp, 17);
  assert.match(notes[0], /Superviviente/);
  t.hp = t.hp + 200;
  t.hp = g.Rules.stats(t).maxHP;
  assert.equal(g.Combat.start(t).length, 0);
});

test('Golpe divino: una vez por turno; Golpes bendecidos lo reemplaza con los opcionales de Tasha', () => {
  const s = pc('cleric', 8, 'cleric-life-domain');
  weapon(s, 'mace');
  g.Combat.start(s);
  let r = g.Attacks.profile(s, s.inventory.at(-1)).riders;
  assert.equal(r.length, 1);
  assert.equal(r[0].dice, '1d8');
  assert.equal(r[0].type, 'radiant');
  assert.ok(r[0].available);
  F.markOnce(s, r[0].id);
  assert.equal(g.Attacks.profile(s, s.inventory.at(-1)).riders[0].available, false);
  g.Combat.start(s);
  assert.ok(g.Attacks.profile(s, s.inventory.at(-1)).riders[0].available, 'nuevo turno');
  const dmg = g.Attacks.rollDamage(g.Attacks.profile(s, s.inventory.at(-1)), true, () => 3, r);
  assert.equal(dmg.parts.at(-1).rolls.length, 2, 'en crítico duplica');
  assert.equal(pc('cleric', 14, 'cleric-life-domain').inventory.length, 0);
  assert.equal(F.riders(pc('cleric', 14, 'cleric-life-domain'))[0].dice, '2d8');
  const t = pc('cleric', 8, 'cleric-life-domain', { optionalClassFeatures: true });
  assert.equal(
    F.riders(t)
      .map(x => x.label)
      .join(),
    'Golpes bendecidos',
  );
});

test('conjuros: Discípulo de la vida, Curación suprema, Lanzamiento potente y Evocación potenciada', () => {
  const life = pc('cleric', 17, 'cleric-life-domain');
  const cure = { id: 'cure', level: 1, damageTypes: [] };
  const heal = F.spellBonus(life, cure, { slot: 3, heal: true, classId: 'cleric' });
  assert.equal(heal.find(b => /Discípulo/.test(b.label)).value, 5);
  assert.ok(heal.some(b => b.max));
  assert.equal(F.spellBonus(life, { id: 'x', level: 0 }, { heal: true }).filter(b => b.value).length, 0);
  const light = pc('cleric', 8, 'cleric-light-domain', {
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 18, cha: 10 },
  });
  const flame = { id: 'sacred-flame', level: 0, damageTypes: ['radiante'], saveAbility: ['Destreza'] };
  assert.equal(F.spellBonus(light, flame, { classId: 'cleric' })[0].value, 4);
  assert.equal(F.spellBonus(light, flame, { classId: 'wizard' }).length, 0, 'solo trucos de clérigo');
  assert.equal(F.spellBonus(light, { ...flame, level: 1 }, { classId: 'cleric' }).length, 0);
  const evo = pc('wizard', 10, 'wizard-school-of-evocation', {
    abilities: { str: 10, dex: 10, con: 10, int: 18, wis: 10, cha: 10 },
  });
  const ball = { id: 'fireball', level: 3, school: 'Evocación', damageTypes: ['fuego'], saveAbility: ['Destreza'] };
  assert.equal(F.spellBonus(evo, ball, { classId: 'wizard' }).find(b => /Evocación/.test(b.label)).value, 4);
  assert.equal(
    F.spellBonus(evo, { ...ball, school: 'Conjuración' }, { classId: 'wizard' }).filter(b => b.value).length,
    0,
  );
  const cel = pc('warlock', 6, 'warlock-the-celestial', {
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 },
  });
  assert.equal(F.spellBonus(cel, { id: 'eb', level: 0, damageTypes: ['fuerza'] }).length, 0);
  assert.equal(F.spellBonus(cel, { id: 'fb', level: 0 }, { types: ['fuego'] })[0].value, 3);
});

test('defensas, CA, salvaciones, iniciativa y pruebas', () => {
  const forge = pc('cleric', 6, 'cleric-forge-domain');
  forge.inventory.push({
    id: 'plate',
    equipmentId: 'plate-armor',
    name: 'Placas',
    qty: 1,
    category: 'Armaduras',
    weight: 65,
    location: '',
    notes: '',
  });
  forge.equipmentDefense = { armorId: 'plate', shieldId: '', formula: 'auto', bonus: 0 };
  assert.equal(g.Equipment.defense(forge).total, 19);
  assert.equal(g.Defenses.apply(forge, [{ amount: 10, type: 'fuego' }]).total, 5);
  const war = pc('wizard', 10, 'wizard-war-magic', {
    abilities: { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
  });
  const ac = g.Rules.stats(war).ac,
    save = g.Rules.saveBonus(war, 'con');
  war.concentration = 'haste';
  assert.equal(g.Rules.stats(war).ac, ac + 2);
  assert.equal(g.Rules.saveBonus(war, 'con'), save + 2);
  assert.ok(g.Rules.initiativeParts(war).some(p => p.value === 3 && /Ingenio/.test(p.label)));
  const gloom = pc('ranger', 7, 'ranger-gloom-stalker');
  assert.equal(g.Rules.saveBonus(gloom, 'wis'), g.Rules.saveBonus(pc('ranger', 6, 'ranger-gloom-stalker'), 'wis') + 3);
  const samurai = pc('fighter', 7, 'fighter-samurai', {
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 },
  });
  assert.ok(g.Rules.checkParts(samurai, 'cha', 'persuasion').some(p => p.value === 2));
  assert.ok(!g.Rules.checkParts(samurai, 'cha', 'deception').some(p => /Cortesano/.test(p.label)));
  const berserk = pc('barbarian', 6, 'barbarian-path-of-the-berserker');
  assert.ok(!g.Defenses.of(berserk).conditions.includes('Hechizado'));
  berserk.raging = true;
  assert.ok(g.Defenses.of(berserk).conditions.includes('Hechizado'));
  const oath = pc('paladin', 15, 'paladin-oathbreaker');
  const hit = g.Defenses.apply(oath, [{ amount: 10, type: 'cortante' }]);
  assert.equal(hit.total, 10);
  assert.match(hit.notes.join(), /no mágicas/);
  assert.equal(g.Rules.stats(pc('rogue', 9, 'rogue-scout')).speed, 40);
});

test('la tarjeta del rasgo dice qué hace la ficha', () => {
  const s = pc('cleric', 8, 'cleric-light-domain');
  const row = g.Campaign.characterTraits(s).find(r => r.key === 'sub:cleric-light-domain:Potent Spellcasting');
  assert.match(row.note, /En la ficha: .*Sabiduría/);
  const champ = g.Campaign.characterTraits(pc('fighter', 3, 'fighter-champion'));
  assert.match(champ.find(r => r.key === 'sub:fighter-champion:Champion').note, /19 o 20/);
});

test('usos propios: aparecen en Recursos, se gastan y vuelven con su descanso', () => {
  const s = pc('fighter', 10, 'fighter-samurai');
  const fs = g.Classes.resources(s).find(r => r.name === 'Espíritu de lucha');
  assert.equal(fs.max, 3);
  assert.equal(fs.reset, 'long');
  g.Classes.spend(s, fs.id, 1);
  g.Classes.reset(s, 'short');
  assert.equal(g.Classes.spent(s, fs), 1);
  g.Classes.reset(s, 'long');
  assert.equal(g.Classes.spent(s, fs), 0);
  const r = F.find(s, fs.id);
  assert.equal(r.u.roll.flat(r.x), 10, 'PG temporales a nivel 10');
});

test('reservas psiónicas, CD y rasgos que gastan Canalizar divinidad o ki', () => {
  const psi = pc('fighter', 5, 'fighter-psi-warrior', {
    abilities: { str: 16, dex: 10, con: 10, int: 14, wis: 10, cha: 10 },
  });
  const pool = g.Classes.resources(psi).find(r => r.id === 'sfx:fighter-psi-warrior-psi');
  assert.equal(pool.max, 6);
  assert.equal(F.find(psi, pool.id).u.pool.die(F.find(psi, pool.id).x), 8);
  assert.ok(g.Classes.resources(psi).some(r => r.id === 'sfx:fighter-psi-warrior-psi-recover'));
  const light = pc('cleric', 2, 'cleric-light-domain');
  const dawn = F.actions(light).find(r => /Dawn/.test(r.e.en));
  assert.equal(dawn.u.shared, 'channel');
  assert.equal(F.dc(dawn), g.Rules.stats(light).dc);
  const monk = pc('monk', 17, 'monk-way-of-the-long-death', {
    abilities: { str: 10, dex: 16, con: 10, int: 10, wis: 16, cha: 10 },
  });
  const touch = F.actions(monk).find(r => /Touch of the Long Death/.test(r.e.en));
  assert.equal(F.dc(touch), 8 + 6 + 3);
  assert.equal(touch.u.roll.dice({ ...touch.x, n: 4 }), '8d10');
});

test('lanzamientos gratuitos de la subclase: por descanso, compartidos y por puntos', () => {
  const free = s =>
    g.Grants.spells(s)
      .filter(x => x.freeResource)
      .map(x => x.id + ':' + x.max + ':' + x.reset)
      .sort()
      .join();
  const alch = pc('artificer', 15, 'artificer-alchemist', {
    abilities: { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
  });
  assert.equal(free(alch), 'greater-restoration:1:long,heal:1:long,lesser-restoration:3:long');
  assert.equal(free(pc('artificer', 14, 'artificer-alchemist')).includes('heal'), false);
  const anc = pc('barbarian', 10, 'barbarian-path-of-the-ancestral-guardian');
  const ids = g.Grants.spells(anc).map(x => x.freeResource);
  assert.equal(ids.length, 2, 'Augurio y Clarividencia, sin las copias sin límite');
  assert.equal(new Set(ids).size, 1, 'comparten un solo uso');
  const sh = pc('sorcerer', 3, 'sorcerer-shadow-magic');
  assert.ok(g.Grants.spells(sh).some(x => x.id === 'darkness' && x.costResource === 'sorcery' && x.cost === 2));
  assert.ok(!g.Grants.spells(pc('sorcerer', 2, 'sorcerer-shadow-magic')).some(x => x.costResource));
});

test('estados: Canto del filo suma CA y velocidad, dura 10 turnos y termina con el descanso', () => {
  const s = pc('wizard', 14, 'wizard-bladesinging', {
    abilities: { str: 10, dex: 14, con: 12, int: 18, wis: 10, cha: 10 },
  });
  const ac = g.Rules.stats(s).ac,
    speed = g.Rules.stats(s).speed;
  g.Combat.start(s);
  F.startState(s, 'wizard-bladesinging:Bladesong');
  assert.equal(g.Rules.stats(s).ac, ac + 4);
  assert.equal(g.Rules.stats(s).speed, speed + 10);
  assert.ok(
    F.damageMods(s, { melee: true }).some(m => m.value === 4),
    'Canción de la victoria',
  );
  assert.ok(F.actions(s).some(r => r.u.id === 'song-of-defense'));
  assert.equal(F.states(s)[0].left, 10);
  for (let i = 0; i < 9; i++) g.Combat.start(s);
  assert.equal(F.states(s).length, 1);
  const notes = g.Combat.start(s);
  assert.equal(F.states(s).length, 0);
  assert.match(notes.join(), /Terminó: /);
  F.startState(s, 'wizard-bladesinging:Bladesong');
  g.Classes.reset(s, 'short');
  assert.equal(g.Rules.stats(s).ac, ac);
  assert.throws(() => g.Rules.validate({ ...s, subclassStates: { x: { until: 'a' } } }));
  assert.ok(g.Rules.validate({ ...s, subclassStates: { x: { until: null } } }));
});

test('estados: Arma sagrada suma al ataque, Conquistador invencible cambia ataques y crítico', () => {
  const dev = pc('paladin', 3, 'paladin-oath-of-devotion', {
    abilities: { str: 16, dex: 10, con: 12, int: 10, wis: 10, cha: 16 },
  });
  weapon(dev, 'longsword');
  const before = g.Attacks.profile(dev, dev.inventory.at(-1)).toHit;
  F.startState(dev, 'paladin-oath-of-devotion:Sacred Weapon');
  assert.equal(g.Attacks.profile(dev, dev.inventory.at(-1)).toHit, before + 3);
  const con = pc('paladin', 20, 'paladin-oath-of-conquest');
  assert.equal(g.Attacks.attacksPerAction(con), 2);
  F.startState(con, 'paladin-oath-of-conquest:Invincible Conqueror');
  assert.equal(g.Attacks.attacksPerAction(con), 3);
  assert.equal(F.crit(con), 19);
  assert.equal(g.Defenses.apply(con, [{ amount: 10, type: 'fuego' }]).total, 5);
  const stars = pc('druid', 10, 'druid-circle-of-stars');
  F.startState(stars, 'druid-circle-of-stars:Starry Form/chalice');
  assert.ok(F.spellBonus(stars, { id: 'cure', level: 1 }, { heal: true, slot: 1 }).some(b => /Cáliz/.test(b.label)));
  assert.throws(() => F.startState(stars, 'druid-circle-of-stars:Starry Form/nope'));
  const dragon = pc('sorcerer', 14, 'sorcerer-draconic-bloodline');
  assert.equal(F.toggles(dragon)[0].name, 'Alas de dragón');
  F.startState(dragon, F.toggles(dragon)[0].key);
  assert.equal(F.speeds(dragon, 30)[0].value, 30);
});

test('elecciones: tótem del oso, maniobras con su dado, guerrero maleficio y resiliencia infernal', () => {
  const bear = pc('barbarian', 3, 'barbarian-path-of-the-totem-warrior');
  assert.equal(F.pending(bear).length, 1);
  F.setChoice(bear, 'barbarian-path-of-the-totem-warrior:Totem Spirit', ['bear']);
  assert.equal(F.pending(bear).length, 0);
  assert.equal(g.Defenses.apply(bear, [{ amount: 10, type: 'fuego' }]).total, 10);
  bear.raging = true;
  assert.equal(g.Defenses.apply(bear, [{ amount: 10, type: 'fuego' }]).total, 5);
  assert.equal(g.Defenses.apply(bear, [{ amount: 10, type: 'psíquico' }]).total, 10);
  assert.throws(() => F.setChoice(bear, 'barbarian-path-of-the-totem-warrior:Totem Spirit', ['bear', 'wolf']));

  const bm = pc('fighter', 10, 'fighter-battle-master');
  weapon(bm, 'longsword');
  const key = 'fighter-battle-master:Combat Superiority';
  assert.equal(F.choices(bm).find(c => c.key === key).count, 7);
  F.setChoice(bm, key, ['trip', 'parry', 'riposte']);
  const trip = g.Attacks.profile(bm, bm.inventory.at(-1)).riders.find(r => /^Derribo/.test(r.label));
  assert.equal(trip.dice, '1d10');
  assert.match(trip.label, /CD \d+/);
  assert.equal(trip.checked, false);
  assert.equal(trip.cost.left, 5);
  F.pay(bm, 'superiority', 5);
  assert.equal(g.Attacks.profile(bm, bm.inventory.at(-1)).riders.find(r => /^Derribo/.test(r.label)).available, false);
  assert.ok(F.actions(bm).some(r => r.u.id === 'mnv-parry'));

  const hex = pc('warlock', 1, 'warlock-the-hexblade', {
    abilities: { str: 8, dex: 10, con: 12, int: 10, wis: 10, cha: 16 },
  });
  const sword = weapon(hex, 'longsword');
  assert.equal(g.Attacks.profile(hex, sword).ability, 'str');
  F.setChoice(hex, 'warlock-the-hexblade:Hex Warrior', [sword.id]);
  assert.equal(g.Attacks.profile(hex, sword).ability, 'cha');

  const fiend = pc('warlock', 10, 'warlock-the-fiend');
  F.setChoice(fiend, 'warlock-the-fiend:Fiendish Resilience', ['cold']);
  assert.equal(g.Defenses.apply(fiend, [{ amount: 9, type: 'frío' }]).total, 4);
  assert.match(F.choices(fiend)[0].options.find(o => o.id === 'cold').name, /Frío/);
  assert.throws(() => g.Rules.validate({ ...fiend, subclassChoices: { a: 'b' } }));
});

test('runas, enjambre, presagio y tormenta', () => {
  const rk = pc('fighter', 7, 'fighter-rune-knight');
  F.setChoice(rk, 'fighter-rune-knight:Rune Carver', ['hill', 'stone', 'fire']);
  assert.equal(g.Defenses.apply(rk, [{ amount: 10, type: 'veneno' }]).total, 5);
  assert.equal(F.darkvision(rk, 0), 120);
  const fire = g.Classes.resources(rk).find(r => r.id === 'sfx:fighter-rune-knight-rune-runa-del-fuego');
  assert.equal(fire.max, 1);
  assert.equal(fire.reset, 'short');
  const sk = pc('ranger', 11, 'ranger-swarmkeeper');
  F.setChoice(sk, 'ranger-swarmkeeper:Gathered Swarm', ['damage']);
  assert.equal(F.riders(sk)[0].dice, '1d8');
  const div = pc('wizard', 14, 'wizard-school-of-divination');
  assert.equal(
    F.find(div, 'sfx:wizard-school-of-divination-portent').u.portent(
      F.find(div, 'sfx:wizard-school-of-divination-portent').x,
    ),
    3,
  );
  div.portent = [3, 17];
  assert.ok(g.Rules.validate(div));
  g.Classes.reset(div, 'long');
  assert.equal(div.portent, undefined);
  const storm = pc('barbarian', 6, 'barbarian-path-of-the-storm-herald');
  F.setChoice(storm, 'barbarian-path-of-the-storm-herald:Storm Aura', ['sea']);
  assert.equal(g.Defenses.apply(storm, [{ amount: 10, type: 'relámpago' }]).total, 5);
  assert.equal(F.speeds(storm, 30).find(x => x.kind === 'swim').value, 30);
  assert.ok(F.actions(storm).some(r => r.u.id === 'aura-sea' && F.dc(r)));
});
