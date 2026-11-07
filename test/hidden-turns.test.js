const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path');
const { load } = require('./load');
function context() {
  const g = load();
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../party-view.js'), 'utf8'), g);
  return g;
}
test('turn messages conceal hidden and unknown actors, including older unredacted events', () => {
  const g = context(),
    event = { kind: 'turn', payload: { round: 2, combatantId: 'secret', name: 'Revenant secreto' } },
    party = { characters: [], members: [], combatants: [] };
  assert.doesNotMatch(g.PartyView.eventText(event, party), /Revenant/);
  assert.match(g.PartyView.eventText(event, party), /turno oculto/);
  party.combatants = [{ id: 'secret', name: 'Revenant secreto', hidden: true }];
  assert.doesNotMatch(g.PartyView.eventText(event, party), /Revenant/);
  party.viewerIsDM = true;
  assert.match(
    g.PartyView.eventText({ ...event, payload: { ...event.payload, hidden: true, name: 'Turno oculto' } }, party),
    /Revenant/,
  );
  party.viewerIsDM = false;
  party.combatants[0].hidden = false;
  assert.match(g.PartyView.eventText(event, party), /Revenant/);
});
test('map-hidden and initiative-hidden turns never reveal an actor in the player banner or selected card', () => {
  const g = context(),
    turn = { hidden: true, innerHTML: '' },
    card = { hidden: false, innerHTML: 'antes' },
    elements = { '#board-turn': turn, '#board-card': card };
  g.window = g;
  g.BoardCore = require('../board-core');
  g.matchMedia = () => ({ matches: false });
  g.URLSearchParams = URLSearchParams;
  g.location.search = '';
  g.location.hash = '';
  g.document = {
    body: { classList: { contains: () => false } },
    querySelector: s => elements[s],
    addEventListener() {},
  };
  g.addEventListener = () => {};
  const source = fs
    .readFileSync(path.join(__dirname, '../board.js'), 'utf8')
    .replace('    _state: () => S,', '    testTurn:turn, testCard:card, _state: () => S,');
  vm.runInContext(source, g);
  const s = g.Board._state();
  Object.assign(s, {
    isDM: false,
    mapId: 'map',
    sel: 'token',
    party: {
      characters: [],
      encounter: { active: true, round: 1, current_id: 'secret' },
      combatants: [{ id: 'secret', name: 'Bruja secreta', hidden: false }],
    },
    tokens: [{ id: 'token', map_id: 'map', combatant_id: 'secret', name: 'Bruja secreta', hidden: true }],
  });
  g.Board.testTurn();
  g.Board.testCard();
  assert.equal(turn.hidden, true);
  assert.equal(turn.innerHTML, '');
  assert.equal(card.hidden, true);
  s.isDM = true;
  g.Board.testTurn();
  assert.equal(turn.hidden, false);
  assert.match(turn.innerHTML, /Bruja secreta/);
  s.asPlayer = true;
  g.Board.testTurn();
  assert.equal(turn.hidden, true);
  assert.equal(turn.innerHTML, '');
  s.tokens[0].hidden = false;
  g.Board.testTurn();
  assert.equal(turn.hidden, false);
  assert.match(turn.innerHTML, /Bruja secreta/);
  s.party.combatants[0].hidden = true;
  g.Board.testTurn();
  assert.equal(turn.hidden, true);
  assert.equal(turn.innerHTML, '');
});
