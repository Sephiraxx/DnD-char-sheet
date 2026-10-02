-- Mesa compartida: campañas, integrantes, fichas sincronizadas y eventos de mesa.
-- Pegar completo en Supabase → SQL Editor → Run. Se puede volver a ejecutar sin perder datos.

create extension if not exists pgcrypto;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  code text not null unique,
  dm_id uuid not null default auth.uid() references auth.users on delete cascade,
  -- Ajustes del DM: { sources: [...], startLevel, rules }
  settings jsonb not null default '{}'::jsonb check (octet_length(settings::text) <= 8000),
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  campaign_id uuid not null references public.campaigns on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('dm', 'player')),
  display_name text not null default '' check (char_length(display_name) <= 100),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists characters_campaign on public.characters (campaign_id);

-- La hora de actualización la pone el servidor, no el reloj de cada dispositivo.
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists characters_touch on public.characters;
create trigger characters_touch before update on public.characters
  for each row execute function public.touch_updated_at();

-- Tiradas compartidas, órdenes del DM (daño, estados, pedidos de tirada, botín) y avisos.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.campaigns on delete cascade,
  author_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (char_length(kind) between 1 and 40),
  target_character uuid references public.characters on delete cascade,
  visibility text not null default 'all' check (visibility in ('all', 'dm', 'target')),
  payload jsonb not null default '{}' check (octet_length(payload::text) <= 20000),
  applied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists events_campaign on public.events (campaign_id, id desc);

-- Un jugador solo puede marcar una orden como aplicada; no puede reescribirla.
create or replace function public.events_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_dm(old.campaign_id) then
    new.campaign_id := old.campaign_id;
    new.author_id := old.author_id;
    new.kind := old.kind;
    new.target_character := old.target_character;
    new.visibility := old.visibility;
    new.payload := old.payload;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists events_guard on public.events;
create trigger events_guard before update on public.events
  for each row execute function public.events_guard();

-- Funciones auxiliares. SECURITY DEFINER evita recursión entre políticas.
create or replace function public.is_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where campaign_id = cid and user_id = auth.uid());
$$;

create or replace function public.is_dm(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where campaign_id = cid and user_id = auth.uid() and role = 'dm');
$$;

create or replace function public.owns_character(chid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from characters where id = chid and owner_id = auth.uid());
$$;

create or replace function public.create_campaign(p_name text, p_display text)
returns public.campaigns language plpgsql security definer set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c campaigns;
  new_code text;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from campaigns where code = new_code);
  end loop;
  insert into campaigns (name, code, dm_id) values (trim(p_name), new_code, auth.uid()) returning * into c;
  insert into members (campaign_id, user_id, role, display_name) values (c.id, auth.uid(), 'dm', coalesce(trim(p_display), ''));
  return c;
end $$;

create or replace function public.join_campaign(p_code text, p_display text)
returns public.campaigns language plpgsql security definer set search_path = public as $$
declare c campaigns;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  select * into c from campaigns where code = upper(trim(p_code));
  if not found then raise exception 'No existe una mesa con ese código.'; end if;
  insert into members (campaign_id, user_id, role, display_name)
  values (c.id, auth.uid(), 'player', coalesce(trim(p_display), ''))
  on conflict (campaign_id, user_id) do update set display_name = excluded.display_name;
  return c;
end $$;

grant execute on function public.create_campaign(text, text), public.join_campaign(text, text) to authenticated;

alter table public.campaigns enable row level security;
alter table public.members enable row level security;
alter table public.characters enable row level security;
alter table public.events enable row level security;

drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns for select using (public.is_member(id));
drop policy if exists campaigns_update on public.campaigns;
create policy campaigns_update on public.campaigns for update using (dm_id = auth.uid());
drop policy if exists campaigns_delete on public.campaigns;
create policy campaigns_delete on public.campaigns for delete using (dm_id = auth.uid());

drop policy if exists members_select on public.members;
create policy members_select on public.members for select using (public.is_member(campaign_id));
drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete
  using (user_id = auth.uid() or public.is_dm(campaign_id));

drop policy if exists characters_select on public.characters;
create policy characters_select on public.characters for select using (public.is_member(campaign_id));
drop policy if exists characters_insert on public.characters;
create policy characters_insert on public.characters for insert
  with check (owner_id = auth.uid() and public.is_member(campaign_id));
drop policy if exists characters_update on public.characters;
create policy characters_update on public.characters for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists characters_delete on public.characters;
create policy characters_delete on public.characters for delete
  using (owner_id = auth.uid() or public.is_dm(campaign_id));

-- Los jugadores solo publican tiradas y respuestas; las órdenes sobre fichas son del DM.
drop policy if exists events_select on public.events;
create policy events_select on public.events for select using (
  public.is_member(campaign_id) and (
    visibility = 'all'
    or author_id = auth.uid()
    or public.is_dm(campaign_id)
    or (visibility = 'target' and public.owns_character(target_character))
  )
);
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert with check (
  author_id = auth.uid() and public.is_member(campaign_id) and (
    public.is_dm(campaign_id) or kind in ('roll', 'roll-response', 'note')
  )
);
drop policy if exists events_update on public.events;
create policy events_update on public.events for update
  using (public.owns_character(target_character) or public.is_dm(campaign_id));
drop policy if exists events_delete on public.events;
create policy events_delete on public.events for delete using (public.is_dm(campaign_id));

-- Tiempo real para la party y la pantalla del DM.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'characters') then
    alter publication supabase_realtime add table public.characters;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'events') then
    alter publication supabase_realtime add table public.events;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'members') then
    alter publication supabase_realtime add table public.members;
  end if;
end $$;


create table if not exists public.loot (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns on delete cascade,
  name text not null check (char_length(name) between 1 and 150),
  qty int not null default 1 check (qty between 1 and 9999),
  notes text not null default '' check (char_length(notes) <= 2000),
  claimed_character uuid references public.characters on delete set null,
  claimed_name text check (claimed_name is null or char_length(claimed_name) <= 100),
  created_at timestamptz not null default now()
);
create index if not exists loot_campaign on public.loot (campaign_id);

create table if not exists public.homebrew (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns on delete cascade,
  kind text not null check (kind in ('item', 'spell', 'rule')),
  name text not null check (char_length(name) between 1 and 150),
  data jsonb not null default '{}'::jsonb check (octet_length(data::text) <= 20000),
  created_at timestamptz not null default now()
);
create index if not exists homebrew_campaign on public.homebrew (campaign_id);

alter table public.loot enable row level security;
alter table public.homebrew enable row level security;

drop policy if exists loot_select on public.loot;
create policy loot_select on public.loot for select using (public.is_member(campaign_id));
drop policy if exists loot_insert on public.loot;
create policy loot_insert on public.loot for insert with check (public.is_dm(campaign_id));
drop policy if exists loot_delete on public.loot;
create policy loot_delete on public.loot for delete using (public.is_dm(campaign_id));
-- Un jugador solo puede reclamar un objeto libre para una ficha propia.
drop policy if exists loot_update on public.loot;
create policy loot_update on public.loot for update
  using (public.is_dm(campaign_id) or (public.is_member(campaign_id) and claimed_character is null))
  with check (public.is_dm(campaign_id) or public.owns_character(claimed_character));

create or replace function public.loot_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_dm(old.campaign_id) then
    new.campaign_id := old.campaign_id;
    new.name := old.name;
    new.qty := old.qty;
    new.notes := old.notes;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists loot_guard on public.loot;
create trigger loot_guard before update on public.loot for each row execute function public.loot_guard();

drop policy if exists homebrew_select on public.homebrew;
create policy homebrew_select on public.homebrew for select using (public.is_member(campaign_id));
drop policy if exists homebrew_write on public.homebrew;
create policy homebrew_write on public.homebrew for all
  using (public.is_dm(campaign_id)) with check (public.is_dm(campaign_id));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'loot') then
    alter publication supabase_realtime add table public.loot;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'homebrew') then
    alter publication supabase_realtime add table public.homebrew;
  end if;
end $$;


-- Estado del encuentro de cada mesa (uno por mesa).
create table if not exists public.encounters (
  campaign_id uuid primary key references public.campaigns on delete cascade,
  active boolean not null default false,
  round int not null default 0,
  current_id uuid,
  updated_at timestamptz not null default now()
);

-- Quiénes participan: personajes de la mesa y criaturas. Lo ven todos (salvo criaturas ocultas).
create table if not exists public.combatants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns on delete cascade,
  kind text not null check (kind in ('pc', 'monster')),
  character_id uuid references public.characters on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  init int,
  tiebreak int not null default 0,
  status text not null default 'ileso',
  conditions text[] not null default '{}',
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists combatants_campaign on public.combatants (campaign_id);

-- Datos que solo ve el DM: PG, CA y bonos de salvación de cada criatura.
create table if not exists public.combatant_secrets (
  combatant_id uuid primary key references public.combatants on delete cascade,
  campaign_id uuid not null references public.campaigns on delete cascade,
  hp int not null default 1 check (hp >= 0),
  max_hp int not null default 1 check (max_hp >= 1),
  ac int not null default 10 check (ac between 0 and 40),
  saves jsonb not null default '{}'::jsonb,
  monster_id text
);

alter table public.encounters enable row level security;
alter table public.combatants enable row level security;
alter table public.combatant_secrets enable row level security;

drop policy if exists encounters_select on public.encounters;
create policy encounters_select on public.encounters for select using (public.is_member(campaign_id));
drop policy if exists encounters_write on public.encounters;
create policy encounters_write on public.encounters for all
  using (public.is_dm(campaign_id)) with check (public.is_dm(campaign_id));

drop policy if exists combatants_select on public.combatants;
create policy combatants_select on public.combatants for select
  using (public.is_member(campaign_id) and (not hidden or public.is_dm(campaign_id)));
drop policy if exists combatants_write on public.combatants;
create policy combatants_write on public.combatants for all
  using (public.is_dm(campaign_id)) with check (public.is_dm(campaign_id));

drop policy if exists secrets_dm on public.combatant_secrets;
create policy secrets_dm on public.combatant_secrets for all
  using (public.is_dm(campaign_id)) with check (public.is_dm(campaign_id));

-- Estado descriptivo a partir de los PG (lo que ven los jugadores).
create or replace function public.status_for(hp int, max_hp int) returns text
language sql immutable as $$
  select case
    when hp <= 0 then 'derrotado'
    when hp * 4 < max_hp then 'a punto de caer'
    when hp * 2 < max_hp then 'malherido'
    when hp < max_hp then 'herido'
    else 'ileso' end;
$$;
create or replace function public.secrets_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update combatants set status = status_for(new.hp, new.max_hp) where id = new.combatant_id;
  return new;
end $$;
drop trigger if exists secrets_status on public.combatant_secrets;
create trigger secrets_status after insert or update on public.combatant_secrets
  for each row execute function public.secrets_status();

-- Pasar el turno: el DM siempre; un jugador solo si el turno es de su personaje.
create or replace function public.advance_turn(p_campaign uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e encounters;
  cur combatants;
  nxt combatants;
  ids uuid[];
  i int;
  r int;
begin
  if not is_member(p_campaign) then raise exception 'No sos parte de esta mesa.'; end if;
  select * into e from encounters where campaign_id = p_campaign;
  if e.active is true and e.current_id is not null then
    select * into cur from combatants where id = e.current_id;
    if not is_dm(p_campaign) and not (cur.kind = 'pc' and owns_character(cur.character_id)) then
      raise exception 'Solo quien tiene el turno o el DM pueden pasarlo.';
    end if;
  elsif not is_dm(p_campaign) then
    raise exception 'El combate todavía no empezó.';
  end if;
  select array_agg(id order by init desc nulls last, tiebreak desc, created_at) into ids
    from combatants
    where campaign_id = p_campaign and not hidden and not (kind = 'monster' and status = 'derrotado');
  if ids is null then raise exception 'No hay nadie en la iniciativa.'; end if;
  i := array_position(ids, e.current_id);
  if e.active is not true then
    r := 1;
    i := 1;
  elsif i is null then
    r := greatest(e.round, 1);
    i := 1;
  else
    r := e.round;
    i := i + 1;
    if i > array_length(ids, 1) then
      i := 1;
      r := r + 1;
    end if;
  end if;
  insert into encounters (campaign_id, active, round, current_id, updated_at)
    values (p_campaign, true, r, ids[i], now())
    on conflict (campaign_id) do update
      set active = true, round = excluded.round, current_id = excluded.current_id, updated_at = now();
  select * into nxt from combatants where id = ids[i];
  insert into events (campaign_id, author_id, kind, payload)
    values (p_campaign, auth.uid(), 'turn',
      jsonb_build_object('combatantId', nxt.id, 'characterId', nxt.character_id, 'name', nxt.name, 'round', r));
  return jsonb_build_object('id', nxt.id, 'name', nxt.name, 'round', r);
end $$;

create or replace function public.end_combat(p_campaign uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_dm(p_campaign) then raise exception 'Solo el DM termina el combate.'; end if;
  insert into encounters (campaign_id, active, round, current_id) values (p_campaign, false, 0, null)
    on conflict (campaign_id) do update set active = false, round = 0, current_id = null, updated_at = now();
  insert into events (campaign_id, author_id, kind, payload) values (p_campaign, auth.uid(), 'combat-end', '{}'::jsonb);
end $$;

-- Ataque de un jugador contra una criatura: se compara con la CA oculta. El jugador solo sabe si impacta.
create or replace function public.resolve_attack(p_target uuid, p_total int, p_natural int, p_label text, p_attacker text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c combatants;
  s combatant_secrets;
  hit boolean;
begin
  select * into c from combatants where id = p_target;
  if not found or not is_member(c.campaign_id) then raise exception 'Objetivo no encontrado.'; end if;
  if c.kind <> 'monster' then raise exception 'Solo se resuelven así los ataques contra criaturas.'; end if;
  select * into s from combatant_secrets where combatant_id = p_target;
  hit := p_natural = 20 or (p_natural <> 1 and p_total >= coalesce(s.ac, 10));
  insert into events (campaign_id, author_id, kind, payload)
    values (c.campaign_id, auth.uid(), 'attack', jsonb_build_object(
      'attacker', left(coalesce(p_attacker, ''), 100), 'target', c.name, 'targetId', c.id,
      'label', left(coalesce(p_label, ''), 120), 'total', p_total, 'natural', p_natural, 'hit', hit));
  return jsonb_build_object('hit', hit, 'name', c.name, 'status', c.status);
end $$;

-- Daño a una criatura (de un jugador o del DM). Devuelve solo el estado descriptivo.
create or replace function public.damage_combatant(p_target uuid, p_amount int, p_label text, p_attacker text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c combatants;
  amount int := greatest(0, least(coalesce(p_amount, 0), 9999));
begin
  select * into c from combatants where id = p_target;
  if not found or not is_member(c.campaign_id) then raise exception 'Objetivo no encontrado.'; end if;
  if c.kind <> 'monster' then raise exception 'Solo se aplica así el daño a criaturas.'; end if;
  update combatant_secrets set hp = greatest(0, hp - amount) where combatant_id = p_target;
  select * into c from combatants where id = p_target;
  insert into events (campaign_id, author_id, kind, payload)
    values (c.campaign_id, auth.uid(), 'creature-damage', jsonb_build_object(
      'attacker', left(coalesce(p_attacker, ''), 100), 'target', c.name, 'targetId', c.id,
      'label', left(coalesce(p_label, ''), 120), 'amount', amount, 'status', c.status));
  return jsonb_build_object('name', c.name, 'status', c.status);
end $$;

grant execute on function public.advance_turn(uuid), public.end_combat(uuid),
  public.resolve_attack(uuid, int, int, text, text), public.damage_combatant(uuid, int, text, text) to authenticated;

-- Los jugadores pueden mandarse curaciones, efectos y dados entre ellos y pedir salvaciones de criaturas al DM.
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert with check (
  author_id = auth.uid() and public.is_member(campaign_id) and (
    public.is_dm(campaign_id)
    or kind in ('roll', 'roll-response', 'note', 'heal', 'temp', 'effect', 'bonus-die', 'creature-save', 'area-save')
  )
);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'encounters') then
    alter publication supabase_realtime add table public.encounters;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'combatants') then
    alter publication supabase_realtime add table public.combatants;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'combatant_secrets') then
    alter publication supabase_realtime add table public.combatant_secrets;
  end if;
end $$;

-- ---------- 006: juntar cuentas ----------
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

-- Copias en la nube de cada ficha (007).
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
