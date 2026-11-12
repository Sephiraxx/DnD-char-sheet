/* Botones y diálogos de importación y exportación (la lógica está en interop.js). */
const InteropUI = (() => {
  'use strict';
  // Lo que las reglas de la app calculan sobre la ficha, en la forma que esperan los exportadores.
  function view(s) {
    const st = Rules.stats(s),
      scores = (Rules.formScores || Rules.scores)(s),
      views = Classes.views(s),
      classes = views.map(v => ({
        id: v.classId,
        english: ClassData.classes[v.classId]?.english || v.classId,
        level: v.level,
        sub: Classes.sub(v)?.english || Classes.sub(v)?.name || '',
      })),
      saves = [...new Set(ClassData.classes[views[0]?.classId]?.saves || [])],
      skills = Object.fromEntries(
        Rules.skills.map(([k]) => [k, (s.expertise || []).includes(k) ? 2 : Rules.hasSkill(s, k) ? 1 : 0]),
      ),
      all = Rules.allSpells(s),
      ids = [...new Set([...(s.known || []), ...(s.prepared || []), ...(s.extras || [])])],
      spells = ids
        .map(id => all.find(x => x.id === id))
        .filter(Boolean)
        .map(x => ({
          name: x.english || x.name,
          level: x.level || 0,
          prepared: (s.prepared || []).includes(x.id) || !x.level,
        })),
      languages = [
        ...new Set([
          ...(typeof Grants !== 'undefined' ? Grants.proficiencies(s, 'language').map(l => Campaign.facts(l)) : []),
          ...String(s.languages || '')
            .split(/[,;]/)
            .map(x => x.trim())
            .filter(Boolean),
        ]),
      ];
    return {
      name: s.name,
      classes,
      race: s.race || '',
      background: s.background || '',
      scores,
      saves,
      skills,
      hp: s.hp,
      maxHp: st.maxHP,
      temp: s.temp || 0,
      ac: st.ac,
      speed: Rules.speedInfo ? Rules.speedInfo(s, st.speed).speed : st.speed || 30,
      prof: st.prof,
      gold: s.gold || {},
      languages,
      persona: s.persona || {},
      spells,
      items: (s.inventory || []).map(i => ({
        name: i.name,
        qty: i.qty || 1,
        weight: i.weight || 0,
        notes: i.notes || '',
      })),
    };
  }
  function download(name, data) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const slug = t =>
    String(t || 'personaje')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'personaje';

  function exportDialog() {
    modal(
      'Llevar la ficha a otra herramienta',
      `<p class="small">Se descarga un archivo con lo esencial: características, PG, CA, competencias, monedas, personalidad, y los nombres de conjuros y equipo. Los rasgos de clase y los detalles de cada objeto no viajan: hay que agregarlos allá.</p>
      <div class="list-row"><div><b>Foundry VTT</b><p class="small muted">Sistema dnd5e. Creá un personaje vacío, clic derecho → «Import Data» y elegí el archivo.</p></div><div class="actions">${button('Descargar', 'interop-foundry', 'secondary')}</div></div>
      <div class="list-row"><div><b>Roll20</b><p class="small muted">Hoja «D&D 5E by Roll20». Se importa con la extensión VTT Enhancement Suite (Roll20 no tiene importación propia).</p></div><div class="actions">${button('Descargar', 'interop-roll20', 'secondary')}</div></div>
      <p class="small muted">Formatos en prueba: si algo no entra bien, avisá qué versión usás.</p>`,
      null,
    );
  }
  function importDialog() {
    modal(
      'Importar de D&D Beyond',
      `<p class="small">Trae nombre, clase, raza, trasfondo, características y personalidad al creador; conjuros, equipo y habilidades quedan anotados para que los marques en cada paso.</p>
      <ol class="small"><li>En D&D Beyond, poné el personaje como <b>público</b>.</li><li>Su dirección termina en un número (…/characters/<b>12345678</b>). Abrí en otra pestaña: <code>character-service.dndbeyond.com/character/v5/character/12345678</code></li><li>Guardá esa página (o copiá todo el texto) y cargala acá.</li></ol>
      <label class="field">Archivo .json<input type="file" name="file" accept=".json,application/json,text/plain"></label>
      <label class="field">O pegá el texto<textarea name="text" rows="4" placeholder='{"id":12345678,"success":true,"data":{…'></textarea></label>`,
      async fd => {
        const file = fd.get('file'),
          raw = file && file.size ? await file.text() : String(fd.get('text') || '');
        if (!raw.trim()) throw Error('Elegí el archivo o pegá el texto del personaje.');
        if (raw.length > 6 * 1024 * 1024) throw Error('El archivo supera 6 MB.');
        let json;
        try {
          json = JSON.parse(raw);
        } catch {
          throw Error('Eso no es un JSON válido. Copiá la página completa, desde la primera llave hasta la última.');
        }
        const sources = typeof Campaign !== 'undefined' && state ? Campaign.selected(state) : null,
          r = Interop.fromDDB(json, {
            classes: ClassData.classes,
            races: CampaignData.races,
            backgrounds: CampaignData.backgrounds,
            skillNames: Object.fromEntries(Rules.skills.map(([k, l]) => [k, l])),
            sources,
          });
        Creator.startWith(r.draft, { matched: r.matched, missing: r.missing });
      },
      'Importar',
    );
  }
  function install() {
    Object.assign(actions, {
      'interop-export': exportDialog,
      'interop-import': importDialog,
      'interop-foundry': () => download(slug(state.name) + '-foundry.json', Interop.toFoundry(view(state))),
      'interop-roll20': () => download(slug(state.name) + '-roll20.json', Interop.toRoll20(view(state))),
    });
  }
  return { view, install };
})();
