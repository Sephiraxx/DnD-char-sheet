-- Botín compartido de la party y homebrew de la mesa (objetos, conjuros y reglas del DM).
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.

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
