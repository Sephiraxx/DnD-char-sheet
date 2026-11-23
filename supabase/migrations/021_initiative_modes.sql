-- Turn priority is separate from the actual initiative roll.
begin;
alter table public.combatants add column if not exists turn_priority double precision;
alter table public.encounters add column if not exists initiative_mode text not null default 'individual';
alter table public.encounters drop constraint if exists encounters_initiative_mode_check;
alter table public.encounters add constraint encounters_initiative_mode_check
  check (initiative_mode in ('individual', 'alternating', 'boss'));

create or replace function public.set_initiative_order(p_campaign uuid, p_mode text, p_order uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare
  running boolean;
  players int;
  monsters int;
begin
  if not is_dm(p_campaign) then raise exception 'Solo el DM puede elegir la iniciativa.'; end if;
  if p_mode is null or p_mode not in ('individual', 'alternating', 'boss') then
    raise exception 'Modo de iniciativa desconocido.';
  end if;
  insert into encounters (campaign_id) values (p_campaign) on conflict (campaign_id) do nothing;
  select active into running from encounters where campaign_id = p_campaign for update;
  if running then raise exception 'Terminá el combate antes de cambiar la iniciativa.'; end if;

  if p_mode <> 'individual' then
    select count(*) filter (where kind = 'pc'), count(*) filter (where kind = 'monster')
      into players, monsters from combatants
      where campaign_id = p_campaign and not (kind = 'monster' and status = 'derrotado');
    if players = 0 or monsters = 0 or (p_mode = 'boss' and monsters <> 1) then
      raise exception 'Revisá cuántos aliados y enemigos hay en la iniciativa.';
    end if;
    if p_order is null or cardinality(p_order) <> players + monsters or (
      select count(distinct c.id) from combatants c
      where c.id = any(p_order) and c.campaign_id = p_campaign
        and not (c.kind = 'monster' and c.status = 'derrotado')
    ) <> players + monsters then
      raise exception 'La lista de combatientes cambió. Volvé a abrir la configuración.';
    end if;
  end if;

  update combatants set turn_priority = null where campaign_id = p_campaign and turn_priority is not null;
  if p_mode <> 'individual' then
    -- Public sort keys have no rank gaps that would reveal how many turns are hidden.
    with keys as materialized (
      select random() as priority from unnest(p_order)
    ), positions as (
      select priority, row_number() over (order by priority) as position from keys
    )
    update combatants c set turn_priority = p.priority
      from unnest(p_order) with ordinality ordered(id, position)
      join positions p using (position)
      where c.id = ordered.id and c.campaign_id = p_campaign;
  end if;
  update encounters set initiative_mode = p_mode, updated_at = now() where campaign_id = p_campaign;
end $$;
revoke all on function public.set_initiative_order(uuid, text, uuid[]) from public;
grant execute on function public.set_initiative_order(uuid, text, uuid[]) to authenticated;

create or replace function public.advance_turn(p_campaign uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e encounters; cur combatants; nxt combatants; ids uuid[]; eligible uuid[]; next_id uuid;
  i int; r int; concealed boolean;
begin
  if not is_member(p_campaign) then raise exception 'No sos parte de esta mesa.'; end if;
  if is_dm(p_campaign) then
    insert into encounters (campaign_id) values (p_campaign) on conflict (campaign_id) do nothing;
  end if;
  select * into e from encounters where campaign_id = p_campaign for update;
  if e.active is true and e.current_id is not null then
    select * into cur from combatants where id = e.current_id;
    if not is_dm(p_campaign) and not coalesce(cur.kind = 'pc' and owns_character(cur.character_id), false) then
      raise exception 'Solo quien tiene el turno o el DM pueden pasarlo.';
    end if;
  elsif not is_dm(p_campaign) then raise exception 'El combate todavía no empezó.'; end if;

  select array_agg(id order by turn_priority nulls last, init desc nulls last, tiebreak desc, created_at, id)
    into ids from combatants where campaign_id = p_campaign;
  select array_agg(id order by position) into eligible
    from unnest(ids) with ordinality ordered(id, position) join combatants using (id)
    where not (kind = 'monster' and status = 'derrotado');
  if eligible is null then raise exception 'No hay nadie en la iniciativa.'; end if;
  if e.active is not true then
    if e.initiative_mode <> 'individual' and exists (
      select 1 from combatants where id = any(eligible) and turn_priority is null
    ) then raise exception 'Revisá el modo de iniciativa: hay combatientes nuevos sin posición.'; end if;
    r := 1;
    next_id := eligible[1];
  else
    r := greatest(e.round, 1);
    i := array_position(ids, e.current_id);
    if i is not null then
      select id into next_id from unnest(ids) with ordinality ordered(id, position)
        where position > i and id = any(eligible) order by position limit 1;
      if next_id is null then r := r + 1; end if;
    end if;
    next_id := coalesce(next_id, eligible[1]);
  end if;

  update encounters set active = true, round = r, current_id = next_id, updated_at = now()
    where campaign_id = p_campaign;
  select * into nxt from combatants where id = next_id;
  concealed := combatant_is_hidden(nxt.id);
  insert into events (campaign_id, author_id, kind, payload)
    values (p_campaign, auth.uid(), 'turn', jsonb_build_object(
      'combatantId', nxt.id, 'characterId', case when concealed then null else nxt.character_id end,
      'name', case when concealed then 'Turno oculto' else nxt.name end, 'hidden', concealed, 'round', r));
  return jsonb_build_object('id', nxt.id, 'name', case when concealed and not is_dm(p_campaign) then 'Turno oculto' else nxt.name end, 'hidden', concealed, 'round', r);
end $$;
notify pgrst, 'reload schema';
commit;
