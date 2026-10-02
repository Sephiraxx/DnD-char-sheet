/* Retratos locales: la imagen viaja dentro de la ficha exportada. */
const Portrait = (() => {
  'use strict';
  const LIMIT = 160000;
  function valid(p) {
    return (
      !!p &&
      typeof p.data === 'string' &&
      p.data.length <= LIMIT &&
      /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(p.data) &&
      Number.isInteger(p.position) &&
      p.position >= 0 &&
      p.position <= 100
    );
  }
  function source(s) {
    if (valid(s?.portrait)) return s.portrait.data;
    return s && s.legacyPortrait && s.portrait === undefined ? './assets/darien.webp' : '';
  }
  function position(s) {
    return valid(s?.portrait) ? s.portrait.position : 12;
  }
  function thumb(s, cls = 'character-thumb') {
    const src = source(s);
    return src
      ? `<img class="${cls}" src="${esc(src)}" alt="Retrato de ${esc(s.name)}" style="object-position:50% ${position(s)}%">`
      : `<span class="${cls} portrait-placeholder" aria-hidden="true">${esc((s?.name || '?').trim().slice(0, 1).toUpperCase())}</span>`;
  }
  function savedThumb(key, name) {
    try {
      return thumb(JSON.parse(localStorage.getItem(key)) || { name, classId: 'unknown' });
    } catch {
      return thumb({ name, classId: 'unknown' });
    }
  }
  function decorate(s) {
    const pic = document.querySelector('.portrait');
    if (!pic) return;
    pic.hidden = false;
    const img = pic.querySelector('img'),
      src = source(s);
    if (src) {
      img.src = src;
      img.alt = 'Retrato de ' + s.name;
      img.style.objectPosition = '50% ' + position(s) + '%';
    } else img.removeAttribute('src');
    pic.classList.toggle('custom-portrait', !src);
    pic.querySelector('span').textContent = s.name;
  }
  function card(s) {
    return `<section class="card character-photo-card">${thumb(s, 'character-photo')}<div><p class="eyebrow">RETRATO DEL PERSONAJE</p><h2>${esc(s.name)}</h2><p class="small">Tu foto se guarda con esta ficha y se incluye al exportarla.</p>${button(source(s) ? 'Cambiar foto' : 'Agregar foto', 'portrait-edit')}</div></section>`;
  }
  async function encode(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
      throw Error('Elegí una imagen JPG, PNG o WebP.');
    if (file.size > 10 * 1024 * 1024) throw Error('La imagen debe pesar hasta 10 MB.');
    const url = URL.createObjectURL(file),
      img = new Image();
    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(Error('No se pudo leer la imagen. Probá con otro archivo.'));
        img.src = url;
      });
      if (!img.naturalWidth || !img.naturalHeight) throw Error('La imagen está vacía.');
      const ratio = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight)),
        canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#13252b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.7, 0.55, 0.4]) {
        const data = canvas.toDataURL('image/jpeg', quality);
        if (data.length <= LIMIT) return data;
      }
      throw Error('La imagen sigue siendo demasiado pesada. Probá recortarla antes de subirla.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  function edit() {
    let draft = valid(state.portrait) ? { ...state.portrait } : null,
      removed = false,
      busy = false,
      ticket = 0;
    const owner = KEY;
    modal(
      'Foto de ' + state.name,
      `<div id="portrait-preview" class="portrait-preview"></div><label class="field">Elegir imagen<input id="portrait-file" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="small">JPG, PNG o WebP, hasta 10 MB. La foto se reduce para guardarla con tu ficha.</p><label class="field">Encuadre vertical<input id="portrait-position" type="range" min="0" max="100" value="${draft?.position ?? 50}"></label><p id="portrait-status" class="small" role="status"></p><button type="button" class="button secondary" id="portrait-remove">Quitar foto</button>`,
      () => {
        if (busy) throw Error('Esperá a que termine de cargar la imagen.');
        if (KEY !== owner) throw Error('Cambió el personaje abierto. Volvé a abrir el editor de foto.');
        if (!draft && !removed) return;
        commit(
          draft ? 'Foto del personaje actualizada' : 'Foto del personaje eliminada',
          s => (s.portrait = draft ? { ...draft } : null),
          true,
        );
      },
    );
    const form = document.getElementById('dialog-form'),
      preview = form.querySelector('#portrait-preview'),
      file = form.querySelector('#portrait-file'),
      slider = form.querySelector('#portrait-position'),
      status = form.querySelector('#portrait-status'),
      remove = form.querySelector('#portrait-remove'),
      save = form.querySelector('[type=submit]');
    const draw = () => {
      const shown = draft ? { ...state, portrait: draft } : removed ? { ...state, portrait: null } : state;
      preview.innerHTML = thumb(shown, 'portrait-preview-image');
      slider.disabled = !draft;
      remove.disabled = !source(shown) || busy;
      save.disabled = busy;
    };
    draw();
    file.addEventListener('change', async () => {
      const chosen = file.files[0];
      if (!chosen) return;
      const current = ++ticket;
      busy = true;
      status.textContent = 'Preparando foto…';
      form.querySelector('#form-error').textContent = '';
      draw();
      try {
        const data = await encode(chosen);
        if (current !== ticket || !form.isConnected || !document.getElementById('modal').open) return;
        draft = { data, position: 50 };
        removed = false;
        slider.value = '50';
        status.textContent = 'Vista previa lista. Guardá para aplicar la foto.';
      } catch (e) {
        if (form.isConnected && current === ticket) {
          form.querySelector('#form-error').textContent = e.message;
          status.textContent = 'La foto anterior se conserva.';
        }
      } finally {
        if (form.isConnected && current === ticket) {
          busy = false;
          draw();
        }
      }
    });
    slider.addEventListener('input', () => {
      if (draft) {
        draft.position = Number(slider.value);
        draw();
      }
    });
    remove.addEventListener('click', () => {
      ticket++;
      busy = false;
      draft = null;
      removed = true;
      file.value = '';
      status.textContent = 'Guardá para quitar la foto.';
      draw();
    });
  }
  return { source, thumb, savedThumb, decorate, card, edit, encode };
})();
