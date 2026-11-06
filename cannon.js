/* Cañón sobrenatural del Artillero (artífice, Tasha p. 17–19) y La herramienta adecuada (artífice 3).
   Crear: una acción, con herramientas de tallista o de herrero en la mano; gratis una vez por descanso
   largo o gastando un espacio de nivel 1+. Uno a la vez (dos desde el nivel 15). CA 18, PG = 5 × nivel de
   artífice, dura 1 hora. Se activa con una acción adicional a 60 pies: Lanzallamas (cono de 15 pies, DES,
   2d8 fuego), Balista de fuerza (ataque de conjuro a 120 pies, 2d8 fuerza y empuja 5 pies) o Protector
   (1d8 + INT PG temporales a 10 pies). Nivel 9: +1d8 al daño y Detonar (acción, 20 pies, DES, 3d8 fuerza). */
(function (root) {
  'use strict';
  const TYPES = {
    flamethrower: {
      name: 'Lanzallamas',
      text: 'Cono de 15 pies adyacente: cada criatura salva Destreza contra tu CD o recibe 2d8 de fuego (la mitad si la supera). Enciende objetos inflamables que nadie lleve.',
    },
    ballista: {
      name: 'Balista de fuerza',
      text: 'Ataque de conjuro a distancia desde el cañón contra una criatura u objeto a 120 pies: 2d8 de fuerza y, si es una criatura, la empuja hasta 5 pies.',
    },
    protector: {
      name: 'Protector',
      text: 'El cañón y cada criatura que elijas a 10 pies de él ganan 1d8 + tu modificador de Inteligencia (mínimo +1) PG temporales.',
    },
  };
  const SIZES = { small: 'Pequeño', tiny: 'Diminuto' };
  const TOOLS = ['woodcarvers-tools', 'smiths-tools'];
  const C = () => root.Classes;
  const n = v => Number(v) || 0;
  const esc = v =>
    String(v ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );

  // La vista del artífice Artillero (también si es la clase secundaria).
  function artillerist(s) {
    const views = C()?.views ? C().views(s) : [s];
    return (
      views.find(
        v =>
          (C()?.id ? C().id(v) : v.classId) === 'artificer' &&
          v.classSubclass === 'artificer-artillerist' &&
          v.level >= 3,
      ) || null
    );
  }
  const artificer = s =>
    (C()?.views ? C().views(s) : [s]).find(v => (C()?.id ? C().id(v) : v.classId) === 'artificer' && v.level >= 3) ||
    null;
  function info(s) {
    const v = artillerist(s);
    if (!v) return null;
    const st = root.Rules.stats(v);
    return {
      level: v.level,
      max: v.level >= 15 ? 2 : 1,
      hp: 5 * v.level,
      explosive: v.level >= 9,
      fortified: v.level >= 15,
      dc: st.dc,
      attack: st.attack,
      int: st.mods.int,
      dice: v.level >= 9 ? 3 : 2,
    };
  }
  const list = s => (Array.isArray(s.cannons) ? s.cannons : []);
  const hasTools = s => (s.inventory || []).some(x => TOOLS.includes(x.equipmentId) && x.qty > 0);
  // Para La herramienta adecuada hace falta tener en la mano herramientas de ladrón o de artesano.
  const canMakeTools = s =>
    Boolean(artificer(s)) &&
    (s.inventory || []).some(
      x =>
        x.qty > 0 && (x.equipmentId === 'thieves-tools' || /-tools$|-supplies$|-utensils$/.test(x.equipmentId || '')),
    );
  const freeLeft = s => {
    const r = (C()?.resources(s) || []).find(x => x.id === 'cannon');
    const used = r ? C().spent(s, r) : null;
    return r && used !== null ? r.max - used : 0;
  };

  // Crea uno (o dos desde el nivel 15). pay: 'free' o el valor de un espacio (1–9 o 'pact').
  function create(s, { type, size = 'small', pay = 'free', count = 1, tools = false } = {}) {
    const d = info(s);
    if (!d) throw Error('El Cañón sobrenatural es del artífice Artillero de nivel 3.');
    if (!TYPES[type] || !SIZES[size]) throw Error('Elegí el tipo y el tamaño del cañón.');
    count = Math.max(1, Math.min(d.max, Math.trunc(n(count)) || 1));
    if (list(s).length)
      throw Error('Ya tenés un cañón: no podés crear otro mientras esté presente (retiralo primero).');
    if (!hasTools(s) && !tools)
      throw Error('Hacen falta herramientas de tallista o de herrero en la mano (o que el DM lo permita).');
    if (pay === 'free') {
      if (freeLeft(s) < 1)
        throw Error(
          'Ya creaste un cañón gratis desde tu último descanso largo: gastá un espacio de nivel 1 o superior.',
        );
      C().spend(s, 'cannon', 1);
    } else spendSlot(s, pay);
    if (root.Combat?.data(s).active) root.Combat.use(s, 'action', 'Crear cañón sobrenatural');
    s.cannons = Array.from({ length: count }, (_, i) => ({
      id: 'can-' + Date.now().toString(36) + i,
      type,
      size,
      hp: d.hp,
      maxHp: d.hp,
    }));
  }
  function spendSlot(s, pay) {
    if (pay === 'pact') {
      const d = root.Rules.stats(s);
      if (!d.pact || (s.pactSpent ?? 0) >= d.pact.slots) throw Error('No te quedan espacios de pacto.');
      s.pactSpent = (s.pactSpent ?? 0) + 1;
      return;
    }
    const l = Math.trunc(n(pay));
    if (l < 1 || l > 9) throw Error('Elegí un espacio de nivel 1 o superior.');
    const max = root.Rules.stats(s).slots[l - 1] || 0;
    if (Array.isArray(s.fontSlots) && s.fontSlots[l - 1] > 0) {
      s.fontSlots = s.fontSlots.slice();
      s.fontSlots[l - 1]--;
    } else if (s.slotsSpent[l - 1] !== null && s.slotsSpent[l - 1] < max) s.slotsSpent[l - 1]++;
    else throw Error(`No te quedan espacios de nivel ${l}.`);
  }
  function remove(s, id, action = false) {
    if (action && root.Combat?.data(s).active) root.Combat.use(s, 'action', 'Retirar cañón');
    s.cannons = list(s).filter(c => c.id !== id);
    if (!s.cannons.length) delete s.cannons;
  }
  function hurt(s, id, amount) {
    const c = list(s).find(x => x.id === id);
    if (!c) throw Error('Ese cañón ya no está.');
    c.hp = Math.max(0, Math.min(c.maxHp, c.hp - Math.trunc(n(amount))));
    if (c.hp === 0) remove(s, id);
    return c.hp;
  }
  // La activación: una acción adicional (con dos cañones, la misma los activa a ambos).
  function activate(s, id) {
    const c = list(s).find(x => x.id === id);
    if (!c) throw Error('Ese cañón ya no está.');
    const cs = root.Combat?.data(s);
    if (cs?.active) {
      if (info(s).fortified && /^Cañón/.test(cs.bonus || '')) return c;
      root.Combat.use(s, 'bonus', 'Cañón: ' + TYPES[c.type].name);
    }
    return c;
  }
  // Un «conjuro» para la ventana de tiradas: CD y ataque del artífice, sin espacio.
  function shot(s, c, detonate = false) {
    const d = info(s);
    if (detonate)
      return {
        id: 'eldritch-cannon-detonate',
        name: 'Cañón sobrenatural: Detonar',
        level: 1,
        time: 'Acción',
        range: 'Radio de 20 pies desde el cañón',
        duration: 'Instantáneo',
        components: '—',
        saveAbility: ['Destreza'],
        attackKind: [],
        damageTypes: ['fuerza'],
        brief:
          'Cada criatura a 20 pies del cañón salva Destreza: 3d8 de daño de fuerza, o la mitad si la supera. El cañón se destruye.',
      };
    const fire = c.type === 'flamethrower';
    return {
      id: 'eldritch-cannon-' + c.id,
      name: 'Cañón: ' + TYPES[c.type].name,
      level: 1,
      time: 'Adicional',
      range: fire ? 'Cono de 15 pies' : '120 pies',
      duration: 'Instantáneo',
      components: '—',
      saveAbility: fire ? ['Destreza'] : [],
      attackKind: fire ? [] : ['R'],
      damageTypes: [fire ? 'fuego' : 'fuerza'],
      brief: fire
        ? `Cono de 15 pies: cada criatura salva Destreza; ${d.dice}d8 de daño de fuego, o la mitad si la supera. Enciende objetos inflamables que nadie lleve.`
        : `Ataque de conjuro a distancia contra una criatura u objeto a 120 pies: ${d.dice}d8 de daño de fuerza y la empuja hasta 5 pies.`,
    };
  }
  function validate(s) {
    const bad = () => {
      throw Error('Los cañones sobrenaturales no son válidos.');
    };
    if (s.cannons !== undefined) {
      if (!Array.isArray(s.cannons) || s.cannons.length > 2) bad();
      for (const c of s.cannons)
        if (
          !c ||
          typeof c.id !== 'string' ||
          c.id.length > 40 ||
          !TYPES[c.type] ||
          !SIZES[c.size] ||
          !Number.isInteger(c.maxHp) ||
          c.maxHp < 1 ||
          c.maxHp > 100 ||
          !Number.isInteger(c.hp) ||
          c.hp < 0 ||
          c.hp > c.maxHp
        )
          bad();
    }
    if (
      s.rightTool !== undefined &&
      (typeof s.rightTool !== 'string' || !(s.inventory || []).some(x => x.id === s.rightTool))
    )
      delete s.rightTool;
  }

  // ---------- En la ficha ----------
  // Usa las funciones de la página: button(), modal(), select(), field(), commit(), toast(), state, RollUI.
  function block(c, d) {
    return `<article class="cmp cannon"><div class="cmp-head"><div><p class="eyebrow">Cañón sobrenatural · ${esc(SIZES[c.size])}</p><h3>${esc(TYPES[c.type].name)}</h3></div><div class="cmp-stats"><button type="button" class="cc-stat cmp-hp" data-action="cannon-hp" data-id="${esc(c.id)}"><b>${c.hp}<small>/${c.maxHp}</small></b><span>PG</span></button><div class="cc-stat"><b>18</b><span>CA</span></div></div></div><p class="small">${esc(TYPES[c.type].text.replace('2d8', d.dice + 'd8'))}</p><div class="actions">${button('Activar · adicional', 'cannon-fire', '', `data-id="${esc(c.id)}"`)}${d.explosive ? button('Detonar · acción', 'cannon-detonate', 'danger', `data-id="${esc(c.id)}"`) : ''}${button('Retirar', 'cannon-remove', 'secondary', `data-id="${esc(c.id)}"`)}</div></article>`;
  }
  function card(s = state) {
    const d = info(s);
    if (!d) return '';
    const cannons = list(s);
    const free = freeLeft(s);
    return `<section class="card section-space cannon-card"><div class="card-header"><h2>Cañón sobrenatural</h2><span class="tag">${free ? 'Gratis disponible' : 'Gratis usado: requiere espacio'}</span></div>${
      cannons.length
        ? `<div class="cmp-list">${cannons.map(c => block(c, d)).join('')}</div><p class="small muted">Dura 1 hora o hasta quedar a 0 PG. Se activa si estás a 60 pies; antes de disparar puede moverse 15 pies si tiene patas. Inmune a veneno, psíquico y estados; Remendar le cura 2d6.${d.fortified ? ' Vos y tus aliados tienen media cobertura a 10 pies de un cañón.' : ''}</p>`
        : `<p class="small">Acción, con herramientas de tallista o de herrero en la mano: aparece en un espacio libre a 5 pies. CA 18, ${d.hp} PG, CD ${d.dc}, ataque ${d.attack >= 0 ? '+' : ''}${d.attack}.</p><div class="actions">${button('Crear cañón', 'cannon-create', '')}${canMakeTools(s) ? button('La herramienta adecuada', 'right-tool', 'secondary') : ''}</div>${hasTools(s) ? '' : '<p class="small muted">No tenés herramientas de tallista ni de herrero en el inventario. «La herramienta adecuada» las crea en 1 hora (puede ser durante un descanso) si tenés herramientas de ladrón o de artesano.</p>'}`
    }</section>`;
  }
  function install(actions) {
    const g = root;
    Object.assign(actions, {
      'cannon-create': () => {
        const s = state,
          d = info(s);
        if (!d) throw Error('El Cañón sobrenatural es del artífice Artillero de nivel 3.');
        const slots = (g.Combat.availableSlots(s, { level: 1 }) || []).map(x => [
          String(x.value),
          `Gastar espacio ${x.value === 'pact' ? 'de pacto' : 'de nivel ' + x.level} (${x.left} disponible${x.left > 1 ? 's' : ''})`,
        ]);
        const pay = [...(freeLeft(s) ? [['free', 'Gratis (una vez por descanso largo)']] : []), ...slots];
        if (!pay.length) throw Error('Ya usaste el cañón gratis y no te quedan espacios.');
        modal(
          'Crear cañón sobrenatural',
          `<p class="small">Una acción. Aparece en un espacio libre sobre una superficie horizontal a 5 pies.</p>${select(
            'Tipo',
            'type',
            Object.entries(TYPES).map(([k, t]) => [k, t.name]),
            'flamethrower',
          )}<p class="small">${Object.values(TYPES)
            .map(t => `<b>${esc(t.name)}:</b> ${esc(t.text.replace('2d8', d.dice + 'd8'))}`)
            .join('<br>')}</p><div class="form-grid">${select(
            'Tamaño',
            'size',
            Object.entries(SIZES).map(([k, t]) => [k, t + (k === 'tiny' ? ' (cabe en una mano)' : '')]),
            'small',
          )}${select('Cómo', 'pay', pay, pay[0][0])}${
            d.max > 1
              ? select(
                  'Cantidad',
                  'count',
                  [
                    ['1', 'Uno'],
                    ['2', 'Dos (misma acción)'],
                  ],
                  '1',
                )
              : ''
          }</div>${
            hasTools(s)
              ? ''
              : `<div class="banner"><p>No tenés herramientas de tallista ni de herrero en el inventario.</p><label class="check"><input type="checkbox" name="tools">El DM permite crearlo igual</label></div>`
          }`,
          fd => {
            const pay = String(fd.get('pay'));
            commit('Cañón sobrenatural creado', x =>
              create(x, {
                type: String(fd.get('type')),
                size: String(fd.get('size')),
                pay: pay === 'free' || pay === 'pact' ? pay : Number(pay),
                count: Number(fd.get('count') || 1),
                tools: fd.has('tools'),
              }),
            );
            toast(
              `Cañón listo: ${TYPES[String(fd.get('type'))].name}, ${d.hp} PG, CA 18. Activalo con tu acción adicional.`,
            );
          },
          'Crear',
        );
      },
      'cannon-fire': e => {
        const s = state,
          d = info(s),
          c = list(s).find(x => x.id === e.dataset.id);
        if (!c) throw Error('Ese cañón ya no está.');
        if (c.type === 'protector') {
          const roll = g.roll(8, 1)[0],
            temp = roll + Math.max(1, d.int);
          return modal(
            'Cañón: Protector',
            `<p>1d8 (${roll}) + ${Math.max(1, d.int)} = <b>${temp}</b> PG temporales para el cañón y cada criatura que elijas a 10 pies de él.</p><label class="check"><input type="checkbox" name="me" checked>Estoy a 10 pies: me los aplico</label><p class="small">Los PG temporales no se suman: cada uno se queda con el valor más alto.</p>`,
            fd => {
              commit('Cañón: Protector · ' + temp + ' PG temporales', x => {
                activate(x, c.id);
                if (fd.has('me')) x.temp = Math.max(n(x.temp), temp);
              });
              if (typeof RollFX !== 'undefined')
                RollFX.show({ label: 'Protector · PG temporales', total: temp, face: roll });
            },
            'Aplicar',
          );
        }
        commit('Cañón: ' + TYPES[c.type].name, x => activate(x, c.id));
        setTimeout(() => RollUI.spell(shot(state, c), 1, { override: { dc: d.dc, attack: d.attack } }));
      },
      'cannon-detonate': e => {
        const s = state,
          d = info(s),
          c = list(s).find(x => x.id === e.dataset.id);
        if (!c) throw Error('Ese cañón ya no está.');
        commit('Cañón sobrenatural: Detonar', x => {
          if (g.Combat.data(x).active) g.Combat.use(x, 'action', 'Detonar cañón');
          remove(x, c.id);
        });
        setTimeout(() => RollUI.spell(shot(state, c, true), 1, { override: { dc: d.dc, attack: d.attack } }));
      },
      'cannon-remove': e =>
        modal(
          'Retirar cañón',
          select(
            'Cómo',
            'how',
            [
              ['action', 'Lo retiro ahora (usa una acción)'],
              ['gone', 'Ya desapareció: pasó 1 hora (sin acción)'],
            ],
            'action',
          ),
          fd => commit('Cañón retirado', x => remove(x, e.dataset.id, fd.get('how') === 'action')),
          'Retirar',
        ),
      'cannon-hp': e => {
        const c = list(state).find(x => x.id === e.dataset.id);
        if (!c) throw Error('Ese cañón ya no está.');
        modal(
          'PG del cañón',
          `<p>${c.hp} / ${c.maxHp} PG. Es inmune al daño de veneno y psíquico.</p>${field('Cantidad', 'amount', '', 'number', 'min="1" max="200" required')}${select(
            'Qué pasó',
            'kind',
            [
              ['damage', 'Recibe daño'],
              ['heal', 'Se repara'],
            ],
            'damage',
          )}<p class="small">Remendar le devuelve 2d6 PG.</p>`,
          fd => {
            const k = Math.trunc(Number(fd.get('amount')) || 0);
            if (k < 1) throw Error('Escribí una cantidad.');
            let left = 0;
            commit('Cañón: ' + (fd.get('kind') === 'heal' ? '+' : '−') + k + ' PG', x => {
              left = hurt(x, c.id, fd.get('kind') === 'heal' ? -k : k);
            });
            if (!left) toast('El cañón queda a 0 PG y desaparece.');
          },
        );
      },
      // La herramienta adecuada: 1 hora con herramientas de ladrón o de artesano; las anteriores desaparecen.
      'right-tool': () => {
        const s = state;
        if (!canMakeTools(s)) throw Error('Necesitás herramientas de ladrón o de artesano en el inventario.');
        const tools = Object.values(g.EquipmentData.items)
          .filter(
            x => /-tools$|-supplies$|-utensils$/.test(x.id) && !['thieves-tools', 'navigators-tools'].includes(x.id),
          )
          .sort((a, b) => a.name.localeCompare(b.name, 'es'));
        modal(
          'La herramienta adecuada',
          `<p class="small">Con herramientas de ladrón o de artesano en la mano creás un juego de herramientas de artesano a 5 pies. Lleva 1 hora de trabajo (puede coincidir con un descanso corto o largo). No son mágicas y desaparecen si volvés a usar este rasgo.</p>${select(
            'Herramientas',
            'tool',
            tools.map(x => [x.id, x.name]),
            hasTools(s) ? 'smiths-tools' : 'woodcarvers-tools',
          )}`,
          fd => {
            const t = g.EquipmentData.items[String(fd.get('tool'))];
            if (!t) throw Error('Elegí unas herramientas.');
            commit('La herramienta adecuada: ' + t.name, x => {
              if (x.rightTool) x.inventory = x.inventory.filter(r => r.id !== x.rightTool);
              const id = uid();
              x.inventory.push({
                id,
                equipmentId: t.id,
                name: t.name,
                qty: 1,
                category: t.category,
                weight: t.weight ?? null,
                location: 'Con el personaje',
                notes: 'Creadas con La herramienta adecuada: desaparecen si volvés a usar el rasgo.',
              });
              x.rightTool = id;
            });
            toast(`${t.name} listas (tras 1 hora de trabajo).`);
          },
          'Crear',
        );
      },
    });
  }

  root.Cannon = {
    TYPES,
    SIZES,
    TOOLS,
    artillerist,
    info,
    list,
    hasTools,
    canMakeTools,
    freeLeft,
    create,
    remove,
    hurt,
    activate,
    shot,
    validate,
    card,
    install,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Cannon;
})(typeof window !== 'undefined' ? window : globalThis);
