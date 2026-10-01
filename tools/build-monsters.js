// Genera monsters-data.js a partir de 5e-SRD-Monsters.json (5e-bits, SRD 5.1 bajo CC-BY-4.0).
// Uso: node tools/build-monsters.js ruta/a/5e-SRD-Monsters.json
const fs = require('fs');
const src = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const SIZE = {
  Tiny: 'Diminuto',
  Small: 'Pequeño',
  Medium: 'Mediano',
  Large: 'Grande',
  Huge: 'Enorme',
  Gargantuan: 'Gargantuesco',
};
const TYPE = {
  aberration: 'aberración',
  beast: 'bestia',
  celestial: 'celestial',
  construct: 'constructo',
  dragon: 'dragón',
  elemental: 'elemental',
  fey: 'feérico',
  fiend: 'infernal',
  giant: 'gigante',
  humanoid: 'humanoide',
  monstrosity: 'monstruosidad',
  ooze: 'cieno',
  plant: 'planta',
  undead: 'muerto viviente',
  swarm: 'enjambre',
};
const DMG = {
  acid: 'ácido',
  bludgeoning: 'contundente',
  cold: 'frío',
  fire: 'fuego',
  force: 'fuerza',
  lightning: 'relámpago',
  necrotic: 'necrótico',
  piercing: 'perforante',
  poison: 'veneno',
  psychic: 'psíquico',
  radiant: 'radiante',
  slashing: 'cortante',
  thunder: 'trueno',
};
const ABIL = { STR: 'str', DEX: 'dex', CON: 'con', INT: 'int', WIS: 'wis', CHA: 'cha' };
const type = t => {
  const base = String(t || '')
    .split(' ')[0]
    .toLowerCase();
  return TYPE[base] || t;
};
const speed = s =>
  Object.entries(s || {})
    .map(([k, v]) => (k === 'walk' ? v : k + ' ' + v))
    .join(', ');
const prof = (list, prefix) =>
  (list || [])
    .filter(p => p.proficiency.name.startsWith(prefix))
    .map(p => p.proficiency.name.replace(prefix, '') + ' +' + p.value)
    .join(', ');
const damage = arr =>
  (arr || []).flatMap(d =>
    d.damage_dice
      ? [[d.damage_dice.replace(/\s/g, ''), DMG[d.damage_type?.index] || d.damage_type?.name || '']]
      : d.from?.options?.slice(0, 1).map(o => [o.damage_dice, DMG[o.damage_type?.index] || '']) || [],
  );
const action = a => {
  const out = { n: a.name, d: a.desc };
  if (Number.isInteger(a.attack_bonus)) out.atk = a.attack_bonus;
  const dmg = damage(a.damage);
  if (dmg.length) out.dmg = dmg;
  if (a.dc) {
    const half = a.dc.success_type === 'half' || /half as much damage/i.test(a.desc || '');
    out.dc = [ABIL[a.dc.dc_type?.name] || '', a.dc.dc_value, half ? 'half' : a.dc.success_type || 'none'];
  }
  return out;
};
const monsters = src.map(m => ({
  id: m.index,
  name: m.name,
  size: SIZE[m.size] || m.size,
  type: type(m.type) + (m.subtype ? ' (' + m.subtype + ')' : ''),
  align: m.alignment,
  ac: m.armor_class?.[0]?.value ?? 10,
  hp: m.hit_points,
  hd: m.hit_points_roll || m.hit_dice,
  speed: speed(m.speed),
  ab: [m.strength, m.dexterity, m.constitution, m.intelligence, m.wisdom, m.charisma],
  saves: prof(m.proficiencies, 'Saving Throw: '),
  skills: prof(m.proficiencies, 'Skill: '),
  vuln: (m.damage_vulnerabilities || []).join(', '),
  res: (m.damage_resistances || []).join(', '),
  imm: (m.damage_immunities || []).join(', '),
  cimm: (m.condition_immunities || []).map(c => c.name).join(', '),
  senses: Object.entries(m.senses || {})
    .map(([k, v]) => k.replace(/_/g, ' ') + ' ' + v)
    .join(', '),
  lang: m.languages || '—',
  cr: m.challenge_rating,
  xp: m.xp,
  traits: (m.special_abilities || []).map(a => [a.name, a.desc]),
  actions: (m.actions || []).map(action),
  legendary: (m.legendary_actions || []).map(action),
  reactions: (m.reactions || []).map(action),
}));
const out =
  '/* Monstruos del SRD 5.1 (CC-BY-4.0, Wizards of the Coast), datos de 5e-bits. Generado por tools/build-monsters.js. */\n' +
  '(function(r){r.MonsterData=' +
  JSON.stringify(monsters) +
  ';})(typeof window!=="undefined"?window:globalThis);\n';
fs.writeFileSync('monsters-data.js', out);
console.log(monsters.length + ' monstruos, ' + Math.round(out.length / 1024) + ' KB');
