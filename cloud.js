/* Mesa compartida con Supabase. Es opcional: sin configuración, todo sigue guardándose solo en el dispositivo. */
(function (root) {
  'use strict';
  const cfg = root.CLOUD_CONFIG || {};
  const enabled = Boolean(cfg.url && cfg.key);
  const DM_TABLES = 'dnd-cloud-dm-v1';
  // Órdenes que solo el DM puede publicar y que la app del jugador aplica a su ficha.
  const COMMANDS = ['damage', 'heal', 'temp', 'condition', 'rest', 'gold', 'item', 'level'];
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
      auth: { storageKey: 'dnd-cloud-auth', persistSession: true, autoRefreshToken: true },
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
  async function user() {
    const c = await api();
    const { data } = await c.auth.getSession();
    if (data.session) return data.session.user;
    // En desarrollo local no hay captcha: para probar, desactivalo temporalmente en Supabase.
    const local = location.hostname === 'localhost' || /^127\.\d+\.\d+\.\d+$/.test(location.hostname);
    const captchaToken = cfg.captchaSiteKey && !local ? await captcha() : undefined;
    const r = await c.auth.signInAnonymously(captchaToken ? { options: { captchaToken } } : undefined);
    if (r.error) throw friendly(r.error);
    return r.data.user;
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
  async function joinCampaign(code, display, key, state) {
    await user();
    const c = await api();
    const camp = check(await c.rpc('join_campaign', { p_code: code, p_display: display }));
    const row = check(
      await c
        .from('characters')
        .insert({ campaign_id: camp.id, name: state.name, data: state })
        .select('id, updated_at')
        .single(),
    );
    setLink(key, {
      campaignId: camp.id,
      campaignName: camp.name,
      code: camp.code,
      characterId: row.id,
      syncedAt: row.updated_at,
      dirty: false,
    });
    setStatus('synced');
    return camp;
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
      c.from('campaigns').select('id, name, code, dm_id').eq('id', campaignId).maybeSingle().then(check),
      c.from('members').select('user_id, role, display_name, joined_at').eq('campaign_id', campaignId).then(check),
      c
        .from('characters')
        .select('id, owner_id, name, data, updated_at')
        .eq('campaign_id', campaignId)
        .order('name')
        .then(check),
    ]);
    if (!campaign) throw Error('La mesa ya no existe o no formás parte de ella.');
    return { campaign, members, characters };
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
  async function removeCharacter(id) {
    check(await (await api()).from('characters').delete().eq('id', id));
  }
  async function deleteCampaign(id) {
    check(await (await api()).from('campaigns').delete().eq('id', id));
    forgetDmTable(id);
  }

  // Cambios en vivo de fichas, integrantes y eventos de la mesa.
  async function subscribe(campaignId, handler) {
    const c = await api();
    await user();
    const filter = 'campaign_id=eq.' + campaignId;
    const channel = c.channel('mesa-' + campaignId);
    for (const table of ['characters', 'events', 'members'])
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter }, p => handler(table, p));
    channel.subscribe();
    return () => c.removeChannel(channel);
  }

  root.Cloud = {
    enabled,
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
