-- Import a campaign archive into a newly created table. Map images are staged by the browser.
begin;
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

  insert into map_tokens (campaign_id, map_id, kind, name, label, color, x, y, size, hidden, stage, elev)
    select p_campaign, map_id, kind, name, label, color, x, y, size, hidden, stage, elev
    from jsonb_to_recordset(p_tokens) as t(
      map_id uuid, kind text, name text, label text, color text, x real, y real, size real,
      hidden boolean, stage text, elev int
    );
  insert into homebrew (campaign_id, kind, name, data)
    select p_campaign, kind, name, data from jsonb_to_recordset(p_homebrew) as h(kind text, name text, data jsonb);
  insert into boards (campaign_id, map_id) values (p_campaign, p_active);
end $$;

revoke all on function public.restore_campaign_archive(uuid, jsonb, jsonb, jsonb, jsonb, uuid) from public;
grant execute on function public.restore_campaign_archive(uuid, jsonb, jsonb, jsonb, jsonb, uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
