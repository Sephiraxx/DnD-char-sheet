// Escribe los datos oficiales en dos archivos: el texto de reglas, conjuros y objetos
// (official-content-data.js, que cargan todas las pantallas) y los bloques de criaturas
// (official-monsters-data.js, que se cargan al abrir el bestiario).
const fs = require('fs');
const path = require('path');

const FOOT = ';})(typeof window!=="undefined"?window:globalThis);\n';
function write(root, data, comment) {
  const { monsters, completeMonsterReplacement, ...rest } = data;
  fs.writeFileSync(
    path.join(root, 'official-content-data.js'),
    `/* ${comment} Creature blocks live in official-monsters-data.js. */\n(function(r){r.OfficialContentData=` +
      JSON.stringify(rest) +
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
module.exports = { write, files: ['official-content-data.js', 'official-monsters-data.js'] };
