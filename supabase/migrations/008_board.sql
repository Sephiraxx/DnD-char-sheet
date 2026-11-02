-- Tablero: mapas de la mesa, fichas sobre el mapa (tokens), terreno y niebla de guerra.
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.

-- Mapas que prepara el DM. Los jugadores solo ven el que está en el tablero.
create table if not exists public.maps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  -- Imagen en Storage (bucket «maps», carpeta = id de la mesa). Sin imagen: mapa de terreno pintado.
  image_path text check (image_path is null or char_length(image_path) <= 300),
  -- Cuadrícula: { cols, rows, size (px por casilla en la imagen), ox, oy, feet, color, opacity }.
  grid jsonb not null default '{}'::jsonb check (octet_length(grid::text) <= 2000),
  -- Terreno: { cells: una letra por casilla, walls: [[x1, y1, x2, y2, puerta], …] en casillas }.
  terrain jsonb not null default '{}'::jsonb check (octet_length(terrain::text) <= 400000),
  -- Niebla: { on, revealed: base64 con un bit por casilla }.
  fog jsonb not null default '{"on": false}'::jsonb check (octet_length(fog::text) <= 100000),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists maps_campaign on public.maps (campaign_id, sort);

-- Qué mapa está en el tablero de cada mesa.
create table if not exists public.boards (
  campaign_id uuid primary key references public.campaigns on delete cascade,
  map_id uuid references public.maps on delete set null,
  updated_at timestamptz not null default now()
);

-- Fichas sobre un mapa: personajes, criaturas del combate, PNJ y objetos. x/y en casillas.
create table if not exists public.map_tokens (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns on delete cascade,
  map_id uuid not null references public.maps on delete cascade,
  kind text not null check (kind in ('pc', 'monster', 'npc', 'object')),
  character_id uuid references public.characters on delete cascade,
  combatant_id uuid references public.combatants on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  label text not null default '' check (char_length(label) <= 8),
  color text not null default '' check (char_length(color) <= 20),
  x real not null default 0 check (x between -50 and 1000),
  y real not null default 0 check (y between -50 and 1000),
  size real not null default 1 check (size between 0.25 and 6),
  hidden boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists map_tokens_map on public.map_tokens (map_id);
create unique index if not exists map_tokens_character on public.map_tokens (map_id, character_id) where character_id is not null;
create unique index if not exists map_tokens_combatant on public.map_tokens (map_id, combatant_id) where combatant_id is not null;

create or replace function public.active_map(cid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select map_id from boards where campaign_id = cid;
$$;

drop trigger if exists maps_touch on public.maps;
create trigger maps_touch before update on public.maps
  for each row execute function public.touch_updated_at();
drop trigger if exists boards_touch on public.boards;
create trigger boards_touch before update on public.boards
  for each row execute function public.touch_updated_at();

-- Un jugador solo mueve su propia ficha: del resto de la fila no cambia nada.
create or replace function public.map_tokens_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_dm(old.campaign_id) then
    new.id := old.id;
    new.campaign_id := old.campaign_id;
    new.map_id := old.map_id;
    new.kind := old.kind;
    new.character_id := old.character_id;
    new.combatant_id := old.combatant_id;
    new.name := old.name;
    new.label := old.label;
    new.color := old.color;
    new.size := old.size;
    new.hidden := old.hidden;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists map_tokens_guard on public.map_tokens;
create trigger map_tokens_guard before update on public.map_tokens
  for each row execute function public.map_tokens_guard();

alter table public.maps enable row level security;
alter table public.boards enable row level security;
alter table public.map_tokens enable row level security;

drop policy if exists maps_select on public.maps;
create policy maps_select on public.maps for select using (
  public.is_dm(campaign_id) or (public.is_member(campaign_id) and id = public.active_map(campaign_id))
);
drop policy if exists maps_write on public.maps;
create policy maps_write on public.maps for all
  using (public.is_dm(campaign_id)) with check (public.is_dm(campaign_id));

drop policy if exists boards_select on public.boards;
create policy boards_select on public.boards for select using (public.is_member(campaign_id));
drop policy if exists boards_write on public.boards;
create policy boards_write on public.boards for all
  using (public.is_dm(campaign_id)) with check (public.is_dm(campaign_id));

-- Los jugadores ven las fichas visibles del mapa en el tablero; el DM, todas.
drop policy if exists map_tokens_select on public.map_tokens;
create policy map_tokens_select on public.map_tokens for select using (
  public.is_dm(campaign_id)
  or (public.is_member(campaign_id) and not hidden and map_id = public.active_map(campaign_id))
);
drop policy if exists map_tokens_insert on public.map_tokens;
create policy map_tokens_insert on public.map_tokens for insert with check (public.is_dm(campaign_id));
drop policy if exists map_tokens_update on public.map_tokens;
create policy map_tokens_update on public.map_tokens for update
  using (public.is_dm(campaign_id) or (public.owns_character(character_id) and map_id = public.active_map(campaign_id)))
  with check (public.is_dm(campaign_id) or public.owns_character(character_id));
drop policy if exists map_tokens_delete on public.map_tokens;
create policy map_tokens_delete on public.map_tokens for delete using (public.is_dm(campaign_id));

-- Imágenes de los mapas: bucket privado, una carpeta por mesa.
-- El DM sube y borra; los jugadores solo leen la imagen del mapa que está en el tablero.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('maps', 'maps', false, 10485760, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create or replace function public.folder_campaign(path text) returns uuid
language plpgsql immutable as $$
begin
  return split_part(path, '/', 1)::uuid;
exception when others then
  return null;
end $$;

create or replace function public.can_read_map_image(path text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_dm(public.folder_campaign(path))
    or exists (
      select 1 from maps m
      where m.campaign_id = public.folder_campaign(path)
        and m.image_path = path
        and m.id = public.active_map(m.campaign_id)
        and public.is_member(m.campaign_id)
    );
$$;

drop policy if exists maps_images_read on storage.objects;
create policy maps_images_read on storage.objects for select
  using (bucket_id = 'maps' and public.can_read_map_image(name));
drop policy if exists maps_images_insert on storage.objects;
create policy maps_images_insert on storage.objects for insert
  with check (bucket_id = 'maps' and public.is_dm(public.folder_campaign(name)));
drop policy if exists maps_images_update on storage.objects;
create policy maps_images_update on storage.objects for update
  using (bucket_id = 'maps' and public.is_dm(public.folder_campaign(name)));
drop policy if exists maps_images_delete on storage.objects;
create policy maps_images_delete on storage.objects for delete
  using (bucket_id = 'maps' and public.is_dm(public.folder_campaign(name)));

-- Los borrados en vivo llevan la fila entera (con la mesa), para que lleguen por el filtro de cada mesa.
alter table public.maps replica identity full;
alter table public.map_tokens replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'maps') then
    alter publication supabase_realtime add table public.maps;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'boards') then
    alter publication supabase_realtime add table public.boards;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'map_tokens') then
    alter publication supabase_realtime add table public.map_tokens;
  end if;
end $$;
