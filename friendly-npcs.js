/* Fichas rápidas de PNJ aliados. Usan las mismas reglas y recursos que los PJ. */
(function (root) {
  'use strict';

  const priorities = {
    artificer: ['int', 'con', 'dex'],
    barbarian: ['str', 'con', 'dex'],
    bard: ['cha', 'dex', 'con'],
    cleric: ['wis', 'con', 'str'],
    druid: ['wis', 'con', 'dex'],
    fighter: ['str', 'con', 'dex'],
    monk: ['dex', 'wis', 'con'],
    paladin: ['str', 'cha', 'con'],
    ranger: ['dex', 'wis', 'con'],
    rogue: ['dex', 'con', 'int'],
    sorcerer: ['cha', 'con', 'dex'],
    warlock: ['cha', 'con', 'dex'],
    wizard: ['int', 'con', 'dex'],
  };
  const scores = [15, 14, 13, 12, 10, 8];
  const byName = (a, b) => a.name.localeCompare(b.name, 'es');
  const ownedByDM = (row, camp) => row.owner_id === camp.dm_id && row.data?.friendlyNpc === true;

  function choices() {
    return {
      classes: Object.values(root.ClassData.classes)
        .filter(c => !c.homebrew)
        .sort(byName),
      races: root.CampaignData.races.filter(r => root.Campaign.enabled({ campaignSources: sources() }, r)).sort(byName),
    };
  }

  function sources() {
    return root.Campaign.availableSources().map(([id]) => id);
  }

  function baseSheet({ name, classId, level, raceId, campaignSources = ['PHB'] }) {
    const c = root.ClassData.classes[classId];
    const race = root.Campaign.race({ raceId });
    if (!c || c.homebrew || !race || !Number.isInteger(level) || level < 1 || level > 20)
      throw Error('Elegí una clase, una raza y un nivel entre 1 y 20.');
    const s = root.Rules.initial();
    const books = [...new Set([...campaignSources, c.source, ...race.sources])].filter(id =>
      root.Catalog.sources.some(([key]) => key === id),
    );
    Object.assign(s, {
      friendlyNpc: true,
      creationConfirmed: true,
      classResourcesConfirmed: true,
      classId,
      classSubclass: '',
      level,
      raceId,
      race: race.name,
      speed: Number.isInteger(race.speed) ? race.speed : (race.speed?.walk ?? 30),
      originAuto: true,
      hpAuto: true,
      hpConfirmed: true,
      hpBase: c.die + (level - 1) * (c.die / 2 + 1),
      hdSpent: 0,
      slotsSpent: Array(9).fill(0),
      pactSpent: 0,
      inspirationSpent: 0,
      goldConfirmed: true,
      campaignSources: books,
      prepared: [],
    });
    s.name = name.trim();
    s.progression.sources = books.slice();
    // Se priorizan las características de la clase y se elige la primera variante de aumentos del linaje.
    const order = [...new Set([...(priorities[classId] || []), ...Object.keys(s.abilities)])];
    s.abilities = Object.fromEntries(order.map((a, i) => [a, scores[i]]));
    const adjusted = new Set();
    const adjustments = race.ability || [];
    for (const entry of adjustments)
      for (const a of order)
        if (entry[a]) {
          s.abilities[a] += entry[a];
          adjusted.add(a);
        }
    const weighted = adjustments.find(entry => entry.choose?.weighted)?.choose;
    const picks = weighted ? [weighted] : adjustments.map(entry => entry.choose).filter(Boolean);
    for (const choice of picks) {
      const amounts = choice.weighted?.weights || Array(choice.count || 1).fill(choice.amount || 1);
      const from = choice.weighted?.from || choice.from || order;
      const eligible = order.filter(a => from.includes(a) && !adjusted.has(a));
      amounts.forEach((amount, i) => {
        const a = eligible[i];
        if (a) {
          s.abilities[a] += amount;
          adjusted.add(a);
        }
      });
    }
    return s;
  }

  function spellOptions(s) {
    const stats = root.Rules.stats(s);
    const type = root.Classes.casting(s).type;
    const granted = root.Classes.granted(s);
    const automatic = new Set([...granted.known, ...granted.prepared]);
    const limit = {
      cantrip: type === 'none' ? 0 : stats.cantrips,
      spell: type === 'known' ? stats.known : stats.prepared,
    };
    const maxLevel = Math.max(stats.pact?.level || 0, stats.slots.findLastIndex(n => n > 0) + 1);
    const pool = root.Rules.allSpells(s).filter(
      sp => root.Campaign.enabled(s, sp) && root.Classes.member(sp, s) && sp.level <= maxLevel && !automatic.has(sp.id),
    );
    return { type, limit, pool: type === 'none' ? [] : pool.sort((a, b) => a.level - b.level || byName(a, b)) };
  }

  function create(input, selected) {
    const s = baseSheet(input);
    if (!s.name || s.name.length > 100) throw Error('Poné un nombre de hasta 100 caracteres.');
    const { type, limit, pool } = spellOptions(s);
    const ids = new Set(selected);
    const chosen = pool.filter(sp => ids.has(sp.id));
    if (
      chosen.length !== ids.size ||
      chosen.filter(sp => sp.level === 0).length > limit.cantrip ||
      chosen.filter(sp => sp.level > 0).length > limit.spell
    )
      throw Error('Revisá los conjuros para esta clase y nivel.');
    s.known = chosen.map(sp => sp.id);
    s.prepared = ['prepared', 'book'].includes(type) ? chosen.filter(sp => sp.level > 0).map(sp => sp.id) : [];
    const gear = { ...s, equipmentMode: 'standard' };
    const equipment = root.Equipment.prepare(gear);
    s.inventory = equipment.inventory;
    s.equipmentDefense = gear.equipmentDefense;
    s.gold.gp = equipment.gold;
    s.hp = root.Rules.stats(s).maxHP;
    return root.Rules.validate(s);
  }

  root.FriendlyNPC = { choices, ownedByDM, baseSheet, spellOptions, create };
})(typeof window !== 'undefined' ? window : globalThis);
