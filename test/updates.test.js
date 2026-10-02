const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

async function app({ controlled = true, waiting = false } = {}) {
  let now = 0;
  const events = {},
    registrationEvents = {},
    documentEvents = {},
    messages = [];
  const worker = { postMessage: x => messages.push(x), addEventListener: (k, fn) => (events['worker:' + k] = fn) };
  const bars = [];
  const registration = {
    waiting: waiting ? worker : null,
    installing: worker,
    updates: 0,
    addEventListener: (k, fn) => (registrationEvents[k] = fn),
    update() {
      this.updates++;
      return Promise.resolve();
    },
  };
  const g = {
    Date: { now: () => now },
    navigator: {
      serviceWorker: {
        controller: controlled ? {} : null,
        addEventListener: (k, fn) => (events[k] = fn),
        register: () => Promise.resolve(registration),
      },
    },
    location: { protocol: 'https:', reload: () => g.reloads++ },
    reloads: 0,
    document: {
      visibilityState: 'visible',
      getElementById: id => bars.find(b => b.id === id && !b.removed),
      createElement: () => ({
        setAttribute() {},
        addEventListener(k, fn) {
          this[k] = fn;
        },
        remove() {
          this.removed = true;
        },
      }),
      body: { append: b => bars.push(b) },
      addEventListener: (k, fn) => (documentEvents[k] = fn),
    },
  };
  vm.createContext(g);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../updates.js'), 'utf8'), g);
  await Promise.resolve();
  return {
    g,
    bars,
    events,
    registration,
    documentEvents,
    messages,
    install(seconds) {
      now = seconds * 1000;
      registrationEvents.updatefound();
      worker.state = 'installed';
      events['worker:statechange']();
    },
    click(kind) {
      bars.at(-1).click({ target: { closest: () => ({ dataset: { update: kind } }) } });
    },
  };
}

test('QA A-05: reopening with a waiting update activates it and reloads only once', async () => {
  const a = await app({ waiting: true });
  assert.deepEqual(a.messages, ['skip-waiting']);
  a.events.controllerchange();
  a.events.controllerchange();
  assert.equal(a.g.reloads, 1);
  assert.equal(a.bars.length, 0);
});
test('QA A-06/A-07: update during use offers a banner; Actualizar activates and removes it', async () => {
  const a = await app();
  a.install(11);
  assert.match(a.bars[0].innerHTML, /Hay una versión nueva.*Actualizar.*Después/);
  assert.equal(a.messages.length, 0);
  a.click('now');
  assert.deepEqual(a.messages, ['skip-waiting']);
  assert.equal(a.bars[0].removed, true);
  a.events.controllerchange();
  assert.equal(a.g.reloads, 1);
});
test('QA A-08: Después dismisses without activating; returning to the app checks updates', async () => {
  const a = await app();
  a.install(11);
  a.click('later');
  assert.equal(a.bars[0].removed, true);
  assert.equal(a.messages.length, 0);
  a.documentEvents.visibilitychange();
  assert.equal(a.registration.updates, 1);
});
test('first installation takes control without reloading an in-progress character', async () => {
  const a = await app({ controlled: false, waiting: true });
  a.events.controllerchange();
  assert.equal(a.g.reloads, 0);
  assert.equal(a.messages.length, 0);
});
