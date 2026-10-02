/* Acceso con email y contraseña: guardar el acceso de este dispositivo y abrir las mismas fichas en otro.
   No se envían correos; si alguien olvida la contraseña, se la reinicia desde el panel de Supabase. */
const AccountUI = (() => {
  'use strict';
  const esc = PartyView.esc;
  let rows = [],
    clouds = [];
  const ago = iso => {
    if (!iso) return 'nunca';
    const min = Math.round((Date.now() - new Date(iso)) / 60000);
    return min < 1
      ? 'recién'
      : min < 60
        ? `hace ${min} min`
        : min < 1440
          ? `hace ${Math.round(min / 60)} h`
          : new Date(iso).toLocaleDateString('es-AR');
  };
  const localIds = () =>
    new Set(CharacterStorage.list().map(x => (x.key.startsWith('dnd-character-') ? x.key.slice(14) : 'darien')));
  // Copia en la nube: estado de este dispositivo y fichas que están en la nube pero no acá.
  function backupHtml(list, opening = false) {
    if (list === null)
      return '<div class="cloud-backup"><h3>Copia en la nube</h3><p class="small muted">Todavía no está disponible: falta actualizar la base de datos (migración 007).</p></div>';
    const here = localIds(),
      times = Cloud.backupTimes(),
      mine = CharacterStorage.list(),
      copied = mine.filter(x => times[x.key.startsWith('dnd-character-') ? x.key.slice(14) : 'darien']).length,
      // Las fichas de mesa ya se ofrecen arriba con «Traer a este dispositivo»: no se repiten como copia.
      tableNames = new Set((rows || []).map(r => r.name)),
      away = list.filter(r => !here.has(r.local_id) && !tableNames.has(r.name));
    const last = Object.values(times).sort().at(-1);
    return `<div class="cloud-backup"><h3>Copia en la nube</h3>${
      opening
        ? ''
        : `<p class="small">Cada cambio de tus fichas se copia solo a tu cuenta, también las que no están en una mesa. ${mine.length ? `Este dispositivo: <b>${copied} de ${mine.length}</b> ficha(s) copiada(s) · última copia ${ago(last)}.` : 'Este dispositivo todavía no tiene fichas.'}</p><div class="actions"><button type="button" class="button secondary" data-backup="now">Copiar ahora</button></div>`
    }${
      away.length
        ? `<p class="small section-space">${opening ? 'Fichas guardadas en tu cuenta:' : 'En la nube, pero no en este dispositivo:'}</p><div class="party-list">${away
            .map(
              r =>
                `<div class="list-row"><div><b>${esc(r.name || 'Sin nombre')}</b><p class="small muted">Copia ${esc(ago(r.updated_at))}</p></div><div class="actions"><button type="button" class="button" data-backup-restore="${esc(r.local_id)}">${opening ? 'Abrir' : 'Traer'}</button>${opening ? '' : `<button type="button" class="button secondary" data-backup-delete="${esc(r.local_id)}" data-name="${esc(r.name)}">Borrar</button>`}</div></div>`,
            )
            .join('')}</div>`
        : ''
    }</div>`;
  }

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
      }${clouds === null || clouds.length || CharacterStorage.list().length ? backupHtml(clouds) : ''}<p class="small section-space"><a href="./dm.html">Pantalla del DM</a>: tus mesas aparecen ahí.</p>`;
    }
    return loginBlock('Entrá con el email y la contraseña con los que guardaste tu acceso.');
  }

  async function fill(kind) {
    const box = document.querySelector(`#account-${kind} .account-body`);
    if (!box) return;
    try {
      let me = await Cloud.currentUser();
      // Un juntado que quedó a medias (se cortó la conexión después de entrar): se termina solo.
      if (me && !me.is_anonymous && Cloud.mergePending()) {
        await Cloud.finishMerge().catch(() => {});
        me = await Cloud.currentUser();
      }
      clouds = me ? await Cloud.backups().catch(() => null) : [];
      box.innerHTML = kind === 'restore' ? await restoreHtml(me) : accountHtml(me) + (me ? backupHtml(clouds) : '');
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
      if (err.code === 'merge') offerMerge(f, email, password);
    }
  });
  // El email ya tiene una cuenta (o se quiere entrar con fichas sin guardar): juntar las dos.
  function offerMerge(f, email, password) {
    f.parentElement.querySelector('.account-merge')?.remove();
    const box = document.createElement('div');
    box.className = 'banner account-merge';
    box.innerHTML = `<div><p><b>Ya tenés un acceso con ${esc(email)}.</b> ¿Juntar las fichas y mesas de este dispositivo con esa cuenta? Después abrís todo con ese email, en cualquier dispositivo. Nada se borra.</p><label class="field">Contraseña de esa cuenta<input type="password" autocomplete="current-password" maxlength="72"></label><div class="actions"><button type="button" class="button" data-merge-go>Juntar con mi cuenta</button><button type="button" class="button secondary" data-merge-cancel>Cancelar</button></div><p class="form-error" role="alert"></p></div>`;
    const pass = box.querySelector('input');
    pass.value = password;
    f.after(box);
    box.querySelector('[data-merge-cancel]').onclick = () => box.remove();
    box.querySelector('[data-merge-go]').onclick = async e => {
      const out = box.querySelector('.form-error');
      e.target.disabled = true;
      out.textContent = 'Juntando…';
      try {
        const moved = await Cloud.mergeInto(email, pass.value);
        const parts = [
          moved?.characters ? moved.characters + ' ficha(s)' : '',
          moved?.tables ? moved.tables + ' mesa(s) nueva(s)' : '',
          moved?.dm ? moved.dm + ' mesa(s) como DM' : '',
          moved?.backups ? moved.backups + ' copia(s) en la nube' : '',
        ].filter(Boolean);
        const msg = `Listo: ahora entrás con ${email}.${parts.length ? ' Se sumaron ' + parts.join(', ') + ' de este dispositivo.' : ''}`;
        box.remove();
        refill();
        if (typeof toast === 'function') toast(msg);
      } catch (err) {
        out.textContent = err.message;
        e.target.disabled = false;
      }
    };
  }
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-backup], [data-backup-restore], [data-backup-delete]');
    if (!t) return;
    const box = t.closest('.cloud-backup');
    t.disabled = true;
    try {
      if (t.dataset.backup === 'now') {
        const n = await Cloud.backupAll();
        if (typeof toast === 'function') toast(`Copia en la nube: ${n} ficha(s) actualizada(s).`);
        refill();
      } else if (t.dataset.backupRestore) {
        const id = await Cloud.restoreBackup(t.dataset.backupRestore);
        CharacterStorage.activate(id);
      } else if (t.dataset.backupDelete) {
        if (
          !confirm(`¿Borrar de la nube la copia de «${t.dataset.name || 'esta ficha'}»? No está en este dispositivo.`)
        ) {
          t.disabled = false;
          return;
        }
        await Cloud.deleteBackup(t.dataset.backupDelete);
        refill();
      }
    } catch (err) {
      t.disabled = false;
      const p = document.createElement('p');
      p.className = 'form-error';
      p.textContent = err.message;
      box?.append(p);
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
  addEventListener('cloud-backup', () => document.querySelector('#account-account .cloud-backup') && refill());
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
