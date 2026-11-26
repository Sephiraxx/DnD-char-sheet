-- Aplicar después de 027_board_miniatures.sql.
-- En el editor SQL de Supabase, pegá el archivo completo y pulsá Run sin texto seleccionado.
-- Cada bloque entre delimitadores $nombre$ forma parte de una sola sentencia CREATE FUNCTION.
begin;

alter table public.map_tokens add column if not exists facing smallint not null default 0 check (facing between 0 and 7);
alter table public.map_tokens add column if not exists facing_manual boolean not null default false;
alter table public.map_tokens add column if not exists facing_mode text not null default 'inherit'
  check (facing_mode in ('inherit','off','travel','enemy'));

create or replace function public.guard_token_facing() returns trigger
language plpgsql security definer set search_path = public as $guard_token_facing$
declare own_pc boolean;
begin
  if public.is_dm(old.campaign_id) then return new; end if;
  own_pc := old.kind = 'pc' and coalesce(public.owns_character(old.character_id), false);
  if not own_pc then
    new.facing_mode := old.facing_mode;
    if not (old.kind = 'monster' and not old.hidden and public.is_member(old.campaign_id)
      and old.map_id = public.active_map(old.campaign_id)
      and exists (select 1 from maps m where m.id = old.map_id and m.grid #> '{rotation,playerMonsters}' = 'true'::jsonb)) then
      new.facing := old.facing;
      new.facing_manual := old.facing_manual;
    end if;
  end if;
  return new;
end;
$guard_token_facing$;
drop trigger if exists map_tokens_rotation_guard on public.map_tokens;
create trigger map_tokens_rotation_guard before update on public.map_tokens
  for each row execute function public.guard_token_facing();

-- A group move, rotation or undo succeeds as a unit. Compare only the fields being changed.
create or replace function public.commit_board_token_poses(p_campaign uuid, p_map uuid, p_changes jsonb)
returns setof public.map_tokens language plpgsql security definer set search_path = public as $commit_board_token_poses$
declare
  m maps; t map_tokens; change jsonb; patch jsonb; expected jsonb;
  dm boolean; mover boolean; player_rotation boolean;
begin
  select * into m from maps where id = p_map and campaign_id = p_campaign;
  if not found or jsonb_typeof(p_changes) is distinct from 'array' then raise exception 'Mapa o cambios inválidos.'; end if;
  dm := coalesce(public.is_dm(p_campaign), false);
  if not dm and not (coalesce(public.is_member(p_campaign), false) and p_map is not distinct from public.active_map(p_campaign))
  then raise exception 'No podés editar ese mapa.'; end if;
  if jsonb_array_length(p_changes) > 200 or jsonb_array_length(p_changes) <>
    (select count(distinct v->>'id') from jsonb_array_elements(p_changes) v) then raise exception 'Grupo inválido.'; end if;
  for change in select v from jsonb_array_elements(p_changes) v order by v->>'id' loop
    select * into t from map_tokens where id = (change->>'id')::uuid and campaign_id = p_campaign and map_id = p_map for update;
    if not found then raise exception 'La ficha ya no está en este mapa.'; end if;
    patch := change->'patch'; expected := change->'before';
    if jsonb_typeof(patch) is distinct from 'object' or jsonb_typeof(expected) is distinct from 'object' then
      raise exception 'Cambios de ficha inválidos.';
    end if;
    if patch - array['x','y','facing','facing_mode','facing_manual'] <> '{}'::jsonb then raise exception 'Cambio de ficha inválido.'; end if;
    mover := dm or (t.kind = 'pc' and coalesce(public.owns_character(t.character_id), false));
    player_rotation := coalesce(t.kind = 'monster' and not t.hidden and m.grid #> '{rotation,playerMonsters}' = 'true'::jsonb
      and not exists (select 1 from combatants c where c.id = t.combatant_id and c.hidden), false);
    if not mover and (not player_rotation or patch ?| array['x','y','facing_mode']) then raise exception 'No podés girar o mover esa ficha.'; end if;
    if t.kind = 'object' and patch ?| array['facing','facing_manual','facing_mode'] then raise exception 'Este objeto no gira.'; end if;
    if not to_jsonb(t) @> expected then raise exception 'La ficha cambió en otra pantalla. Volvé a intentar.'; end if;
    update map_tokens set
      x = coalesce((patch->>'x')::real, t.x), y = coalesce((patch->>'y')::real, t.y),
      facing = coalesce((patch->>'facing')::smallint, t.facing),
      facing_manual = coalesce((patch->>'facing_manual')::boolean, t.facing_manual),
      facing_mode = coalesce(patch->>'facing_mode', t.facing_mode)
    where id = t.id returning * into t;
    return next t;
  end loop;
end;
$commit_board_token_poses$;
revoke all on function public.commit_board_token_poses(uuid, uuid, jsonb) from public;
grant execute on function public.commit_board_token_poses(uuid, uuid, jsonb) to authenticated;

create or replace function public.restore_campaign_archive(
  p_campaign uuid, p_settings jsonb, p_maps jsonb, p_tokens jsonb, p_homebrew jsonb, p_active uuid
) returns void language plpgsql set search_path = public as $restore_campaign_archive$
begin
  if not is_dm(p_campaign) then raise exception 'Solo el DM puede importar una copia.'; end if;
  perform 1 from campaigns where id = p_campaign for update;
  if not found or exists (select 1 from members where campaign_id = p_campaign and role <> 'dm')
    or exists (select 1 from characters where campaign_id = p_campaign)
    or exists (select 1 from maps where campaign_id = p_campaign)
    or exists (select 1 from homebrew where campaign_id = p_campaign)
    or exists (select 1 from boards where campaign_id = p_campaign)
  then raise exception 'La copia debe importarse en una mesa nueva.'; end if;

  if jsonb_typeof(p_settings) is distinct from 'object'
    or jsonb_array_length(p_maps) > 200 or jsonb_array_length(p_tokens) > 2000
    or jsonb_array_length(p_homebrew) > 500
  then raise exception 'La copia de la mesa supera los límites.'; end if;

  if exists (
    select 1 from jsonb_to_recordset(p_maps) as m(image_path text)
    where m.image_path is not null and public.folder_campaign(m.image_path) is distinct from p_campaign
  ) then raise exception 'Una imagen no pertenece a esta mesa.'; end if;

  update campaigns set settings = p_settings where id = p_campaign;
  insert into maps (id, campaign_id, name, image_path, grid, terrain, fog, sort)
    select id, p_campaign, name, image_path, grid, terrain, fog, sort
    from jsonb_to_recordset(p_maps) as m(
      id uuid, name text, image_path text, grid jsonb, terrain jsonb, fog jsonb, sort int
    );

  if (p_active is not null and not exists (select 1 from maps where id = p_active and campaign_id = p_campaign))
    or exists (
      select 1 from jsonb_to_recordset(p_tokens) as t(map_id uuid)
      where not exists (select 1 from maps m where m.id = t.map_id and m.campaign_id = p_campaign)
    )
  then raise exception 'La copia apunta a un mapa que no existe en esta mesa.'; end if;

  insert into map_tokens (campaign_id, map_id, kind, name, label, color, x, y, size, hidden, stage, elev, creature_model, model_form, show_hp, facing, facing_manual, facing_mode)
    select p_campaign, map_id, kind, name, label, color, x, y, size, hidden, stage, elev, creature_model, model_form, coalesce(show_hp, false), coalesce(facing, 0), coalesce(facing_manual, false), coalesce(facing_mode, 'inherit')
    from jsonb_to_recordset(p_tokens) as t(
      map_id uuid, kind text, name text, label text, color text, x real, y real, size real,
      hidden boolean, stage text, elev int, creature_model text, model_form text, show_hp boolean, facing smallint, facing_manual boolean, facing_mode text
    );
  insert into homebrew (campaign_id, kind, name, data)
    select p_campaign, kind, name, data from jsonb_to_recordset(p_homebrew) as h(kind text, name text, data jsonb);
  insert into boards (campaign_id, map_id) values (p_campaign, p_active);
end;
$restore_campaign_archive$;

notify pgrst, 'reload schema';
commit;
