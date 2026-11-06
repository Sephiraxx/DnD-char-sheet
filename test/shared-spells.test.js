const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./load');

const lists = {
  'distort-value': ['bard', 'sorcerer', 'warlock', 'wizard'],
  'jims-magic-missile': ['wizard'],
  'gift-of-gab': ['bard', 'wizard'],
  'jims-glowing-coin': ['wizard'],
  'fast-friends': ['bard', 'cleric', 'wizard'],
  'incite-greed': ['cleric', 'sorcerer', 'warlock', 'wizard'],
  'motivational-speech': ['bard', 'cleric'],
  'spray-of-cards': ['bard', 'sorcerer', 'warlock', 'wizard'],
  antagonize: ['bard', 'sorcerer', 'warlock', 'wizard'],
  'spirit-of-death': ['sorcerer', 'warlock', 'wizard'],
};

test('the ten supplied spell references are shared, complete, and keep their character IDs and class lists', () => {
  const g = load();
  assert.equal(g.SharedSpellData.length, 10);
  assert.equal(g.Catalog.spells.length, 526);
  assert.equal(g.OfficialContent.spellTexts.size, 524);
  for (const [id, classes] of Object.entries(lists)) {
    const matches = g.Catalog.spells.filter(s => s.id === id);
    assert.equal(matches.length, 1, id);
    const spell = matches[0],
      reference = g.OfficialContent.spellTexts.get(id);
    assert.ok(reference?.bundled && reference.text.length > 180, id);
    assert.equal(reference.rulesLanguage, 'es', id);
    assert.ok(reference.originalText.length > 180, id);
    assert.equal(spell.referenceOnly, false, id);
    assert.ok(!/Verificá el material|8 horas; 5, 24 horas|actúa en tu turno/.test(spell.text + spell.materialEs), id);
    for (const classId of ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard']) {
      const state = g.Rules.validate({ ...g.Rules.initial(), classId, classSubclass: '', level: 7 });
      assert.equal(g.Classes.member(spell, state), classes.includes(classId), id + ' / ' + classId);
      state.campaignSources = ['PHB'];
      assert.equal(g.Campaign.enabled(state, spell), false, id);
      state.campaignSources.push(spell.sourceKey);
      assert.equal(g.Campaign.enabled(state, spell), true, id);
    }
    const html = g.OfficialContent.spellHtml(id);
    assert.match(html, /Tiempo de lanzamiento:/);
    assert.match(html, /Texto original en inglés/);
    assert.ok(!/PDF p\.|texto en inglés<\/summary>/.test(html), 'no invented PDF page or wrong translation label');
  }
});

test('translated spell rules retain taxes, materials, conditions and the correct upcasting', () => {
  const g = load(),
    ref = id => g.OfficialContent.spellTexts.get(id);
  assert.equal(ref('distort-value').spellDetails.time, '1 minuto');
  assert.equal(ref('motivational-speech').spellDetails.time, '1 minuto');
  assert.match(ref('distort-value').higher, /1 pie.*por encima de 1/);
  const jim = ref('jims-magic-missile');
  assert.match(jim.text, /2d4[\s\S]*5d4[\s\S]*4d4[\s\S]*1 natural/);
  assert.match(jim.higher, /dardo adicional[\s\S]*impuesto.*1 po/);
  assert.match(jim.spellDetails.components, /1 moneda.*consume/);
  assert.match(ref('gift-of-gab').spellDetails.time, /reacción.*hablás con otra criatura/);
  assert.match(ref('gift-of-gab').text, /5 pies[\s\S]*6 segundos/);
  assert.match(ref('gift-of-gab').spellDetails.components, /2 monedas.*consumen/);
  assert.match(ref('jims-glowing-coin').text, /30 pies[\s\S]*desventaja[\s\S]*Percepción[\s\S]*iniciativa/);
  assert.match(ref('jims-glowing-coin').spellDetails.components, /Una moneda, más 2 monedas.*consumen/);
  assert.match(ref('fast-friends').text, /con ventaja.*combatiendo[\s\S]*muerte segura[\s\S]*sabe que fue hechizada/);
  assert.match(ref('fast-friends').higher, /criatura adicional.*por encima de 3/);
  assert.doesNotMatch(ref('fast-friends').higher, /horas/);
  assert.match(ref('incite-greed').spellDetails.components, /50 po.*no la consume/);
  assert.match(
    ref('incite-greed').text,
    /algo dañino[\s\S]*no puede hacer otra cosa[\s\S]*Al final de cada uno de sus turnos/,
  );
  assert.match(ref('motivational-speech').text, /hasta cinco[\s\S]*5 puntos[\s\S]*pierde/);
  assert.match(ref('motivational-speech').higher, /aumentan en 5/);
  assert.match(ref('spray-of-cards').text, /15 pies[\s\S]*2d10[\s\S]*cegado hasta el final de su siguiente turno/);
  assert.match(ref('spray-of-cards').higher, /1d10.*por encima de 2/);
  assert.match(
    ref('antagonize').text,
    /4d4[\s\S]*reacción no está disponible[\s\S]*desventaja[\s\S]*comienzo de tu próximo turno/,
  );
  assert.match(ref('antagonize').higher, /1d4.*por encima de 3/);
  assert.equal(
    g.Catalog.spells.find(s => s.id === 'motivational-speech').saveAbility.length,
    0,
    'buff is not a save against the caster DC',
  );
});

test('Spirit of Death includes the complete variable Reaper Spirit reference', () => {
  const g = load(),
    spirit = g.OfficialContent.spellTexts.get('spirit-of-death');
  assert.match(spirit.spellDetails.components, /400 po.*no lo consume/);
  assert.match(spirit.spellDetails.duration, /Concentración, hasta 1 hora/);
  assert.match(spirit.text, /turno inmediatamente después del tuyo[\s\S]*Esquivar/);
  assert.match(spirit.text, /11 \+ el nivel del conjuro[\s\S]*40 \+ 10.*por encima de 4/);
  assert.match(
    spirit.text,
    /FUE 16 \(\+3\).*DES 16 \(\+3\).*CON 16 \(\+3\).*INT 16 \(\+3\).*SAB 16 \(\+3\).*CAR 16 \(\+3\)/,
  );
  assert.match(spirit.text, /necrótico, veneno[\s\S]*hechizado, cansancio, asustado, paralizado, envenenado/);
  assert.match(spirit.text, /Percepción pasiva 13[\s\S]*competencia: igual al tuyo/);
  assert.match(spirit.text, /1d10.*por cada 5 pies[\s\S]*mitad del nivel del conjuro, redondeando hacia abajo/);
  assert.match(spirit.text, /con ventaja[\s\S]*1d8 \+ 3 \+ el nivel del conjuro/);
  assert.match(
    spirit.text,
    /Acechar criatura[\s\S]*mismo plano[\s\S]*10 pies[\s\S]*siguiente turno[\s\S]*vuelve a usar esta acción/,
  );
  assert.match(spirit.higher, /nivel 5 o superior/);
});

test('every app entry point and the offline cache load supplied spell references before integration', () => {
  const g = load();
  const before = g.OfficialContent.spellTexts.size;
  g.OfficialContent.apply();
  assert.equal(g.OfficialContent.spellTexts.size, before);
  for (const file of ['index.html', 'dm.html', 'board.html', 'compendium.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(html.indexOf('./shared-spell-data.js') > -1, file);
    assert.ok(html.indexOf('./shared-spell-data.js') < html.indexOf('./official-content.js'), file);
  }
  assert.ok(require('../tools/stamp-sw').files().includes('./shared-spell-data.js'));
  assert.match(g.OfficialContent.html({ book: '<book>', text: '<script>', originalText: '<img>' }), /&lt;script&gt;/);
  assert.doesNotMatch(
    g.OfficialContent.html({ book: '<book>', text: '<script>', originalText: '<img>' }),
    /<img>|<script>|<book>/,
  );
});
