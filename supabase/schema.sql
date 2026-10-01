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
