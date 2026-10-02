// Genera feat-data.js con lo mecánico de cada dote del catálogo: +1 a características, salvaciones,
// armaduras, resistencias, habilidades, pericias e idiomas. Solo metadatos de 5etools, nunca el texto de los libros.
// Uso: node tools/build-feats.js <ruta a feats.json de 5etools-src/data>
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = process.argv[2];
if (!src) throw Error('Indicá la ruta a feats.json.');
const ROOT = path.join(__dirname, '..');
const ctx = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'catalog.js'), 'utf8'), { window: ctx });
const feats = JSON.parse(fs.readFileSync(src, 'utf8')).feat;

const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const SKILL = {
  'sleight of hand': 'sleight',
  'animal handling': 'animal',
};
const skillId = s => SKILL[s] || s;
const out = {};
let missing = [];
for (const f of ctx.Catalog.feats) {
  const x = feats.find(e => e.name === f.name && e.source === f.sourceKey) || feats.find(e => e.name === f.name);
  if (!x) {
    missing.push(f.id);
    continue;
  }
  const e = {};
  // Característica: fija ({con:1}) o a elegir entre varias.
  const ab = (x.ability || [])[0];
  if (ab) {
    if (ab.choose) e.ability = { from: ab.choose.from.filter(a => ABIL.includes(a)), n: ab.choose.amount || 1 };
    else {
      const fixed = Object.fromEntries(Object.entries(ab).filter(([k, v]) => ABIL.includes(k) && Number.isInteger(v)));
      if (Object.keys(fixed).length) e.ability = { fixed };
    }
  }
  if ((x.savingThrowProficiencies || [])[0]?.choose) e.save = 'ability';
  const armor = (x.armorProficiencies || [])[0];
  if (armor) e.armor = ['light', 'medium', 'heavy', 'shield'].filter(k => armor[k]);
  for (const k of ['resist', 'immune', 'conditionImmune'])
    if (Array.isArray(x[k]) && x[k].every(v => typeof v === 'string')) e[k] = x[k];
  // Habilidades: lista cerrada para elegir, o «cualquier habilidad o herramienta» (Hábil).
  const sk = (x.skillProficiencies || [])[0];
  if (sk?.choose) e.skills = { from: sk.choose.from.map(skillId), n: sk.choose.count || 1 };
  else if (sk) {
    const fixed = Object.keys(sk)
      .filter(k => sk[k] === true)
      .map(skillId);
    if (fixed.length) e.skills = { fixed };
  }
  const st = (x.skillToolLanguageProficiencies || [])[0]?.choose?.[0];
  if (st && st.from.includes('anySkill')) e.skills = { any: true, n: st.count, tools: st.from.includes('anyTool') };
  if ((x.expertise || [])[0]?.anyProficientSkill) e.expertise = x.expertise[0].anyProficientSkill;
  const lang = (x.languageProficiencies || [])[0];
  if (lang?.any) e.languages = lang.any;
  if (Object.keys(e).length) out[f.id] = e;
}
const body =
  '/* Generado por tools/build-feats.js a partir de metadatos de 5etools: no editar a mano. */\n' +
  '(function (root) {\n  root.FeatData = ' +
  JSON.stringify(out) +
  ';\n})(typeof window !== "undefined" ? window : globalThis);\n';
fs.writeFileSync(path.join(ROOT, 'feat-data.js'), body);
console.log('dotes con datos:', Object.keys(out).length, 'sin coincidencia:', missing.join(', ') || 'ninguna');
