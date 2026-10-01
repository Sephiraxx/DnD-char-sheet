/* Mesa compartida con Supabase. Es opcional: sin configuración, todo sigue guardándose solo en el dispositivo. */
(function (root) {
  'use strict';
  const cfg = root.CLOUD_CONFIG || {};
  const enabled = Boolean(cfg.url && cfg.key);
  const DM_TABLES = 'dnd-cloud-dm-v1';
  // Órdenes que solo el DM puede publicar y que la app del jugador aplica a su ficha.
  const COMMANDS = [
    'damage',
    'heal',
    'temp',
    'condition',
    'rest',
    'gold',
    'item',
    'level',
    'inspiration',
    'bonus-die',
    'effect',
    'gold-remove',
  ];
  let client = null,
    loading = null,
    timer = null,
    pending = null,
    status = 'idle';
  const listeners = new Set();

  function loadSdk() {
    if (root.supabase) return Promise.resolve();
    return (loading ||= new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = './vendor/supabase.js';
      s.onload = ok;
      s.onerror = () => {
        loading = null;
        fail(Error('No se pudo conectar con la mesa. Revisá tu conexión.'));
      };
      document.head.append(s);
    }));
  }
  function friendly(e) {
    const msg = String(e?.message || e || '');
    if (/fetch|network|Failed to/i.test(msg))
      return Error('Sin conexión con la mesa. Se reintentará al volver la conexión.');
    if (/Anonymous sign-ins are disabled/i.test(msg))
      return Error('La mesa no permite ingresos anónimos. Activalos en Supabase → Authentication → Providers.');
    if (/captcha/i.test(msg)) return Error('Falló la verificación anti-bots. Recargá la página y volvé a intentar.');
    return Error(msg || 'No se pudo completar la operación en la mesa.');
  }
  const check = ({ data, error }) => {
    if (error) throw friendly(error);
    return data;
  };
  async function api() {
    if (!enabled) throw Error('La mesa compartida no está configurada en esta copia de la aplicación.');
    await loadSdk();
    client ||= root.supabase.createClient(cfg.url, cfg.key, {
      auth: {
        storageKey: 'dnd-cloud-auth',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
    });
    return client;
  }
  // Verificación anti-bots (Cloudflare Turnstile), solo la primera vez que el navegador se conecta.
  function captcha() {
    return new Promise((resolve, reject) => {
      const box = document.createElement('div');
      box.className = 'captcha-box';
      box.innerHTML = '<p>Verificando que no sos un bot…</p><div></div>';
      document.body.append(box);
      const done = fn => v => {
        box.remove();
        fn(v);
      };
      const draw = () =>
        root.turnstile.render(box.lastChild, {
          sitekey: cfg.captchaSiteKey,
          callback: done(resolve),
          'error-callback': done(() => reject(Error('No se pudo completar la verificación anti-bots. Reintentá.'))),
        });
      if (root.turnstile) return draw();
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.onload = draw;
      s.onerror = done(() => reject(Error('No se pudo cargar la verificación anti-bots. Revisá tu conexión.')));
      document.head.append(s);
    });
  }
  // En desarrollo local no hay captcha: para probar, desactivalo temporalmente en Supabase.
  const isLocal = () => location.hostname === 'localhost' || /^127\.\d+\.\d+\.\d+$/.test(location.hostname);
  async function user() {
    const c = await api();
    const { data } = await c.auth.getSession();
    if (data.session) return data.session.user;
    const captchaToken = cfg.captchaSiteKey && !isLocal() ? await captcha() : undefined;
    const r = await c.auth.signInAnonymously(captchaToken ? { options: { captchaToken } } : undefined);
    if (r.error) throw friendly(r.error);
    return r.data.user;
  }

  // ---------- Acceso con email (la misma ficha en varios dispositivos) ----------
  // Usuario actual, sin crear uno anónimo.
  async function currentUser() {
    if (!enabled) return null;
    const { data } = await (await api()).auth.getSession();
    return data.session?.user || null;
  }
  const returnUrl = () => location.origin + location.pathname;
  function hasLocalCloudData() {
    if (dmTables().length) return true;
    for (let i = 0; i < localStorage.length; i++) if (/-cloud$/.test(localStorage.key(i))) return true;
    return false;
  }
  // Guarda el acceso de este dispositivo con email y contraseña. No se envían correos
  // (en Supabase, «Confirm email» tiene que estar desactivado).
  async function linkEmail(email, password) {
    await user();
    const r = await (await api()).auth.updateUser({ email, password });
    if (r.error)
      throw /already.*registered|already been registered|exists/i.test(r.error.message)
        ? Error('Ese email ya tiene un acceso. Usá «Entrar» con su contraseña.')
        : friendly(r.error);
    if (r.data.user?.new_email && !r.data.user?.email)
      throw Error('El servidor todavía pide confirmar el email por correo. Avisale a quien administra la mesa.');
    dispatchEvent(new CustomEvent('cloud-login', { detail: { error: '' } }));
    return r.data.user;
  }
  async function changePassword(password) {
    const r = await (await api()).auth.updateUser({ password });
    if (r.error) throw friendly(r.error);
  }
  // En otro dispositivo: entrar con el email y la contraseña guardados.
  async function signIn(email, password) {
    const me = await currentUser();
    if (me?.is_anonymous && hasLocalCloudData())
      throw Error(
        'Este dispositivo ya tiene fichas o mesas con un acceso sin email. Guardá ese acceso con tu email (Tu acceso) en vez de entrar con otro.',
      );
    const captchaToken = cfg.captchaSiteKey && !isLocal() ? await captcha() : undefined;
    const r = await (
      await api()
    ).auth.signInWithPassword({
      email,
      password,
      ...(captchaToken ? { options: { captchaToken } } : {}),
    });
    if (r.error)
      throw /invalid login|credentials/i.test(r.error.message)
        ? Error('Email o contraseña incorrectos.')
        : friendly(r.error);
    dispatchEvent(new CustomEvent('cloud-login', { detail: { error: '' } }));
  }
  // Fichas de este usuario en cualquier mesa, para traerlas a este dispositivo.
  async function myCharacters() {
    const me = await currentUser();
    if (!me) return [];
    return check(
      await (
        await api()
      )
        .from('characters')
        .select('id, name, data, updated_at, campaign_id, campaigns(name, code)')
        .eq('owner_id', me.id)
        .order('name'),
    );
  }
  async function myDmTables() {
    const me = await currentUser();
    if (!me) return [];
    const rows = check(await (await api()).from('campaigns').select('id, name, code').eq('dm_id', me.id));
    rows.forEach(rememberDmTable);
    return rows;
  }
  // Guarda una ficha de la mesa en este dispositivo (vinculada) y devuelve su id local.
  function restore(row) {
    for (const x of root.CharacterStorage.list()) if (link(x.key)?.characterId === row.id) return x.id;
    const id = root.CharacterStorage.add(row.data),
      key = 'dnd-character-' + id;
    setLink(key, {
      campaignId: row.campaign_id,
      campaignName: row.campaigns?.name || 'Mesa',
      code: row.campaigns?.code || '',
      characterId: row.id,
      syncedAt: row.updated_at,
      dirty: false,
    });
    return id;
  }
  // Al volver desde el enlace del correo, Supabase deja la sesión en la URL: se toma y se limpia la dirección.
  if (enabled && typeof location !== 'undefined' && /access_token=|error_description=/.test(location.hash)) {
    const err = /error_description=([^&]+)/.exec(location.hash)?.[1];
    api()
      .then(c => c.auth.getSession())
      .catch(() => {})
      .finally(() => {
        history.replaceState(null, '', location.pathname + location.search);
        const detail = { error: err ? decodeURIComponent(err.replace(/\+/g, ' ')) : '' };
        dispatchEvent(new CustomEvent('cloud-login', { detail }));
      });
  }

  // Vínculo local entre una ficha del dispositivo y su copia en la mesa.
  const linkKey = key => key + '-cloud';
  function link(key) {
    try {
      return key ? JSON.parse(localStorage.getItem(linkKey(key)) || 'null') : null;
    } catch {
      return null;
    }
  }
  function setLink(key, value) {
    if (value) localStorage.setItem(linkKey(key), JSON.stringify(value));
    else localStorage.removeItem(linkKey(key));
  }

  function setStatus(next) {
    status = next;
    listeners.forEach(fn => fn(status));
  }
  function onStatus(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  // Mesas creadas o dirigidas desde este dispositivo.
  function dmTables() {
    try {
      const list = JSON.parse(localStorage.getItem(DM_TABLES) || '[]');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
  function rememberDmTable(c) {
    const list = dmTables().filter(x => x.id !== c.id);
    localStorage.setItem(DM_TABLES, JSON.stringify([{ id: c.id, name: c.name, code: c.code }, ...list].slice(0, 20)));
  }
  function forgetDmTable(id) {
    localStorage.setItem(DM_TABLES, JSON.stringify(dmTables().filter(x => x.id !== id)));
  }

  async function createCampaign(name, display) {
    await user();
    const c = check(await (await api()).rpc('create_campaign', { p_name: name, p_display: display }));
    rememberDmTable(c);
    return c;
  }
  // ---------- Ajustes de la mesa (los elige el DM) ----------
  const PENDING = 'dnd-pending-table-v1';
  function cleanSettings(x) {
    const known = Object.keys(root.CampaignData?.sources || {});
    const sources = Array.isArray(x?.sources) ? x.sources.filter(k => known.includes(k)) : [];
    const level = Number(x?.startLevel);
    return {
      sources: !sources.length
        ? (root.CampaignData?.defaults || []).slice()
        : sources.includes('PHB')
          ? sources
          : ['PHB', ...sources],
      startLevel: Number.isInteger(level) && level >= 1 && level <= 20 ? level : 1,
      rules: typeof x?.rules === 'string' ? x.rules.slice(0, 2000) : '',
    };
  }
  async function updateSettings(id, settings) {
    const clean = cleanSettings(settings);
    const rows = check(await (await api()).from('campaigns').update({ settings: clean }).eq('id', id).select('id'));
    if (!rows.length) throw Error('Solo el DM de la mesa puede cambiar sus ajustes.');
    return clean;
  }
  // Unirse sin ficha: la mesa queda pendiente hasta crear el personaje.
  async function joinOnly(code, display) {
    await user();
    const camp = check(await (await api()).rpc('join_campaign', { p_code: code, p_display: display }));
    const pending = { campaignId: camp.id, name: camp.name, code: camp.code, settings: cleanSettings(camp.settings) };
    localStorage.setItem(PENDING, JSON.stringify(pending));
    return pending;
  }
  function pendingTable() {
    try {
      return JSON.parse(localStorage.getItem(PENDING) || 'null');
    } catch {
      return null;
    }
  }
  function clearPending() {
    localStorage.removeItem(PENDING);
  }
  async function joinCampaign(code, display, key, state) {
    await user();
    const c = await api();
    const camp = check(await c.rpc('join_campaign', { p_code: code, p_display: display }));
    return attach(key, state, camp);
  }
  // Sube la ficha a una mesa a la que ya se unió este acceso y la vincula.
  async function attach(key, state, camp) {
    const c = await api();
    const row = check(
      await c
        .from('characters')
        .insert({ campaign_id: camp.id || camp.campaignId, name: state.name, data: state })
        .select('id, updated_at')
        .single(),
    );
    setLink(key, {
      campaignId: camp.id || camp.campaignId,
      campaignName: camp.name,
      code: camp.code,
      characterId: row.id,
      syncedAt: row.updated_at,
      dirty: false,
    });
    setStatus('synced');
    return { ...camp, settings: cleanSettings(camp.settings) };
  }
  async function leave(key) {
    const l = link(key);
    if (!l) return;
    const c = await api(),
      me = await user();
    check(await c.from('characters').delete().eq('id', l.characterId));
    const others = check(await c.from('characters').select('id').eq('campaign_id', l.campaignId).eq('owner_id', me.id));
    if (!others.length) check(await c.from('members').delete().eq('campaign_id', l.campaignId).eq('user_id', me.id));
    setLink(key, null);
    setStatus('idle');
  }

  // Subida diferida de la ficha después de cada cambio guardado.
  function changed(key, state) {
    const l = link(key);
    if (!l) return;
    if (!l.dirty) setLink(key, { ...l, dirty: true });
    pending = { key, state };
    setStatus('pending');
    clearTimeout(timer);
    timer = setTimeout(flush, 1200);
  }
  async function flush() {
    clearTimeout(timer);
    if (!pending) return;
    const { key, state } = pending;
    pending = null;
    const l = link(key);
    if (!l) return;
    try {
      setStatus('syncing');
      const row = check(
        await (
          await api()
        )
          .from('characters')
          .update({ name: state.name, data: state })
          .eq('id', l.characterId)
          .select('updated_at')
          .maybeSingle(),
      );
      if (!row) {
        setLink(key, null);
        setStatus('removed');
        return;
      }
      if (!pending) setLink(key, { ...link(key), syncedAt: row.updated_at, dirty: false });
      setStatus(pending ? 'pending' : 'synced');
    } catch (e) {
      pending ||= { key, state };
      setStatus('offline');
    }
  }
  if (typeof addEventListener === 'function') addEventListener('online', () => pending && flush());

  // Al abrir la ficha: decide si bajar la versión de la mesa, subir la local o preguntar.
  async function reconcile(key) {
    const l = link(key);
    if (!l) return { action: 'none' };
    const row = check(
      await (await api()).from('characters').select('data, updated_at').eq('id', l.characterId).maybeSingle(),
    );
    if (!row) {
      setLink(key, null);
      return { action: 'removed', link: l };
    }
    const remoteNewer = new Date(row.updated_at) > new Date(l.syncedAt);
    if (remoteNewer && l.dirty) return { action: 'conflict', remote: row.data, updatedAt: row.updated_at };
    if (remoteNewer) return { action: 'pull', remote: row.data, updatedAt: row.updated_at };
    return { action: l.dirty ? 'push' : 'none' };
  }
  function acceptRemote(key, updatedAt) {
    clearTimeout(timer);
    pending = null;
    const l = link(key);
    if (l) setLink(key, { ...l, syncedAt: updatedAt, dirty: false });
    setStatus('synced');
  }

  async function party(campaignId) {
    const c = await api();
    await user();
    const [campaign, members, characters] = await Promise.all([
      c.from('campaigns').select('id, name, code, dm_id, settings').eq('id', campaignId).maybeSingle().then(check),
      c.from('members').select('user_id, role, display_name, joined_at').eq('campaign_id', campaignId).then(check),
      c
        .from('characters')
        .select('id, owner_id, name, data, updated_at')
        .eq('campaign_id', campaignId)
        .order('name')
        .then(check),
    ]);
    if (!campaign) throw Error('La mesa ya no existe o no formás parte de ella.');
    // Botín y homebrew son opcionales: si la migración 003 no se aplicó, la mesa sigue funcionando.
    const rows = (table, order) =>
      c
        .from(table)
        .select('*')
        .eq('campaign_id', campaignId)
        .order(order)
        .then(r => r.data || []);
    // Combate compartido (migración 004): los jugadores no reciben combatant_secrets (RLS).
    const [loot, homebrew, combatants, secrets, encounter] = await Promise.all([
      rows('loot', 'created_at'),
      rows('homebrew', 'name'),
      rows('combatants', 'created_at'),
      c
        .from('combatant_secrets')
        .select('*')
        .eq('campaign_id', campaignId)
        .then(r => r.data || []),
      c
        .from('encounters')
        .select('*')
        .eq('campaign_id', campaignId)
        .maybeSingle()
        .then(r => r.data || null),
    ]);
    return { campaign, members, characters, loot, homebrew, combatants, secrets, encounter };
  }
  async function events(campaignId, limit = 60) {
    return check(
      await (
        await api()
      )
        .from('events')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('id', { ascending: false })
        .limit(limit),
    );
  }
  async function post(campaignId, kind, payload = {}, { target = null, visibility = 'all' } = {}) {
    const me = await user();
    return check(
      await (
        await api()
      )
        .from('events')
        .insert({ campaign_id: campaignId, author_id: me.id, kind, payload, target_character: target, visibility })
        .select()
        .single(),
    );
  }
  // Órdenes del DM que esta ficha todavía no aplicó (por ejemplo, si estaba sin conexión).
  async function pendingCommands(characterId) {
    return check(
      await (
        await api()
      )
        .from('events')
        .select('*')
        .eq('target_character', characterId)
        .is('applied_at', null)
        .in('kind', COMMANDS)
        .order('id'),
    );
  }
  async function markApplied(ids) {
    if (!ids.length) return;
    check(await (await api()).from('events').update({ applied_at: new Date().toISOString() }).in('id', ids));
  }
  // ---------- Combate compartido ----------
  // Orden de iniciativa igual al del servidor (advance_turn).
  const order = list =>
    [...list].sort(
      (a, b) =>
        (b.init ?? -999) - (a.init ?? -999) ||
        b.tiebreak - a.tiebreak ||
        String(a.created_at).localeCompare(b.created_at),
    );
  async function addCombatant(campaignId, row, secret = null) {
    const c = await api();
    const added = check(
      await c
        .from('combatants')
        .insert({ campaign_id: campaignId, ...row })
        .select()
        .single(),
    );
    if (secret)
      check(await c.from('combatant_secrets').insert({ combatant_id: added.id, campaign_id: campaignId, ...secret }));
    return added;
  }
  async function updateCombatant(id, patch) {
    check(await (await api()).from('combatants').update(patch).eq('id', id));
  }
  async function updateSecret(id, patch) {
    check(await (await api()).from('combatant_secrets').update(patch).eq('combatant_id', id));
  }
  async function removeCombatant(id) {
    check(await (await api()).from('combatants').delete().eq('id', id));
  }
  async function advanceTurn(campaignId) {
    return check(await (await api()).rpc('advance_turn', { p_campaign: campaignId }));
  }
  async function endCombat(campaignId) {
    check(await (await api()).rpc('end_combat', { p_campaign: campaignId }));
  }
  async function resolveAttack(target, total, natural, label, attacker) {
    return check(
      await (
        await api()
      ).rpc('resolve_attack', {
        p_target: target,
        p_total: total,
        p_natural: natural,
        p_label: label,
        p_attacker: attacker,
      }),
    );
  }
  async function damageCombatant(target, amount, label, attacker) {
    return check(
      await (
        await api()
      ).rpc('damage_combatant', { p_target: target, p_amount: amount, p_label: label, p_attacker: attacker }),
    );
  }

  // ---------- Botín de la party ----------
  async function addLoot(campaignId, item) {
    return check(
      await (
        await api()
      )
        .from('loot')
        .insert({ campaign_id: campaignId, ...item })
        .select()
        .single(),
    );
  }
  async function removeLoot(id) {
    check(await (await api()).from('loot').delete().eq('id', id));
  }
  // Reclamar un objeto libre: solo uno puede ganarlo.
  async function claimLoot(id, characterId, name) {
    const rows = check(
      await (
        await api()
      )
        .from('loot')
        .update({ claimed_character: characterId, claimed_name: name })
        .eq('id', id)
        .is('claimed_character', null)
        .select(),
    );
    if (!rows.length) throw Error('Alguien lo tomó primero.');
    return rows[0];
  }
  // ---------- Homebrew de la mesa ----------
  async function saveHomebrew(campaignId, entry, id = null) {
    const c = await api();
    const row = { campaign_id: campaignId, kind: entry.kind, name: entry.name, data: entry.data || {} };
    return check(
      await (id ? c.from('homebrew').update(row).eq('id', id) : c.from('homebrew').insert(row)).select().single(),
    );
  }
  async function removeHomebrew(id) {
    check(await (await api()).from('homebrew').delete().eq('id', id));
  }
  async function removeCharacter(id) {
    check(await (await api()).from('characters').delete().eq('id', id));
  }
  async function deleteCampaign(id) {
    const gone = check(await (await api()).from('campaigns').delete().eq('id', id).select('id'));
    if (!gone.length) throw Error('No se pudo eliminar: solo el DM que creó la mesa puede hacerlo, desde su acceso.');
    forgetDmTable(id);
  }

  // Cambios en vivo de fichas, integrantes y eventos de la mesa.
  // `presence`: datos para mostrar quién tiene la aplicación abierta (por ejemplo { characterId } o { role: 'dm' }).
  async function subscribe(campaignId, handler, presence = null) {
    const c = await api();
    await user();
    const filter = 'campaign_id=eq.' + campaignId;
    const channel = c.channel('mesa-' + campaignId);
    for (const table of [
      'characters',
      'events',
      'members',
      'loot',
      'homebrew',
      'encounters',
      'combatants',
      'combatant_secrets',
    ])
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter }, p => handler(table, p));
    channel.on('presence', { event: 'sync' }, () => handler('presence', Object.values(channel.presenceState()).flat()));
    channel.subscribe(status => {
      if (status === 'SUBSCRIBED' && presence) channel.track(presence);
    });
    return () => c.removeChannel(channel);
  }

  root.Cloud = {
    enabled,
    order,
    addCombatant,
    updateCombatant,
    updateSecret,
    removeCombatant,
    advanceTurn,
    endCombat,
    resolveAttack,
    damageCombatant,
    addLoot,
    removeLoot,
    claimLoot,
    saveHomebrew,
    removeHomebrew,
    cleanSettings,
    updateSettings,
    joinOnly,
    pendingTable,
    clearPending,
    attach,
    currentUser,
    linkEmail,
    changePassword,
    signIn,
    myCharacters,
    myDmTables,
    restore,
    COMMANDS,
    user,
    link,
    setLink,
    status: () => status,
    onStatus,
    dmTables,
    rememberDmTable,
    forgetDmTable,
    createCampaign,
    joinCampaign,
    leave,
    changed,
    flush,
    reconcile,
    acceptRemote,
    party,
    events,
    post,
    pendingCommands,
    markApplied,
    removeCharacter,
    deleteCampaign,
    subscribe,
  };
})(typeof window !== 'undefined' ? window : globalThis);
