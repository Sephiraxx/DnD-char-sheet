-- Juntar cuentas: un dispositivo con un acceso sin email (anónimo) pasa sus fichas, mesas y membresías a una
-- cuenta con email que ya existe. Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
--
-- 1. Con la sesión anónima, la app pide un código de un solo uso (create_transfer_token).
-- 2. Entra con el email y la contraseña; ya con esa sesión canjea el código (redeem_transfer_token).
-- El código prueba que el mismo dispositivo controlaba la cuenta anónima; vence a los 15 minutos.

create table if not exists public.transfer_tokens (
  token text primary key,
  user_id uuid not null references auth.users on delete cascade,
  expires_at timestamptz not null default now() + interval '15 minutes'
);
alter table public.transfer_tokens enable row level security;
-- Sin políticas: solo se usa a través de las funciones de abajo.

create or replace function public.create_transfer_token() returns text
language plpgsql security definer set search_path = public as $$
declare
  t text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if not coalesce((select is_anonymous from auth.users where id = auth.uid()), false) then
    raise exception 'Solo un acceso sin email se puede juntar con otra cuenta';
  end if;
  delete from transfer_tokens where user_id = auth.uid() or expires_at < now();
  insert into transfer_tokens (token, user_id) values (t, auth.uid());
  return t;
end $$;

create or replace function public.redeem_transfer_token(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  old uuid;
  n_chars int;
  n_tables int;
  n_dm int;
begin
  if me is null then raise exception 'Sin sesión'; end if;
  delete from transfer_tokens where token = p_token and expires_at > now() returning user_id into old;
  if old is null then raise exception 'El código para juntar las cuentas venció. Probá de nuevo.'; end if;
  if old = me then return jsonb_build_object('characters', 0, 'tables', 0, 'dm', 0); end if;

  -- Membresías (si ya estaba en esa mesa, se conserva la existente).
  insert into members (campaign_id, user_id, role, display_name)
    select campaign_id, me, role, display_name from members where user_id = old
    on conflict (campaign_id, user_id) do nothing;
  get diagnostics n_tables = row_count;
  delete from members where user_id = old;
  update characters set owner_id = me where owner_id = old;
  get diagnostics n_chars = row_count;
  update campaigns set dm_id = me where dm_id = old;
  get diagnostics n_dm = row_count;
  return jsonb_build_object('characters', n_chars, 'tables', n_tables, 'dm', n_dm);
end $$;

revoke all on function public.create_transfer_token() from public;
revoke all on function public.redeem_transfer_token(text) from public;
grant execute on function public.create_transfer_token() to authenticated;
grant execute on function public.redeem_transfer_token(text) to authenticated;
