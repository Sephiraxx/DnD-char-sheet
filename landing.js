/* Portada: el video de muestra (pausa, capítulos, movimiento reducido) y los botones de cuenta. */
(() => {
  'use strict';
  // Sin servidor configurado no hay cuentas: quedan «Probar gratis» y la app local.
  if (!window.CLOUD_CONFIG?.url) document.querySelectorAll('[data-account]').forEach(el => el.remove());

  const video = document.getElementById('showcase'),
    toggle = document.getElementById('video-toggle'),
    chapters = [...document.querySelectorAll('[data-chapter]')];
  if (!video || !toggle) return;
  const starts = (video.dataset.chapters || '0').split(',').map(Number);
  const still = matchMedia('(prefers-reduced-motion: reduce)'),
    saveData = navigator.connection?.saveData === true;
  // Pausado a mano: no se vuelve a reproducir solo al volver a la vista.
  let userPaused = still.matches || saveData,
    visible = true;

  function label() {
    const playing = !video.paused;
    toggle.setAttribute('aria-label', playing ? 'Pausar el video' : 'Reproducir el video');
    toggle.firstElementChild.textContent = playing ? '❚❚' : '▶';
    toggle.classList.toggle('paused', !playing);
  }
  function play() {
    const p = video.play();
    if (p) p.catch(() => label());
  }
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    userPaused = !video.paused;
    if (userPaused) video.pause();
    else play();
  });
  video.addEventListener('play', label);
  video.addEventListener('pause', label);
  // El capítulo que se está viendo, y saltar a otro.
  video.addEventListener('timeupdate', () => {
    let at = 0;
    starts.forEach((t, i) => {
      if (video.currentTime >= t) at = i;
    });
    chapters.forEach((el, i) => el.setAttribute('aria-current', i === at ? 'true' : 'false'));
  });
  chapters.forEach((el, i) =>
    el.addEventListener('click', () => {
      video.currentTime = starts[i] || 0;
      userPaused = false;
      play();
    }),
  );
  // Fuera de la pantalla no gasta batería.
  if ('IntersectionObserver' in window)
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) video.pause();
      else if (!userPaused) play();
    }).observe(video);
  still.addEventListener?.('change', () => {
    if (still.matches) {
      userPaused = true;
      video.pause();
    }
  });
  if (!userPaused) play();
  label();
})();
