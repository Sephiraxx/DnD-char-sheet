/* Audit every official grant profile against the bundled spell catalog. */
const { load } = require('../test/load');
function audit(g = load()) {
  const state = {
    ...g.Rules.initial(),
    classId: 'wizard',
    classSubclass: '',
    subclass: '',
    level: 20,
    raceId: '',
    backgroundId: '',
    campaignSources: g.Catalog.sources.map(s => s[0]),
    grantChoices: {},
  };
  const sources = [];
  for (const [kind, rows] of [
    ['race', g.CampaignData.races],
    ['background', g.CampaignData.backgrounds],
    ['feat', g.Catalog.feats],
    ['option', g.ClassData.options],
  ])
    for (const row of rows) {
      const data =
        kind === 'feat'
          ? g.GrantData.feats[row.id]
          : kind === 'option'
            ? g.GrantData.options[row.id]
            : { ...row, ...(kind === 'race' ? g.GrantData.races[row.id] : {}) };
      if (data?.additionalSpells?.length && row.id !== 'strixhaven-initiate')
        sources.push({
          key: kind + ':' + row.id,
          id: row.id,
          kind,
          name: row.name,
          source: row.source || row.sourceKey,
          level: 20,
          data,
          ability: 'wis',
        });
    }
  for (const sub of g.ClassData.subclasses) {
    const s = { ...state, classId: sub.classId || sub.class, classSubclass: sub.id };
    if (!g.ClassData.classes[s.classId]) continue;
    sources.push(...g.Grants.sources(s).filter(x => x.kind === 'sub'));
  }
  const missing = [],
    emptyChoices = [],
    queries = new Set();
  let profiles = 0,
    nodes = 0;
  for (const src of sources) {
    for (let i = 0; i < Math.max(1, src.data.additionalSpells.length); i++) {
      const s = { ...state, grantChoices: { [src.key]: { variant: i, ability: 'wis' } } },
        plan = g.Grants.spellPlan(s, src);
      profiles++;
      for (const n of plan.nodes) {
        nodes++;
        if (n.missing) missing.push({ source: src.key, profile: i, reference: n.missing });
        if (n.chosen && !n.candidates.length) emptyChoices.push({ source: src.key, profile: i, choice: n.id });
      }
    }
    const walk = x => {
      if (!x || typeof x !== 'object') return;
      if (typeof x.choose === 'string') queries.add(x.choose);
      for (const v of Object.values(x)) walk(v);
    };
    walk(src.data.additionalSpells);
  }
  return {
    edition: '2014',
    backgrounds: g.CampaignData.backgrounds.length,
    races: g.CampaignData.races.length,
    feats: g.Catalog.feats.length,
    classOptions: g.ClassData.options.length,
    spellSources: sources.length,
    spellProfiles: profiles,
    spellNodes: nodes,
    queries: queries.size,
    missing,
    emptyChoices,
  };
}
if (require.main === module) console.log(JSON.stringify(audit(), null, 2));
module.exports = { audit };
