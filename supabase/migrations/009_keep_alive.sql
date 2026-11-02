-- Consulta mínima para el workflow keep-alive de GitHub Actions: evita que Supabase pause el proyecto gratuito.
-- No lee ni devuelve datos de la mesa. Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
create or replace function public.keep_alive() returns timestamptz
language sql stable as $$
  select now();
$$;
grant execute on function public.keep_alive() to anon, authenticated;
-- Que la API vea la función nueva sin esperar.
notify pgrst, 'reload schema';
