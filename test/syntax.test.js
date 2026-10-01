const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Todos los scripts del navegador tienen que compilar: un error de sintaxis deja una pantalla entera sin funcionar.
const root = path.join(__dirname, '..');
for (const file of fs.readdirSync(root).filter(f => f.endsWith('.js'))) {
  test('sintaxis válida: ' + file, () => {
    assert.doesNotThrow(() => new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file }));
  });
}
