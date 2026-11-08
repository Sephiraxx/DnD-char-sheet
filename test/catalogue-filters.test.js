// Requisitos legibles en el catálogo, la subida de nivel y las opciones de clase.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load } = require('./load.js');

const c = load();
const T = c.TraitsEs;

test('los requisitos se leen en español, sin [object Object]', () => {
  assert.equal(
    T.prereqText([
      { level: { level: 14, class: { name: 'Artificer' } }, item: ['A suit of armor (requires attunement)'] },
    ]),
    'Artífice de nivel 14, objeto: una armadura (requiere sintonización)',
  );
  assert.equal(T.prereqText([{ pact: 'Tome' }]), 'Pacto del tomo');
  assert.equal(T.prereqText([{ spell: ['eldritch blast#c'] }]), 'conocer el truco descarga sobrenatural');
  assert.equal(T.prereqText([]), '');
  assert.equal(T.prereqText(null), '');
  const all = [...c.Catalog.feats, ...c.ClassData.options, ...c.CampaignData.races, ...c.CampaignData.backgrounds];
  for (const x of all.filter(x => x.prerequisite)) {
    const text = T.prereqText(x.prerequisite);
    assert.doesNotMatch(text, /object|undefined|[{[]/, x.name);
  }
});

test('el catálogo pagina, filtra y guarda la búsqueda en la dirección', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'compendium.js'), 'utf8');
  assert.doesNotMatch(src, /slice\(0, 80\)/);
  assert.match(src, /compendium-more/);
  for (const key of ['nivel', 'clase', 'vdmin', 'vdmax', 'tipo', 'rareza']) assert.match(src, new RegExp(`'${key}'`));
  assert.match(src, /history\.replaceState/);
  const html = fs.readFileSync(path.join(__dirname, '..', 'compendium.html'), 'utf8');
  assert.match(html, /id="compendium-extra"/);
  assert.match(html, /id="compendium-more"/);
});
