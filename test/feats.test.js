const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');

const g = load();
const wizard = () => g.Rules.validate(fixture('wizard-3.json'));
// Gana la dote como en la subida de nivel: queda en learnedFeats y aplica lo permanente.
function gain(s, id, picks) {
  s.progression.learnedFeats.push(id);
  g.FeatFX.onGain(s, id, picks);
  return g.Rules.validate(s);
}

test('Robusto suma 2 PG por nivel y Alerta +5 a la iniciativa', () => {
  const s = wizard(),
    before = g.Rules.stats(s);
  gain(s, 'tough');
  gain(s, 'alert');
  const after = g.Rules.stats(s);
  assert.equal(after.maxHP, before.maxHP + 2 * g.Rules.totalLevel(s));
  assert.equal(after.initiative, before.initiative + 5);
});

test('Móvil suma velocidad y Observador suma a la percepción pasiva', () => {
  const s = wizard(),
    speed = g.Rules.stats(s).speed;
  gain(s, 'mobile');
  gain(s, 'observant', { ability: 'wis' });
  assert.equal(g.Rules.stats(s).speed, speed + 10);
  assert.equal(g.FeatFX.passive(s, 'perception'), 5);
  assert.equal(g.FeatFX.passive(s, 'stealth'), 0);
});

test('Resiliente sube la característica elegida y da competencia en su salvación', () => {
  const s = wizard(),
    cha = s.abilities.cha,
    save = g.Rules.saveBonus(s, 'cha');
  gain(s, 'resilient', { ability: 'cha' });
  assert.equal(s.abilities.cha, cha + 1);
  assert.equal(g.Rules.saveBonus(s, 'cha'), save + (cha % 2 ? 1 : 0) + g.Rules.stats(s).prof);
  assert.throws(() => g.FeatFX.checkPicks('resilient', s, {}), /característica/);
});

test('Duro de pelar suma CON sola; Fuerza nunca pasa de 20', () => {
  const s = wizard(),
    con = s.abilities.con;
  gain(s, 'durable');
  assert.equal(s.abilities.con, con + 1);
  const t = wizard();
  t.abilities.str = 20;
  gain(t, 'heavily-armored');
  assert.equal(t.abilities.str, 20);
  assert.ok(g.Equipment.proficient(t, 'heavy'));
});

test('Afortunado agrega un recurso que se gasta y vuelve con descanso largo', () => {
  const s = gain(wizard(), 'lucky'),
    luck = g.Classes.resources(s).find(r => r.id === 'feat-lucky');
  assert.equal(luck.max, 3);
  g.Classes.spend(s, 'feat-lucky', 2);
  assert.equal(g.Classes.spent(s, luck), 2);
  g.Classes.reset(s, 'short');
  assert.equal(g.Classes.spent(s, luck), 2);
  g.Classes.reset(s, 'long');
  assert.equal(g.Classes.spent(s, luck), 0);
});

test('Constitución infernal da resistencias que usa el daño tipado', () => {
  const s = gain(wizard(), 'infernal-constitution');
  assert.ok(g.Defenses.of(s).resist.has('cold'));
  assert.equal(g.Defenses.apply(s, [{ amount: 10, type: 'poison' }]).total, 5);
});

test('Experto en habilidades: competencia nueva y pericia en una con competencia', () => {
  const s = wizard(),
    free = g.Rules.skills.map(x => x[0]).find(k => !s.proficiencies.includes(k));
  gain(s, 'skill-expert', { ability: 'int', skills: [free], expertise: [free] });
  assert.ok(s.proficiencies.includes(free));
  assert.ok(s.expertise.includes(free));
  assert.equal(JSON.stringify(s.progression.featChoices['skill-expert'].skills), JSON.stringify([free]));
  assert.throws(() => g.FeatFX.checkPicks('skill-expert', wizard(), { ability: 'int', skills: [] }), /habilidad/);
});

test('las elecciones de dotes corruptas no pasan la validación', () => {
  const s = wizard();
  s.progression.featChoices = { resilient: { ability: 'luck' } };
  assert.throws(() => g.Rules.validate(s));
  s.progression.featChoices = [];
  assert.throws(() => g.Rules.validate(s));
});

test('el resumen separa lo automático de lo manual', () => {
  const s = gain(wizard(), 'war-caster'),
    [r] = g.FeatFX.report(s);
  assert.ok(r.auto.some(x => /concentración/.test(x)));
  assert.ok(r.manual.length > 0);
});
