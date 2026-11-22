'use strict';
(async () => {
  const status = document.getElementById('recovery-status');
  const form = document.getElementById('recovery-form');
  try {
    const { url, key } = window.CLOUD_CONFIG || {};
    const token = new URLSearchParams(location.hash.slice(1));
    if (!url || !key || token.get('type') !== 'recovery' || !token.has('access_token'))
      throw Error('El enlace no es válido o venció. Pedí uno nuevo desde «Olvidé mi contraseña».');
    const client = supabase.createClient(url, key, {
      auth: {
        storageKey: 'dnd-password-recovery',
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
    });
    const { data, error } = await client.auth.getSession();
    history.replaceState(null, '', location.pathname);
    if (error || !data.session)
      throw Error('El enlace no es válido o venció. Pedí uno nuevo desde «Olvidé mi contraseña».');
    form.hidden = false;
    status.textContent = 'Elegí tu nueva contraseña.';
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const values = new FormData(form);
      const password = values.get('password');
      if (password !== values.get('again')) {
        status.textContent = 'Las contraseñas no coinciden.';
        return;
      }
      const button = form.querySelector('button');
      button.disabled = true;
      try {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        form.reset();
        form.hidden = true;
        status.textContent = 'Contraseña cambiada. Volvé a la ficha e iniciá sesión.';
      } catch (error) {
        status.textContent = error.message;
        button.disabled = false;
      }
    });
  } catch (error) {
    history.replaceState(null, '', location.pathname);
    status.textContent = error.message;
  }
})();
