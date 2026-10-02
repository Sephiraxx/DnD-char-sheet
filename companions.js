/* Compañeros con estadísticas: familiares, invocaciones, monturas, mascotas y la Forma salvaje del druida.
   Cada uno guarda PG, CA, velocidad y ataques (copiados del bestiario o anotados a mano).
   Con Forma salvaje activa, el daño baja primero los PG de la bestia y el exceso pasa al personaje. */
(function (root) {
  'use strict';
  const KINDS = {
    familiar: 'Familiar',
    summon: 'Invocación',
    mount: 'Montura',
    pet: 'Mascota',
    ally: 'Aliado',
  };
  const uid = () => 'cmp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const speedEs = t =>
    String(t || '')
      .replace(/(\d+)\s*ft\./g, '$1 pies')
      .replace(/\bfly\b/g, 'vuelo')
      .replace(/\bswim\b/g, 'nado')
      .replace(/\bclimb\b/g, 'trepar')
      .replace(/\bburrow\b/g, 'excavar')
      .replace(/\(hover\)/g, '(flotar)');
  // Ataques de un bloque de estadísticas: los que tienen bono de ataque y dados de daño.
  function attacksOf(m) {
    return (m.actions || [])
      .filter(a => Number.isInteger(a.atk) && a.dmg?.length)
      .slice(0, 6)
      .map(a => ({
        name: String(a.n).slice(0, 60),
        bonus: a.atk,
        damage: a.dmg
          .map(([dice, type]) => `${dice} ${type}`)
          .join(' + ')
          .slice(0, 60),
      }));
  }
  // Datos que se copian de un monstruo del bestiario.
  function fromMonster(m, kind = 'familiar') {
    return {
      id: uid(),
      kind,
      name: m.name,
      monsterId: m.id,
      ac: m.ac,
      maxHp: m.hp,
      hp: m.hp,
      speed: speedEs(m.speed).slice(0, 100),
      attacks: attacksOf(m),
      notes: '',
    };
  }

  // ---------- Forma salvaje ----------
  const isDruid = s => (root.Classes?.views(s) || [s]).some(v => v.classId === 'druid' && v.level >= 2);
  const druidLevel = s => (root.Classes?.views(s) || [s]).find(v => v.classId === 'druid')?.level || 0;
  const moon = s =>
    (root.Classes?.views(s) || [s]).some(v => v.classId === 'druid' && v.classSubclass === 'druid-circle-of-the-moon');
  // Límites del PHB: VD y movimiento por nivel de druida (Círculo de la Luna: VD 1 desde nivel 2 y nivel/3 desde 6).
  function limits(s) {
    const l = druidLevel(s);
    let cr = l >= 8 ? 1 : l >= 4 ? 0.5 : 0.25;
    if (moon(s)) cr = l >= 6 ? Math.floor(l / 3) : 1;
    return { cr, fly: l >= 8, swim: l >= 4, level: l };
  }
  function canBecome(s, m) {
    const lim = limits(s),
      sp = String(m.speed || '');
    if (m.type !== 'bestia') return 'Solo bestias.';
    if (m.cr > lim.cr) return `VD máximo ${lim.cr < 1 ? (lim.cr === 0.25 ? '1/4' : '1/2') : lim.cr} a tu nivel.`;
    if (/fly|vuelo/.test(sp) && !lim.fly) return 'Sin velocidad de vuelo hasta nivel 8.';
    if (/swim|nado/.test(sp) && !lim.swim) return 'Sin velocidad de nado hasta nivel 4.';
    return '';
  }
  // Bonos de habilidad y salvación del bloque de la bestia («Percepción +3, Sigilo +4», «DES +5»), en español o inglés.
  const SKILL_ALIASES = { arcanos: 'arcana', 'sleight of hand': 'sleight', 'animal handling': 'animal' };
  const SAVE_KEYS = {
    FUE: 'str',
    STR: 'str',
    DES: 'dex',
    DEX: 'dex',
    CON: 'con',
    INT: 'int',
    SAB: 'wis',
    WIS: 'wis',
    CAR: 'cha',
    CHA: 'cha',
  };
  function bonusList(text, kind) {
    const out = {};
    for (const part of String(text || '').split(',')) {
      const m = /^\s*(.+?)\s*([+-]\d+)\s*$/.exec(part);
      if (!m) continue;
      const name = m[1].trim(),
        n = Number(m[2]);
      if (kind === 'save') {
        const k = SAVE_KEYS[name.toUpperCase()];
        if (k) out[k] = n;
        continue;
      }
      const low = name.toLowerCase(),
        row = (root.Rules?.skills || []).find(
          r => r[1].toLowerCase() === low || r[0] === low || r[0] === SKILL_ALIASES[low],
        );
      const id =
        row?.[0] || SKILL_ALIASES[low] || (root.Rules?.skills || []).find(r => r[0] === low.split(' ')[0])?.[0];
      if (id) out[id] = n;
    }
    return out;
  }
  function startWildShape(s, m) {
    const why = canBecome(s, m);
    if (why) throw Error(why);
    s.wildShape = {
      name: m.name,
      monsterId: m.id,
      ac: m.ac,
      maxHp: m.hp,
      hp: m.hp,
      speed: speedEs(m.speed).slice(0, 100),
      attacks: attacksOf(m),
      ab: Array.isArray(m.ab) ? m.ab.slice(0, 6) : undefined,
      // Competencias de la bestia: se usa su bono si es mayor que el tuyo (reglas de 2014).
      skills: bonusList(m.skills, 'skill'),
      saves: bonusList(m.saves, 'save'),
    };
    return s;
  }
  function endWildShape(s) {
    delete s.wildShape;
    return s;
  }
  function transform(s, m, action = 'action') {
    if (!isDruid(s)) throw Error('Forma salvaje requiere druida de nivel 2.');
    if (!['action', 'bonus'].includes(action) || (action === 'bonus' && !moon(s)))
      throw Error('Esta transformación requiere una acción.');
    const reason = canBecome(s, m);
    if (reason) throw Error(reason);
    const res = root.Classes.resources(s).find(r => r.id === 'wild-shape');
    if (!res || root.Classes.spent(s, res) === null) throw Error('Confirmá tus usos de Forma salvaje.');
    const blocked = root.Combat.blocked(s, action);
    if (blocked) throw Error(blocked);
    if (res.max !== 999) root.Classes.spend(s, res.id, 1);
    root.Combat.use(s, action, 'Forma salvaje');
    return startWildShape(s, m);
  }
  // La curación se aplica a la reserva activa, incluida la de la bestia.
  function heal(s, amount) {
    if (s.wildShape) {
      const ws = s.wildShape;
      const restored = Math.min(amount, ws.maxHp - ws.hp);
      ws.hp += restored;
      return restored;
    }
    const before = s.hp ?? 0;
    s.hp = Math.min(root.Rules.stats(s).maxHP, before + amount);
    if (s.hp > 0) {
      s.death = { success: 0, failure: 0 };
      s.conditions = s.conditions.filter(c => c !== 'Inconsciente');
    }
    return s.hp - before;
  }
  function vitals(s, stats = root.Rules.stats(s)) {
    const ws = s.wildShape;
    return ws
      ? { hp: ws.hp, maxHP: ws.maxHp, ac: ws.ac, speed: Number.parseInt(ws.speed, 10) || 0 }
      : { hp: s.hp, maxHP: stats.maxHP, ac: stats.ac, speed: stats.speed };
  }
  // Daño que llega al personaje: primero PG temporales, después la bestia y el exceso al personaje.
  // Devuelve { toCharacter, beast, reverted }.
  function absorb(s, amount) {
    const temp = Math.min(s.temp || 0, amount);
    s.temp = (s.temp || 0) - temp;
    let left = amount - temp,
      beast = 0,
      reverted = false;
    const ws = s.wildShape;
    if (ws && left > 0) {
      beast = Math.min(ws.hp, left);
      ws.hp -= beast;
      left -= beast;
      if (ws.hp <= 0) {
        reverted = true;
        delete s.wildShape;
      }
    }
    return { toCharacter: left, beast, reverted, temp };
  }

  function validate(s) {
    const bad = () => {
      throw Error('Los datos de compañeros no son válidos.');
    };
    const int = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
    const txt = (v, n) => typeof v === 'string' && v.length <= n;
    const block = (c, full) => {
      if (
        !c ||
        typeof c !== 'object' ||
        !txt(c.name, 100) ||
        !int(c.ac, 0, 40) ||
        !int(c.maxHp, 1, 9999) ||
        !int(c.hp, 0, c.maxHp)
      )
        bad();
      if (c.speed !== undefined && !txt(c.speed, 100)) bad();
      if (c.monsterId !== undefined && !txt(c.monsterId, 100)) bad();
      if (
        !Array.isArray(c.attacks) ||
        c.attacks.length > 6 ||
        c.attacks.some(a => !a || !txt(a.name, 60) || !int(a.bonus, -10, 30) || !txt(a.damage, 60))
      )
        bad();
      if (full && (!txt(c.id, 100) || !Object.hasOwn(KINDS, c.kind) || !txt(c.notes || '', 2000))) bad();
      if (c.ab !== undefined && (!Array.isArray(c.ab) || c.ab.length !== 6 || c.ab.some(v => !int(v, 1, 30)))) bad();
      for (const k of ['skills', 'saves'])
        if (
          c[k] !== undefined &&
          (!c[k] ||
            typeof c[k] !== 'object' ||
            Object.entries(c[k]).some(([id, n]) => !txt(id, 20) || !int(n, -10, 30)))
        )
          bad();
    };
    if (s.companions !== undefined) {
      if (!Array.isArray(s.companions) || s.companions.length > 12) bad();
      s.companions.forEach(c => block(c, true));
      if (new Set(s.companions.map(c => c.id)).size !== s.companions.length) bad();
    }
    if (s.wildShape !== undefined) block(s.wildShape, false);
  }

  root.Companions = {
    KINDS,
    uid,
    speedEs,
    attacksOf,
    fromMonster,
    isDruid,
    limits,
    canBecome,
    startWildShape,
    transform,
    endWildShape,
    bonusList,
    heal,
    vitals,
    absorb,
    validate,
  };
})(typeof window !== 'undefined' ? window : globalThis);
