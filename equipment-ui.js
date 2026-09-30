const EquipmentUI = (() => {
  'use strict';
  const E = Equipment,
    D = EquipmentData;
  function report(s) {
    const a = E.defense(s);
    return `<div class="defense-result" aria-live="polite"><div><span class="eyebrow">CLASE DE ARMADURA</span><strong>${a.total}</strong></div><div><b>${esc(a.base.label)}</b><p>${esc(a.formula)}</p><small>DES, CON y SAB son modificadores, no puntuaciones. Las fórmulas de CA no se suman entre sí.</small></div></div>${a.warnings.length ? '<ul class="equipment-warnings">' + a.warnings.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' : ''}`;
  }
  function defenseFields(s) {
    const cfg = s.equipmentDefense,
      a = E.defense(s),
      armor = (s.inventory || []).filter(x => x.qty > 0 && E.item(x.equipmentId)?.armor);
    return `<div class="form-grid">${select('Armadura puesta', 'equipArmor', [['', 'Sin armadura'], ...armor.filter(x => E.item(x.equipmentId).armor.type !== 'shield').map(x => [x.id, x.name])], cfg.armorId)}${select('Escudo empuñado', 'equipShield', [['', 'Sin escudo'], ...armor.filter(x => E.item(x.equipmentId).armor.type === 'shield').map(x => [x.id, x.name])], cfg.shieldId)}${select('Fórmula de CA', 'equipFormula', [['auto', 'Mejor fórmula válida automáticamente'], ...a.candidates.map(x => [x.id, x.label + ' · ' + x.formula])], a.candidates.some(x => x.id === cfg.formula) ? cfg.formula : 'auto')}${field('Otros bonos de CA confirmados', 'equipBonus', cfg.bonus, 'number', 'min="-20" max="30" required')}</div><p class="small">El escudo (+2), Protección integrada del forjado (+1) y el estilo Defensa registrado se suman automáticamente cuando corresponden. No los repitas en «Otros bonos».</p>${s.raceId === 'simic-hybrid-base-GGR' && Number(s.level) >= 5 ? `<label class="check"><input type="checkbox" name="equipCarapace" ${cfg.simicCarapace ? 'checked' : ''}>Elegí Caparazón como mejora simic (+1 sin armadura pesada).</label>` : ''}<details class="battle-rule"><summary>Competencia adicional de armadura</summary><label class="check"><input type="checkbox" name="equipProficiency" ${cfg.proficiencyOverride ? 'checked' : ''}>Un rasgo, dote o permiso del DM me concede competencia con la armadura y el escudo seleccionados.</label><p class="small">Marcala solo si esa competencia existe en tu ficha.</p></details>${report(s)}`;
  }
  function collectDefense(fd, cfg) {
    cfg.armorId = String(fd.get('equipArmor') || '');
    cfg.shieldId = String(fd.get('equipShield') || '');
    cfg.formula = String(fd.get('equipFormula') || 'auto');
    cfg.bonus = Number(fd.get('equipBonus') || 0);
    cfg.simicCarapace = fd.has('equipCarapace');
    cfg.proficiencyOverride = fd.has('equipProficiency');
  }
  function creationFields(d) {
    const b = E.prepare(d),
      manual = d.equipmentMode === 'manual',
      bg = D.backgrounds[d.backgroundId],
      view = { ...d, inventory: b.inventory };
    return `<section class="creation-equipment"><h3>Tu equipo inicial</h3><div class="equipment-overview" aria-live="polite"><span>CA <b>${b.defense.total}</b></span><span>Saldo <b>${b.gold + Number(d.gold || 0)} po</b></span><span>Objetos <b>${b.inventory.length}</b></span></div>${select(
      'Cómo empezás',
      'equipmentMode',
      [
        ['standard', 'Equipo inicial de clase + trasfondo'],
        ['manual', 'Ya tengo equipo / compré con oro inicial'],
      ],
      d.equipmentMode || 'standard',
    )}<p class="small">${manual ? 'Este modo no entrega equipo ni monedas iniciales. Registrá tus pertenencias y el saldo restante; si compraste con oro inicial, no sumes también los paquetes.' : 'Las opciones vienen preseleccionadas para que tengas una base; cambiá las que quieras antes de crear. Son los paquetes iniciales de nivel 1, aunque empieces en un nivel superior.'}</p>${!manual && bg?.template ? select('Paquete del trasfondo personalizado', 'equipmentTemplate', [['', 'Elegí un trasfondo'], ...E.templateOptions(d).map(x => [x.id, x.name])], d.equipmentTemplate || '') : ''}${!manual && bg?.secondary ? select('Gremio secundario del agente dimir', 'equipmentSecondary', [['', 'Elegí tu gremio secundario'], ...E.templateOptions(d, true).map(x => [x.id, x.name])], d.equipmentSecondary || '') : ''}${b.sections.map(sec => `<fieldset class="equipment-section"><legend>${esc(sec.title)}</legend>${sec.fixed.length ? '<p class="small"><b>Incluido:</b> ' + sec.fixed.map(esc).join(', ') + '.</p>' : ''}${sec.fields.map(f => `<label class="field">${esc(f.title)}<select name="eq:${esc(f.key)}">${f.options.map(o => `<option value="${esc(o.id)}" ${o.id === f.value ? 'selected' : ''} ${o.disabled ? 'disabled' : ''}>${esc(o.label)}${o.disabled ? ' · requiere competencia' : ''}</option>`).join('')}</select>${(f.options.find(o => o.id === f.value)?.label.length || 0) > 55 ? '<small>' + esc(f.options.find(o => o.id === f.value).label) + '</small>' : ''}</label>`).join('') || '<p class="small">Sin elecciones de objetos.</p>'}</fieldset>`).join('')}<p class="small"><b>Raza:</b> la competencia con un arma o herramienta no entrega ese objeto. Los rasgos que afectan la CA se muestran en su desglose.</p>${b.pending.map(x => '<p class="equipment-pending">' + esc(x) + '</p>').join('')}<div class="equipment-summary"><b>Monedas del equipo: ${b.gold} po</b><p class="small">Se registran como saldo. Las joyas, los trofeos y las monedas usadas como adorno siguen siendo objetos.</p></div>${field(manual ? 'Oro actual confirmado' : 'Oro adicional confirmado por tu mesa', 'gold', d.gold ?? 0, 'number', 'min="0" max="99999999" required')}${area(manual ? 'Equipo actual (un objeto por línea)' : 'Objetos adicionales recibidos (un objeto por línea)', 'gear', d.gear || '')}<details class="battle-rule"><summary>Inventario inicial · ${b.inventory.length} entradas</summary><p class="small">Los paquetes se desglosan; no se duplica el paquete como objeto. Podés ajustar cantidades en Equipo después de crear.</p>${inventoryList(b.inventory)}</details><h3 class="section-space">Qué llevás puesto</h3>${manual ? '<p class="small">Los nombres escritos a mano no identifican automáticamente una armadura. Después de crear, usá Equipo → Añadir del catálogo o vinculá el objeto al editarlo y elegí qué llevás puesto.</p>' : ''}${defenseFields(view)}</section>`;
  }
  function inventoryList(rows) {
    return `<div class="starting-inventory">${rows.map(x => `<div><b>${x.qty} × ${esc(x.name)}</b><small>${esc((x.origins || []).join(' · '))}</small></div>`).join('') || '<p class="small">No hay objetos automáticos.</p>'}</div>`;
  }
  function collectCreation(fd, d) {
    d.equipmentMode = String(fd.get('equipmentMode') || 'standard');
    d.equipmentTemplate = String(fd.get('equipmentTemplate') || '');
    d.equipmentSecondary = String(fd.get('equipmentSecondary') || '');
    d.equipmentChoices = d.equipmentChoices || {};
    for (const [key, val] of fd) if (key.startsWith('eq:')) d.equipmentChoices[key.slice(3)] = String(val);
    d.gold = fd.get('gold');
    d.gear = String(fd.get('gear') || '');
    d.equipmentDefense = d.equipmentDefense || {};
    collectDefense(fd, d.equipmentDefense);
  }
  function initialState(d, s) {
    if (!d.equipmentMode) return s;
    const b = E.prepare(d);
    s.inventory = [...b.inventory, ...s.inventory];
    s.gold.gp = b.gold + Number(d.gold);
    s.equipmentDefense = { ...d.equipmentDefense };
    s.acBase = 10;
    s.acBonus = 0;
    return s;
  }
  function review(d) {
    if (!d.equipmentMode) return '';
    const b = E.prepare(d);
    return `<h3>Equipo y defensa</h3><p>Saldo inicial: <b>${b.gold + Number(d.gold)} po</b> · ${b.inventory.length} entradas automáticas, además de los objetos que anotaste.</p>${report({ ...d, inventory: b.inventory })}<details class="battle-rule"><summary>Revisar objetos antes de crear</summary>${inventoryList(b.inventory)}</details>`;
  }
  function panel(s) {
    return `<section class="card section-space"><div class="card-header"><h2>Armadura y escudo</h2>${button('Equipar / calcular CA', 'equipment-defense')}</div>${s.equipmentDefense ? report(s) : `<p>CA registrada: <b>${Rules.stats(s).ac}</b>.</p><p class="small">Esta ficha conserva su cálculo manual. Podés activar el cálculo por equipo al elegir armadura y escudo; revisá los bonos para no contarlos dos veces.</p>`}<p class="small">Llevar un objeto en el inventario no significa tenerlo equipado. Ponerse o quitarse equipo requiere el tiempo indicado por las reglas.</p></section>`;
  }
  function editDefense() {
    const draft = clone(state);
    draft.equipmentDefense = draft.equipmentDefense || {
      armorId: '',
      shieldId: '',
      formula: 'auto',
      bonus: 0,
      simicCarapace: false,
      proficiencyOverride: false,
    };
    const draw = () => {
      modal(
        'Armadura, escudo y CA',
        `<p class="small">Elegí los objetos que realmente llevás puestos. Las fichas anteriores no cambian hasta guardar. Vinculá las armaduras escritas a mano al catálogo desde Editar objeto.</p><div id="defense-editor">${defenseFields(draft)}</div>${button('Usar cálculo manual de CA', 'equipment-manual', 'secondary')}`,
        fd => {
          collectDefense(fd, draft.equipmentDefense);
          E.validate(draft);
          const armor = E.defense(draft).armor;
          if (
            draft.raceId === 'warforged-base-ERLW' &&
            armor &&
            !E.proficient(draft, E.item(armor.equipmentId).armor.type)
          )
            throw Error('Un forjado solo puede incorporar armadura con la que tenga competencia.');
          commit('Armadura y CA actualizadas', s => (s.equipmentDefense = clone(draft.equipmentDefense)));
        },
      );
      document.getElementById('dialog-form').addEventListener('change', () => {
        const fd = new FormData(document.getElementById('dialog-form'));
        collectDefense(fd, draft.equipmentDefense);
        const el = document.getElementById('defense-editor'),
          box = document.querySelector('#modal .modal-body'),
          top = box.scrollTop;
        el.innerHTML = defenseFields(draft);
        box.scrollTop = top;
      });
    };
    draw();
  }
  function addCatalog() {
    const rows = Object.values(D.items)
      .filter(x => !x.id.startsWith('origin-'))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    modal(
      'Añadir del catálogo',
      `${select(
        'Objeto',
        'equipmentId',
        rows.map(x => [x.id, x.name]),
        'leather-armor',
      )}${field('Cantidad', 'qty', 1, 'number', 'min="1" max="999999" required')}<p class="small">Registrá objetos que recibiste o compraste. Agregarlos no descuenta oro ni los equipa automáticamente; anotá el gasto si corresponde.</p>`,
      fd => {
        const id = fd.get('equipmentId'),
          data = E.item(id),
          qty = number(fd, 'qty', 1, 999999);
        if (!data) throw Error('Elegí un objeto del catálogo.');
        commit('Añadido: ' + data.name, s => {
          const add = (id, n) => {
            const x = E.item(id);
            if (x.contents) return x.contents.forEach(t => add(t.item, t.qty * n));
            s.inventory.push({
              id: uid(),
              equipmentId: id,
              name: x.name,
              qty: n,
              category: x.category,
              weight: x.weight ?? null,
              location: 'Con el personaje',
              notes: x.notes || '',
            });
          };
          add(id, qty);
        });
      },
    );
  }
  function itemFields(x) {
    return select(
      'Vincular a armadura del catálogo (para calcular CA)',
      'equipmentId',
      [
        ['', 'Objeto libre / conservar tipo actual'],
        ...Object.values(D.items)
          .filter(x => x.armor)
          .map(x => [x.id, x.name]),
      ],
      x?.equipmentId && E.item(x.equipmentId)?.armor ? x.equipmentId : '',
    );
  }
  function install() {
    Object.assign(actions, {
      'equipment-defense': editDefense,
      'equipment-catalog': addCatalog,
      'equipment-manual': () => {
        modal(
          'CA manual',
          `${field('CA base (sin modificadores ni escudo)', 'base', state.acBase, 'number', 'min="0" max="40" required')}${select(
            'Fórmula',
            'armorMode',
            [
              ['normal', 'Base + DES'],
              ['medium', 'Base + DES (máximo +2)'],
              ['fixed', 'CA fija'],
              ['barbarian', '10 + DES + CON'],
              ['monk', '10 + DES + SAB'],
            ],
            state.armorMode || 'normal',
          )}${field('Todos los bonos (incluido escudo y raza)', 'bonus', state.acBonus, 'number', 'min="-20" max="30" required')}<p class="small">En modo manual, vos registrás cada bono. El equipo del inventario deja de determinar la CA.</p>`,
          fd =>
            commit('Cálculo manual de CA', s => {
              delete s.equipmentDefense;
              s.acBase = number(fd, 'base', 0, 40);
              s.acBonus = number(fd, 'bonus', -20, 30);
              s.armorMode = fd.get('armorMode');
              s.armorDexCap = s.armorMode === 'medium' ? 2 : 30;
            }),
        );
      },
    });
  }
  return { creationFields, collectCreation, initialState, review, panel, editDefense, itemFields, install };
})();
