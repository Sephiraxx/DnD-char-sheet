/* Acceso con email: guardar el acceso de este dispositivo y abrir las mismas fichas en otro. */
const AccountUI = (() => {
  'use strict';
  const esc = PartyView.esc;
  let rows = [];

  function card(kind) {
    setTimeout(() => fill(kind));
    const title = kind === 'restore' ? '¿Ya tenés una ficha en una mesa?' : 'Tu acceso';
    return `<section class="card account-card section-space" id="account-${kind}"><h2>${title}</h2><div class="account-body"><p class="small muted">Cargando…</p></div></section>`;
  }
  const emailForm = (mode, label, placeholder = 'tu@email.com') =>
    `<form class="account-form" data-account="${mode}"><label class="field">Email<input type="email" name="email" required maxlength="200" autocomplete="email" placeholder="${placeholder}"></label><div class="actions"><button class="button" type="submit">${label}</button></div><p class="form-error" role="alert"></p></form>`;

  function accountHtml(me) {
    if (!me) return '<p class="small muted">Todavía no te conectaste a una mesa desde este dispositivo.</p>';
    if (me.is_anonymous && me.new_email)
      return `<p>Te mandamos un correo a <b>${esc(me.new_email)}</b>. Tocá el enlace para confirmar tu acceso.</p><p class="small muted">¿No llegó? Revisá el correo no deseado o pedilo de nuevo.</p>${emailForm('link', 'Reenviar')}`;
    if (me.is_anonymous)
      return `<p>Tu acceso a la mesa vive solo en este navegador. Guardalo con tu email para abrir tus fichas y mesas en otro dispositivo, o recuperarlas si se borran los datos del navegador.</p>${emailForm('link', 'Guardar acceso')}`;
    return `<p>Acceso guardado: <b>${esc(me.email)}</b>.</p><p class="small">En otro dispositivo: abrí la aplicación, elegí «¿Ya tenés una ficha en una mesa?» y escribí este email.</p>`;
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
    return `<p>Escribí el email con el que guardaste tu acceso y te mandamos un enlace para entrar en este dispositivo. Abrilo acá mismo.</p>${emailForm('login', 'Enviarme el enlace')}`;
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
    const form = e.target.closest('form[data-account]');
    if (!form) return;
    e.preventDefault();
    const out = form.querySelector('.form-error'),
      btn = form.querySelector('button[type=submit]'),
      email = String(new FormData(form).get('email')).trim();
    btn.disabled = true;
    out.textContent = 'Enviando…';
    try {
      if (form.dataset.account === 'link') {
        await Cloud.linkEmail(email);
        refill();
      } else {
        await Cloud.sendLoginLink(email);
        form.outerHTML = `<p>Te mandamos un enlace a <b>${esc(email)}</b>. Abrilo en este dispositivo para entrar.</p>`;
      }
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
  addEventListener('cloud-login', e => {
    const msg = e.detail?.error
      ? 'No se pudo completar el ingreso: ' + e.detail.error
      : 'Listo: tu acceso está confirmado en este dispositivo.';
    const t = document.getElementById('toast');
    if (t) {
      t.textContent = msg;
      t.hidden = false;
      t.classList.add('visible');
      setTimeout(() => {
        t.classList.remove('visible');
        t.hidden = true;
      }, 5000);
    }
    refill();
  });
  return { card, refill };
})();
