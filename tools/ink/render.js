// Exporta una tira RGBA de dos segundos para el aviso público de iniciativa.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, '.tmp-test', 'encounter-atlases');
const cli = require.resolve('@shapeshift-labs/ink-studio/cli/ink-studio.js');
const specifications = require('./encounter-scenes');
function ink(...args) {
  execFileSync(process.execPath, [cli, ...args], { cwd: root, stdio: 'inherit' });
}
fs.mkdirSync(out, { recursive: true });
for (const spec of specifications()) {
  const scene = path.join(out, spec.id + '.json');
  const atlas = path.join(out, spec.id);
  fs.writeFileSync(scene, JSON.stringify(spec));
  ink('validate', scene);
  ink(
    'atlas',
    scene,
    '--directions',
    '1',
    '--cols',
    '24',
    '--w',
    '96',
    '--h',
    '96',
    '--from',
    '0',
    '--to',
    '2',
    '--fps',
    '12',
    '--colored',
    '--out',
    atlas,
  );
}
for (const { id } of specifications()) {
  fs.copyFileSync(path.join(out, id, 'color.png'), path.join(root, 'assets', id + '.png'));
}
