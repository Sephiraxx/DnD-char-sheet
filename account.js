/* Acceso con email y contraseña: guardar el acceso de este dispositivo y abrir las mismas fichas en otro.
   No se envían correos; si alguien olvida la contraseña, se la reinicia desde el panel de Supabase. */
const AccountUI = (() => {
  'use strict';
  const esc = PartyView.esc;
  let rows = [];

  function card(kind) {
    setTimeout(() => fill(kind));
    const title = kind === 'restore' ? '¿Ya tenés una ficha en una mesa?' : 'Tu acceso';
    return `<section class="card account-card section-space" id="account-${kind}"><h2>${title}</h2><div class="account-body"><p class="small muted">Cargando…</p></div></section>`;
  }
  const form = (mode, label, { newPassword = false } = {}) =>
    `<form class="account-form" data-account="${mode}"><div class="form-grid">${mode === 'password' ? '' : `<label class="field">Email<input type="email" name="email" required maxlength="200" autocomplete="email" placeholder="tu@email.com"></label>`}<label class="field">Contraseña<input type="password" name="password" required minlength="6" maxlength="72" autocomplete="${newPassword ? 'new-password' : 'current-password'}"></label></div><div class="actions"><button class="button" type="submit">${label}</button></div><p class="form-error" role="alert"></p></form>`;
  const loginBlock = intro =>
    `<p>${intro}</p>${form('login', 'Entrar')}<p class="small muted">Si no te acordás de la contraseña, pedile a quien administra la mesa que la reinicie.</p>`;

  function accountHtml(me) {
    if (!me)
      return loginBlock(
        'Todavía no te conectaste a una mesa desde este dispositivo. Si ya guardaste tu acceso en otro, entrá con tu email y contraseña.',
      );
    if (me.is_anonymous)
      return `<p>Tu acceso a la mesa vive solo en este navegador. Guardalo con un email y una contraseña para abrir tus fichas y mesas en otro dispositivo, o recuperarlas si se borran los datos del navegador. No te llega ningún correo.</p>${form('link', 'Guardar acceso', { newPassword: true })}<details class="battle-rule"><summary>Ya guardé mi acceso en otro dispositivo</summary>${loginBlock('Entrá con ese email y contraseña.')}</details>`;
    return `<p>Acceso guardado: <b>${esc(me.email)}</b>.</p><p class="small">En otro dispositivo: abrí la aplicación, buscá «¿Ya tenés una ficha en una mesa?» (o «Tu acceso» en la pantalla del DM) y entrá con este email y tu contraseña.</p><details class="battle-rule"><summary>Cambiar contraseña</summary>${form('password', 'Cambiar', { newPassword: true })}</details>`;
  }
  async function restoreHtml(me) {
    if (me && !me.is_anonymous) {
      rows = await Cloud.myCharacters();
      const local = new Set(
        CharacterStorage.list()
          .map(x => Cloud.link(x.key)?.characterId)
          .filter(Boolean),
      );
      return `<p class="small">Entraste como <b>${esc(me.email)}</b>.</p>${
        rows.length
          ? `<div class="party-list">${rows
              .map(
                r =>
                  `<div class="list-row"><div><b>${esc(r.name)}</b><p class="small muted">${esc(r.campaigns?.name || 'Mesa')}</p></div><button type="button" class="button ${local.has(r.id) ? 'secondary' : ''}" data-account-restore="${esc(r.id)}">${local.has(r.id) ? 'Abrir' : 'Traer a este dispositivo'}</button></div>`,
              )
              .join('')}</div>`
          : '<p class="muted">No tenés fichas en ninguna mesa con este acceso.</p>'
      }<p class="small section-space"><a href="./dm.html">Pantalla del DM</a>: tus mesas aparecen ahí.</p>`;
    }
    return loginBlock('Entrá con el email y la contraseña con los que guardaste tu acceso.');
  }

  async function fill(kind) {
    const box = document.querySelector(`#account-${kind} .account-body`);
    if (!box) return;
    try {
      const me = await Cloud.currentUser();
      box.innerHTML = kind === 'restore' ? await restoreHtml(me) : accountHtml(me);
    } catch (e) {
      box.innerHTML = `<p class="small muted">${esc(e.message)}</p>`;
    }
  }
  const refill = () => ['account', 'restore'].forEach(k => document.getElementById('account-' + k) && fill(k));

  document.addEventListener('submit', async e => {
    const f = e.target.closest('form[data-account]');
    if (!f) return;
    e.preventDefault();
    const out = f.querySelector('.form-error'),
      btn = f.querySelector('button[type=submit]'),
      fd = new FormData(f),
      email = String(fd.get('email') || '').trim(),
      password = String(fd.get('password') || '');
    btn.disabled = true;
    out.textContent = 'Un momento…';
    try {
      if (f.dataset.account === 'link') await Cloud.linkEmail(email, password);
      else if (f.dataset.account === 'login') await Cloud.signIn(email, password);
      else {
        await Cloud.changePassword(password);
        out.textContent = 'Contraseña cambiada.';
        btn.disabled = false;
        return;
      }
      refill();
    } catch (err) {
      out.textContent = err.message;
      btn.disabled = false;
    }
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-account-restore]');
    if (!b) return;
    const row = rows.find(r => r.id === b.dataset.accountRestore);
    if (!row) return;
    try {
      CharacterStorage.activate(Cloud.restore(row));
    } catch (err) {
      b.textContent = err.message;
    }
  });
  // Al volver de un enlace viejo por correo, o al entrar/guardar desde otra tarjeta.
  addEventListener('cloud-login', e => {
    if (e.detail?.error) {
      const t = document.getElementById('toast');
      if (t) {
        t.textContent = 'No se pudo completar el ingreso: ' + e.detail.error;
        t.hidden = false;
        t.classList.add('visible');
        setTimeout(() => {
          t.classList.remove('visible');
          t.hidden = true;
        }, 5000);
      }
    }
    refill();
  });
  return { card, refill };
})();
