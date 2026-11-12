// Escribe los datos oficiales en tres archivos: libros, objetos y datos de conjuros
// (official-content-data.js, que cargan todas las pantallas), los textos largos de reglas y conjuros
// (official-text-data.js, que la ficha pide después de mostrarse) y los bloques de criaturas
// (official-monsters-data.js, que se cargan al abrir el bestiario).
const fs = require('fs');
const path = require('path');

const FOOT = ';})(typeof window!=="undefined"?window:globalThis);\n';
// Campos largos de cada conjuro que la ficha no necesita para arrancar.
const SPELL_TEXT = ['text', 'higher', 'originalText', 'originalHigher'];
// Texto largo de cada objeto mágico. Lo que la ficha deduce de él al arrancar (resumen, cargas, bonos)
// se calcula acá, con el mismo código de la app, y viaja en `pre`.
const ITEM_TEXT = ['text', 'originalText'];
function magicItems(root) {
  const vm = require('vm'),
    ctx = { console };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'magic-items.js'), 'utf8') + ';globalThis.__M = MagicItems;', ctx);
  return ctx.__M;
}
// Igual que official-content.js cuando el texto está presente.
function precompute(M, row) {
  const text = row.text || '',
    name = String(row.name || '').trim(),
    count = /(?:tiene|has|contiene|dispone de)\s+(\d{1,2})\s+(?:cargas|charges)\b/i.exec(text),
    charges = count && Number(count[1]) > 0 ? { max: Number(count[1]), regain: '0' } : null,
    it = { name, ...(charges ? { charges } : {}) };
  return {
    note: (M.ownText ? M.ownText(text) : text).slice(0, 480),
    charges,
    derived: JSON.parse(JSON.stringify(M.derive ? M.derive(it, row) : {})),
  };
}
function write(root, data, comment) {
  const { monsters, completeMonsterReplacement, rules, spells, items, ...rest } = data;
  const M = magicItems(root);
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
  const coreItems = (items || []).map(row => {
    const out = {};
    for (const [k, v] of Object.entries(row)) if (!ITEM_TEXT.includes(k) && k !== 'textLen' && k !== 'pre') out[k] = v;
    out.textLen = (row.text || '').length;
    out.pre = precompute(M, row);
    return out;
  });
  const itemTexts = (items || []).map(row => {
    const out = {};
    for (const k of ITEM_TEXT) if (row[k] !== undefined) out[k] = row[k];
    return out;
  });
  fs.writeFileSync(
    path.join(root, 'official-content-data.js'),
    `/* ${comment} Creature blocks live in official-monsters-data.js; rule, spell and item texts in official-text-data.js. */\n(function(r){r.OfficialContentData=` +
      JSON.stringify({ ...rest, spells: core, items: coreItems }) +
      FOOT,
  );
  fs.writeFileSync(
    path.join(root, 'official-text-data.js'),
    '/* Official 2014 rule, spell and item texts, split from official-content-data.js so sheets start without them. */\n' +
      '(function(r){var t=' +
      JSON.stringify({ rules: rules || [], spellTexts, itemTexts }) +
      ';r.OfficialTextData=t;var d=r.OfficialContentData;if(d){d.rules=t.rules;' +
      'for(var i=0;i<t.spellTexts.length;i++)if(d.spells[i])Object.assign(d.spells[i],t.spellTexts[i]);' +
      'for(var j=0;j<t.itemTexts.length;j++)if(d.items[j])Object.assign(d.items[j],t.itemTexts[j]);}' +
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
