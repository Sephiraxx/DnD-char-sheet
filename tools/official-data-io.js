// Escribe los datos oficiales en tres archivos: libros, objetos y datos de conjuros
// (official-content-data.js, que cargan todas las pantallas), los textos largos de reglas y conjuros
// (official-text-data.js, que la ficha pide después de mostrarse) y los bloques de criaturas
// (official-monsters-data.js, que se cargan al abrir el bestiario).
const fs = require('fs');
const path = require('path');

const FOOT = ';})(typeof window!=="undefined"?window:globalThis);\n';
// Campos largos de cada conjuro que la ficha no necesita para arrancar.
const SPELL_TEXT = ['text', 'higher', 'originalText', 'originalHigher'];
function write(root, data, comment) {
  const { monsters, completeMonsterReplacement, rules, spells, ...rest } = data;
  // Núcleo: libros, objetos y los datos de cada conjuro sin su texto (textLen conserva el criterio de elección).
  const core = (spells || []).map(row => {
    const out = {};
    for (const [k, v] of Object.entries(row)) if (!SPELL_TEXT.includes(k) && k !== 'textLen') out[k] = v;
    out.textLen = (row.text || '').length;
    return out;
  });
  const spellTexts = (spells || []).map(row => {
    const out = {};
    for (const k of SPELL_TEXT) if (row[k] !== undefined) out[k] = row[k];
    return out;
  });
  fs.writeFileSync(
    path.join(root, 'official-content-data.js'),
    `/* ${comment} Creature blocks live in official-monsters-data.js; rule and spell texts in official-text-data.js. */\n(function(r){r.OfficialContentData=` +
      JSON.stringify({ ...rest, spells: core }) +
      FOOT,
  );
  fs.writeFileSync(
    path.join(root, 'official-text-data.js'),
    '/* Official 2014 rule and spell texts, split from official-content-data.js so sheets start without them. */\n' +
      '(function(r){var t=' +
      JSON.stringify({ rules: rules || [], spellTexts }) +
      ';r.OfficialTextData=t;var d=r.OfficialContentData;if(d){d.rules=t.rules;' +
      'for(var i=0;i<t.spellTexts.length;i++)if(d.spells[i])Object.assign(d.spells[i],t.spellTexts[i]);}' +
      'if(r.OfficialContent&&r.OfficialContent.applyLongTexts)r.OfficialContent.applyLongTexts()' +
      FOOT,
  );
  fs.writeFileSync(
    path.join(root, 'official-monsters-data.js'),
    '/* Official 2014 creature blocks, split from official-content-data.js so sheets load without them. */\n' +
      '(function(r){var m=' +
      JSON.stringify({ completeMonsterReplacement: !!completeMonsterReplacement, monsters: monsters || [] }) +
      ';r.OfficialMonsterData=m;var d=r.OfficialContentData;if(d){d.monsters=m.monsters;d.completeMonsterReplacement=m.completeMonsterReplacement;}' +
      'if(r.OfficialContent&&r.OfficialContent.applyMonsters)r.OfficialContent.applyMonsters()' +
      FOOT,
  );
}
module.exports = { write, files: ['official-content-data.js', 'official-text-data.js', 'official-monsters-data.js'] };
