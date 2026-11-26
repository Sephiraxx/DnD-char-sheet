const { createRequire } = require('node:module');
const requireInk = createRequire(require.resolve('./tools/ink/package.json'));
const specifications = require('./tools/ink/encounter-scenes');

module.exports = {
  out: '.tmp-test/ink-renders',
  snaps: '.tmp-test/ink-snaps',
  load() {
    const kit = requireInk('@shapeshift-labs/ink-studio').load();
    return { ...kit, SCENES: specifications().map(spec => kit.KIT.diorama.scene(spec)) };
  },
};
