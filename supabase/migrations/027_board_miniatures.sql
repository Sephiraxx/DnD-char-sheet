-- Aplicar después de 026_campaign_miniatures.sql.
begin;

alter table public.map_tokens add column if not exists model_form text;
alter table public.map_tokens add column if not exists show_hp boolean not null default false;
alter table public.map_tokens add column if not exists hp_fraction real;
alter table public.map_tokens drop constraint if exists map_tokens_board_miniature_fields;
alter table public.map_tokens add constraint map_tokens_board_miniature_fields check (
  (model_form is null or (kind in ('monster','npc') and model_form in (
    '', 'wyrmling', 'young', 'adult', 'ancient', 'giant', 'black', 'frog',
    'poisonous', 'constrictor', 'normal', 'black-pudding'
  ))) and (not show_hp or kind = 'monster')
  and (hp_fraction is null or (show_hp and hp_fraction between 0 and 1))
);

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
    new.creature_model := old.creature_model;
    new.model_form := old.model_form;
    new.show_hp := old.show_hp;
    new.size := old.size;
    new.hidden := old.hidden;
    if not (
      old.kind = 'pc'
      and (old.stage is null or old.stage ~ '^light:[0-9]{1,3}$')
      and (new.stage is null or new.stage ~ '^light:[0-9]{1,3}$')
    ) then
      new.stage := old.stage;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Expone solo la proporción autorizada, sin publicar PG actuales, máximos ni CA.
create or replace function public.set_board_hp_fraction() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind not in ('monster', 'npc') then
    new.model_form := null;
    new.creature_model := null;
  end if;
  if new.kind <> 'monster' then new.show_hp := false; end if;
  new.hp_fraction := null;
  if new.kind = 'monster' and new.show_hp and new.combatant_id is not null then
    select least(1.0, greatest(0.0, s.hp::real / s.max_hp)) into new.hp_fraction
    from public.combatant_secrets s
    where s.combatant_id = new.combatant_id and s.campaign_id = new.campaign_id;
  end if;
  return new;
end $$;
drop trigger if exists set_board_hp_fraction on public.map_tokens;
create trigger set_board_hp_fraction before insert or update on public.map_tokens
  for each row execute function public.set_board_hp_fraction();

create or replace function public.refresh_board_hp_fraction() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- El disparador de la ficha recalcula a partir de los PG de la misma mesa.
  update public.map_tokens set hp_fraction = null
    where show_hp and combatant_id = coalesce(new.combatant_id, old.combatant_id)
      and campaign_id = coalesce(new.campaign_id, old.campaign_id);
  return null;
end $$;
drop trigger if exists refresh_board_hp_fraction on public.combatant_secrets;
create trigger refresh_board_hp_fraction after insert or update or delete on public.combatant_secrets
  for each row execute function public.refresh_board_hp_fraction();

create or replace function public.restore_campaign_archive(
  p_campaign uuid, p_settings jsonb, p_maps jsonb, p_tokens jsonb, p_homebrew jsonb, p_active uuid
) returns void language plpgsql set search_path = public as $$
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

  insert into map_tokens (campaign_id, map_id, kind, name, label, color, x, y, size, hidden, stage, elev, creature_model, model_form, show_hp)
    select p_campaign, map_id, kind, name, label, color, x, y, size, hidden, stage, elev, creature_model, model_form, coalesce(show_hp, false)
    from jsonb_to_recordset(p_tokens) as t(
      map_id uuid, kind text, name text, label text, color text, x real, y real, size real,
      hidden boolean, stage text, elev int, creature_model text, model_form text, show_hp boolean
    );
  insert into homebrew (campaign_id, kind, name, data)
    select p_campaign, kind, name, data from jsonb_to_recordset(p_homebrew) as h(kind text, name text, data jsonb);
  insert into boards (campaign_id, map_id) values (p_campaign, p_active);
end $$;

notify pgrst, 'reload schema';
commit;
