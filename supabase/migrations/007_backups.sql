-- Copia en la nube de cada ficha del dispositivo, también las que no están en ninguna mesa.
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
--
-- Una fila por ficha y por cuenta (anónima o con email). Solo la ve y la cambia su dueño.
-- Al juntar cuentas (006), las copias pasan a la cuenta con email.

create table if not exists public.backups (
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  local_id text not null check (char_length(local_id) between 1 and 100),
  name text not null default '' check (char_length(name) <= 100),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, local_id),
  constraint backups_size check (pg_column_size(data) < 400000)
);
alter table public.backups enable row level security;

drop policy if exists backups_own on public.backups;
create policy backups_own on public.backups for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Límite de 100 fichas por cuenta, como en el dispositivo.
create or replace function public.backups_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Un «upsert» de una ficha que ya tiene copia también pasa por acá: esa no cuenta como nueva.
  if exists (select 1 from backups where owner_id = new.owner_id and local_id = new.local_id) then return new; end if;
  if (select count(*) from backups where owner_id = new.owner_id) >= 100 then
    raise exception 'Llegaste a 100 copias en la nube. Borrá alguna antes de agregar más.';
  end if;
  return new;
end $$;
drop trigger if exists backups_limit on public.backups;
create trigger backups_limit before insert on public.backups for each row execute function public.backups_limit();

create or replace function public.backups_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists backups_touch on public.backups;
create trigger backups_touch before update on public.backups for each row execute function public.backups_touch();

-- Juntar cuentas: igual que en 006, y además las copias en la nube pasan a la cuenta con email
-- (si las dos tienen la misma ficha, queda la más nueva).
create or replace function public.redeem_transfer_token(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  old uuid;
  n_chars int;
  n_tables int;
  n_dm int;
  n_backups int;
begin
  if me is null then raise exception 'Sin sesión'; end if;
  delete from transfer_tokens where token = p_token and expires_at > now() returning user_id into old;
  if old is null then raise exception 'El código para juntar las cuentas venció. Probá de nuevo.'; end if;
  if old = me then return jsonb_build_object('characters', 0, 'tables', 0, 'dm', 0, 'backups', 0); end if;

  insert into members (campaign_id, user_id, role, display_name)
    select campaign_id, me, role, display_name from members where user_id = old
    on conflict (campaign_id, user_id) do nothing;
  get diagnostics n_tables = row_count;
  delete from members where user_id = old;
  update characters set owner_id = me where owner_id = old;
  get diagnostics n_chars = row_count;
  update campaigns set dm_id = me where dm_id = old;
  get diagnostics n_dm = row_count;

  insert into backups (owner_id, local_id, name, data, updated_at)
    select me, local_id, name, data, updated_at from backups where owner_id = old
    on conflict (owner_id, local_id) do update
      set name = excluded.name, data = excluded.data, updated_at = excluded.updated_at
      where backups.updated_at < excluded.updated_at;
  get diagnostics n_backups = row_count;
  delete from backups where owner_id = old;

  return jsonb_build_object('characters', n_chars, 'tables', n_tables, 'dm', n_dm, 'backups', n_backups);
end $$;

revoke all on function public.redeem_transfer_token(text) from public;
grant execute on function public.redeem_transfer_token(text) to authenticated;
