/* Random encounter tables: original dice probabilities, explicit DM creature choices. */
(function (root) {
  'use strict';
  const die = sides => {
    const a = new Uint32Array(1),
      limit = Math.floor(4294967296 / sides) * sides;
    let value;
    do value = root.crypto.getRandomValues(a)[0];
    while (value >= limit);
    return (value % sides) + 1;
  };
  function terms(expression) {
    const text = String(expression).toLowerCase().replace(/\s/g, '');
    const tokens = text.match(/[+-]?(?:\d*d\d+|\d+)/g) || [];
    if (!tokens.length || tokens.join('') !== text || tokens.length > 10) throw Error('Expresión de dados no válida.');
    return tokens.map(token => {
      const sign = token[0] === '-' ? -1 : 1,
        value = token.replace(/^[+-]/, ''),
        match = /^(\d*)d(\d+)$/.exec(value);
      if (!match) {
        const n = Number(value);
        if (!Number.isSafeInteger(n) || n > 10000) throw Error('Modificador fuera de rango.');
        return { sign, constant: n };
      }
      const n = Number(match[1] || 1),
        sides = Number(match[2]);
      if (!Number.isInteger(n) || n < 1 || n > 100 || !Number.isInteger(sides) || sides < 2 || sides > 1000)
        throw Error('Dados fuera de rango.');
      return { sign, n, sides };
    });
  }
  function bounds(expression) {
    return terms(expression).reduce(
      (r, t) => ({
        min: r.min + (t.constant !== undefined ? t.sign * t.constant : t.sign * (t.sign > 0 ? t.n : t.n * t.sides)),
        max: r.max + (t.constant !== undefined ? t.sign * t.constant : t.sign * (t.sign > 0 ? t.n * t.sides : t.n)),
      }),
      { min: 0, max: 0 },
    );
  }
  function rollDice(expression, random = die) {
    const rolls = [];
    const total = terms(expression).reduce((sum, t) => {
      if (t.constant !== undefined) return sum + t.sign * t.constant;
      for (let i = 0; i < t.n; i++) {
        const value = random(t.sides);
        if (!Number.isInteger(value) || value < 1 || value > t.sides) throw Error('Resultado de dado fuera de rango.');
        rolls.push(value);
        sum += t.sign * value;
      }
      return sum;
    }, 0);
    return { expression, rolls, total };
  }
  function normalizeRoll(table, value) {
    if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') throw Error('Ingresá una tirada.');
    const n = Number(value),
      b = bounds(table.dice);
    const total = n === 0 && table.dice.toLowerCase() === 'd100' ? 100 : n;
    if (value === '' || !Number.isInteger(total) || total < b.min || total > b.max)
      throw Error(
        `La tirada debe estar entre ${b.min} y ${b.max}${table.dice === 'd100' ? ' (00 equivale a 100)' : ''}.`,
      );
    return total;
  }
  function lookup(table, value) {
    const total = normalizeRoll(table, value),
      index = table.rows.findIndex(r => r.min <= total && total <= r.max);
    if (index < 0) throw Error('La tabla no tiene un resultado para esa tirada.');
    return { total, index, row: table.rows[index] };
  }
  const numbers = {
    a: 1,
    an: 1,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  function suggestedCount(prefix) {
    const m = /(?:^|[^\w])([0-9]+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s*$/i.exec(prefix);
    return m ? numbers[m[1].toLowerCase()] || Number(m[1]) || null : null;
  }
  function generate(table, options = {}) {
    const random = options.random || die;
    let tableRoll = null,
      picked;
    if (options.index !== undefined) {
      const index = options.index;
      if (!Number.isInteger(index) || !table.rows[index]) throw Error('Resultado de tabla no válido.');
      picked = { index, row: table.rows[index], total: null };
    } else {
      if (options.roll === undefined) tableRoll = rollDice(table.dice, random);
      picked = lookup(table, options.roll === undefined ? tableRoll.total : options.roll);
    }
    let text = '';
    const dice = [],
      candidates = new Map();
    for (const part of picked.row.parts) {
      if (part.type === 'text') text += part.text;
      else if (part.type === 'dice') {
        const rolled = rollDice(part.expression, random);
        dice.push(rolled);
        text += rolled.total;
      } else if (part.type === 'creature') {
        const count = suggestedCount(text),
          previous = candidates.get(part.key);
        if (previous)
          previous.suggested = previous.suggested !== null && count !== null ? previous.suggested + count : null;
        else candidates.set(part.key, { ...part, suggested: count });
        text += part.display;
      }
    }
    const attitude = picked.row.attitude ? rollDice(picked.row.attitude, random) : null;
    return {
      tableId: table.id,
      index: picked.index,
      total: picked.total,
      tableRoll,
      text,
      dice,
      attitude,
      candidates: [...candidates.values()],
    };
  }
  function selection(candidates, choices, byId) {
    const groups = new Map();
    for (const choice of choices) {
      const c = candidates[choice.index],
        n = Number(choice.count);
      if (!c?.monsterId || !Number.isInteger(n) || n < 1 || n > 20)
        throw Error('Elegí entre 1 y 20 criaturas por grupo con un bloque disponible.');
      const monster = byId(c.monsterId);
      if (!monster || monster.unrated || monster.summon || !(monster.hp > 0))
        throw Error('Esa criatura necesita un bloque de combate válido.');
      groups.set(monster.id, { monster, count: (groups.get(monster.id)?.count || 0) + n });
    }
    const rows = [...groups.values()];
    if (rows.reduce((n, r) => n + r.count, 0) > 100)
      throw Error('Prepará hasta 100 criaturas a la vez; los grupos más grandes pueden quedar en las notas.');
    return rows;
  }
  root.EncounterGenerator = { bounds, rollDice, lookup, generate, selection };
})(typeof window !== 'undefined' ? window : globalThis);
