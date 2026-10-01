/* Ataques con armas (reglas 2014): bonos, daño, estilos de combate y tiradas desde la ficha. */
(function (root) {
  'use strict';
  const SIMPLE_ONLY = ['artificer', 'cleric', 'warlock'];
  const MARTIAL = ['barbarian', 'fighter', 'paladin', 'ranger'];
  const SPECIFIC = {
    bard: ['crossbow-hand', 'longsword', 'rapier', 'shortsword'],
    rogue: ['crossbow-hand', 'longsword', 'rapier', 'shortsword'],
    monk: ['shortsword'],
    druid: ['club', 'dagger', 'dart', 'javelin', 'mace', 'quarterstaff', 'scimitar', 'sickle', 'sling', 'spear'],
    sorcerer: ['dagger', 'dart', 'sling', 'quarterstaff', 'crossbow-light'],
    wizard: ['dagger', 'dart', 'sling', 'quarterstaff', 'crossbow-light'],
  };
  const RACE = {
    'Elf Weapon Training': ['longsword', 'shortsword', 'shortbow', 'longbow'],
    'Dwarven Combat Training': ['battleaxe', 'handaxe', 'light-hammer', 'warhammer'],
    'Drow Weapon Training': ['rapier', 'shortsword', 'crossbow-hand'],
  };
  const VERSATILE = {
    quarterstaff: '1d8',
    spear: '1d8',
    trident: '1d8',
    battleaxe: '1d10',
    longsword: '1d10',
    warhammer: '1d10',
  };
  const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const R = () => root.Rules,
    C = () => root.Classes;

  const classId = s => s.classId || 'bard';
  const subId = s => s.classSubclass || '';
  function styles(s) {
    return Object.values(s.classChoices || {}).flat();
  }
  function hasStyle(s, id) {
    return styles(s).includes(id + '-PHB');
  }
  function martialArtsDie(s) {
    if (classId(s) !== 'monk') return 0;
    return s.level >= 17 ? 10 : s.level >= 11 ? 8 : s.level >= 5 ? 6 : 4;
  }

  // Datos del arma: catálogo de equipo o, para objetos propios, las notas «1d8 cortante · propiedades».
  function weaponOf(item) {
    const base = item.equipmentId && root.EquipmentData?.items[item.equipmentId];
    const notes = base?.weapon ? base.notes : item.category === 'Armas' ? item.notes : '';
    const m = /^(\d+d\d+|\d+)\s+([a-záéíóúñ]+)/i.exec(notes || '');
    if (!m) return null;
    const parts = notes.split('\n')[0].split(' · ');
    const props = (parts[1] || '').split(', ').map(x => x.trim());
    const range = /(?:Alcance|Arrojadiza) (\d+\/\d+) pies/.exec(notes)?.[1] || '';
    return {
      id: base?.id || '',
      dice: m[1],
      type: m[2].toLowerCase(),
      martial: base ? base.weapon === 'martial' : props.includes('Marcial'),
      ranged: base ? base.range === 'ranged' : props.includes('Munición'),
      finesse: props.includes('Sutileza'),
      light: props.includes('Ligera'),
      heavy: props.includes('Pesada'),
      twoHanded: props.includes('A dos manos'),
      thrown: props.includes('Arrojadiza'),
      reach: props.includes('Alcance'),
      monk: props.includes('Arma de monje') || base?.id === 'shortsword',
      versatile: VERSATILE[base?.id] || (props.includes('Versátil') ? null : ''),
      range,
      props: props.filter(Boolean),
    };
  }

  function proficient(s, w) {
    const c = classId(s),
      sub = subId(s);
    if (MARTIAL.includes(c)) return true;
    if (!w.martial && (SIMPLE_ONLY.includes(c) || ['bard', 'rogue', 'monk'].includes(c))) return true;
    if (w.martial && /war-domain|tempest|twilight|hexblade|college-of-valor|battle-smith|armorer/.test(sub))
      return true;
    if (c === 'bard' && /college-of-swords/.test(sub) && w.id === 'scimitar') return true;
    if ((SPECIFIC[c] || []).includes(w.id)) return true;
    const traits = root.Campaign?.race(s)?.traits || [];
    return Object.entries(RACE).some(([t, ids]) => traits.includes(t) && ids.includes(w.id));
  }

  function settings(item) {
    const a = item.attack || {};
    return {
      ability: ABILITIES.includes(a.ability) ? a.ability : 'auto',
      proficient: a.proficient === true || a.proficient === false ? a.proficient : 'auto',
      magic: Number.isInteger(a.magic) ? a.magic : 0,
      extra: typeof a.extra === 'string' ? a.extra : '',
    };
  }

  // Bonos de una opción de ataque. `mode`: 'action' | 'bonus' (mano torpe) | 'reaction'.
  function profile(s, item, { twoHands = false, mode = 'action' } = {}) {
    const w = item.unarmed ? item.weapon : weaponOf(item);
    if (!w) return null;
    const st = R().stats(s),
      cfg = item.unarmed ? { ability: 'auto', proficient: true, magic: 0, extra: '' } : settings(item);
    const mods = st.mods,
      ma = martialArtsDie(s);
    let ability = cfg.ability;
    if (ability === 'auto') {
      if (w.ranged) ability = 'dex';
      else if (w.finesse || (ma && (w.monk || item.unarmed))) ability = mods.dex > mods.str ? 'dex' : 'str';
      else ability = 'str';
    }
    const prof = cfg.proficient === 'auto' ? item.unarmed || proficient(s, w) : cfg.proficient;
    let dice = twoHands && w.versatile ? w.versatile : w.dice;
    if (ma && (w.monk || item.unarmed)) {
      const cur = /^1d(\d+)$/.exec(dice);
      if (!cur || Number(cur[1]) < ma) dice = '1d' + ma;
    }
    const notes = [];
    let toHit = mods[ability] + (prof ? st.prof : 0) + cfg.magic;
    if (w.ranged && hasStyle(s, 'archery')) {
      toHit += 2;
      notes.push('Arquería +2');
    }
    let dmgMod = mods[ability] + cfg.magic;
    if (mode === 'bonus' && !hasStyle(s, 'two-weapon-fighting')) {
      dmgMod = Math.min(0, mods[ability]) + cfg.magic;
      notes.push('Mano torpe: sin modificador positivo al daño');
    }
    if (!w.ranged && !w.twoHanded && !twoHands && !item.unarmed && hasStyle(s, 'dueling')) {
      dmgMod += 2;
      notes.push('Duelo +2 al daño (sin otra arma en la otra mano)');
    }
    const gwf = !w.ranged && (w.twoHanded || (twoHands && w.versatile)) && hasStyle(s, 'great-weapon-fighting');
    if (gwf) notes.push('Gran arma: repetís 1 y 2 de los dados de daño');
    if (!prof) notes.push('Sin competencia: no suma bono de competencia');
    if (w.heavy && ['S'].includes(root.Campaign?.race(s)?.size?.[0]))
      notes.push('Arma pesada y criatura pequeña: desventaja');
    return {
      name: item.name,
      itemId: item.id,
      ability,
      proficient: prof,
      toHit,
      dice,
      dmgMod,
      type: w.type,
      extra: cfg.extra,
      gwf,
      weapon: w,
      notes,
    };
  }

  function attacksPerAction(s) {
    const c = classId(s),
      sc = C()?.sub?.(s)?.name || '';
    if (c === 'fighter') return s.level >= 20 ? 4 : s.level >= 11 ? 3 : s.level >= 5 ? 2 : 1;
    if (['barbarian', 'monk', 'paladin', 'ranger'].includes(c) && s.level >= 5) return 2;
    if (c === 'bard' && ['College of Swords', 'College of Valor'].includes(sc) && s.level >= 6) return 2;
    if (c === 'artificer' && ['Battle Smith', 'Armorer'].includes(sc) && s.level >= 5) return 2;
    if (c === 'warlock' && styles(s).some(x => /thirsting-blade/.test(x)) && s.level >= 5) return 2;
    return 1;
  }

  function unarmed(s) {
    const ma = martialArtsDie(s);
    return {
      id: 'unarmed',
      name: 'Golpe sin armas',
      unarmed: true,
      weapon: { id: 'unarmed', dice: ma ? '1d' + ma : '1', type: 'contundente', monk: true, props: [] },
    };
  }
  function options(s) {
    const items = s.inventory.filter(x => x.qty > 0 && weaponOf(x));
    return [...items, unarmed(s)];
  }

  // Tiradas
  function d(sides, rnd) {
    return rnd(sides);
  }
  function rollAttack(p, adv, rnd) {
    const a = d(20, rnd),
      b = adv ? d(20, rnd) : null;
    const kept = adv === 'adv' ? Math.max(a, b) : adv === 'dis' ? Math.min(a, b) : a;
    return { rolls: b === null ? [a] : [a, b], kept, total: kept + p.toHit, crit: kept === 20, fumble: kept === 1 };
  }
  function parseDice(expr) {
    const m = /^(\d+)d(\d+)$/.exec(expr);
    return m ? { n: Number(m[1]), sides: Number(m[2]) } : { n: 0, sides: 0, flat: Number(expr) || 0 };
  }
  function rollDamage(p, crit, rnd) {
    const parts = [];
    const roll = (expr, label, gwf) => {
      const x = parseDice(expr);
      if (!x.sides) return { label, rolls: [], sum: x.flat };
      const n = crit ? x.n * 2 : x.n,
        rolls = [];
      for (let i = 0; i < n; i++) {
        let r = d(x.sides, rnd);
        if (gwf && r <= 2) r = d(x.sides, rnd);
        rolls.push(r);
      }
      return { label, rolls, sum: rolls.reduce((a, b) => a + b, 0) };
    };
    parts.push(roll(p.dice, p.type, p.gwf));
    const extra = /^\+?\s*(\d+d\d+)\s*(.*)$/.exec(p.extra.trim());
    if (extra) parts.push(roll(extra[1], extra[2] || 'extra', false));
    const total = Math.max(
      p.weapon.id === 'unarmed' && !/d/.test(p.dice) ? 0 : 1,
      parts.reduce((a, b) => a + b.sum, 0) + p.dmgMod,
    );
    return { parts, total };
  }

  root.Attacks = {
    weaponOf,
    proficient,
    profile,
    attacksPerAction,
    options,
    settings,
    rollAttack,
    rollDamage,
    ABILITIES,
  };
  if (typeof module !== 'undefined') module.exports = root.Attacks;
})(typeof window !== 'undefined' ? window : globalThis);
