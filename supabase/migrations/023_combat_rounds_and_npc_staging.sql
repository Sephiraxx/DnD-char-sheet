-- Keep round history private so hidden actors never appear in a participant list.
begin;
alter table public.combatants add column if not exists round_priority double precision;
create table if not exists public.initiative_rounds (
  campaign_id uuid primary key references public.campaigns on delete cascade,
  round int not null,
  roster uuid[] not null,
  played uuid[] not null,
  last_kind text not null,
  opening_kind text not null
);
alter table public.initiative_rounds enable row level security;
revoke all on public.initiative_rounds from public, anon, authenticated;

create or replace function public.advance_turn(p_campaign uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e encounters; cur combatants; nxt combatants; progress initiative_rounds;
  eligible uuid[]; remaining uuid[]; planned uuid[]; displayed uuid[]; next_id uuid;
  r int; concealed boolean; first_side text;
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
    into eligible from combatants where campaign_id = p_campaign and not (kind = 'monster' and status = 'derrotado');
  if eligible is null then raise exception 'No hay nadie en la iniciativa.'; end if;

  if e.active is not true then
    if e.initiative_mode <> 'individual' and exists (
      select 1 from combatants where id = any(eligible) and turn_priority is null
    ) then raise exception 'Revisá el modo de iniciativa: hay combatientes nuevos sin posición.'; end if;
    r := 1;
    progress.roster := eligible;
    select kind into progress.opening_kind from combatants where id = eligible[1];
    progress.played := '{}';
    remaining := eligible;
  else
    r := greatest(e.round, 1);
    select * into progress from initiative_rounds where campaign_id = p_campaign and round = r;
    if not found then
      -- An encounter already in progress when this migration is installed can use its turn events.
      progress.roster := eligible;
      select array_agg(distinct (payload->>'combatantId')::uuid) into progress.played
        from events where campaign_id = p_campaign and kind = 'turn' and payload->>'round' = r::text
          and payload ? 'combatantId'
          and id > coalesce((select max(id) from events where campaign_id = p_campaign and kind = 'combat-end'), 0);
      progress.played := coalesce(progress.played, '{}');
      if e.current_id is not null and not (e.current_id = any(progress.played)) then
        progress.played := progress.played || e.current_id;
      end if;
      select kind into progress.opening_kind from combatants where id = eligible[1];
      progress.last_kind := cur.kind;
    end if;

    select array_agg(id order by position) into remaining
      from unnest(eligible) with ordinality a(id,position)
      where id = any(progress.roster) and not (id = any(progress.played));
    if remaining is null then
      r := r + 1;
      progress.roster := eligible;
      progress.played := '{}';
      remaining := eligible;
    end if;
  end if;

  planned := remaining;
  if e.initiative_mode = 'alternating' then
    if cardinality(progress.played) = 0 or progress.last_kind is null then
      first_side := progress.opening_kind;
    else
      first_side := case when progress.last_kind = 'pc' then 'monster' else 'pc' end;
    end if;
    with ranked as (
      select a.id, c.kind, row_number() over (partition by c.kind order by a.position) as turn
      from unnest(remaining) with ordinality a(id,position) join combatants c on c.id = a.id
    )
    select array_agg(id order by turn, (kind = first_side) desc) into planned from ranked;
  end if;

  next_id := planned[1];
  select * into nxt from combatants where id = next_id;
  insert into initiative_rounds (campaign_id,round,roster,played,last_kind,opening_kind)
    values (p_campaign,r,progress.roster,progress.played || next_id,nxt.kind,progress.opening_kind)
    on conflict (campaign_id) do update set round=excluded.round, roster=excluded.roster,
      played=excluded.played, last_kind=excluded.last_kind, opening_kind=excluded.opening_kind;

  select coalesce(array_agg(id order by position),'{}') || planned into displayed
    from unnest(progress.played) with ordinality a(id,position)
    where id = any(eligible) and not (id = any(planned));
  if displayed is distinct from (select array_agg(id order by round_priority) from combatants where id = any(displayed) and round_priority is not null)
     or (r <> e.round and exists (select 1 from combatants where campaign_id = p_campaign and round_priority is not null and not (id = any(displayed))))
  then
    update combatants set round_priority = null
      where campaign_id = p_campaign and round_priority is not null and not (id = any(displayed));
    -- Ordered random keys do not expose the position or the number of hidden creatures.
    with keys as materialized (select random() as priority from unnest(displayed)),
      positions as (select priority, row_number() over (order by priority) as position from keys)
    update combatants c set round_priority = p.priority from unnest(displayed) with ordinality a(id,position)
      join positions p using (position) where c.id = a.id;
  end if;

  update encounters set active = true, round = r, current_id = next_id, updated_at = now() where campaign_id = p_campaign;
  concealed := combatant_is_hidden(nxt.id);
  insert into events (campaign_id, author_id, kind, payload)
    values (p_campaign, auth.uid(), 'turn', jsonb_build_object(
      'combatantId', nxt.id, 'characterId', case when concealed then null else nxt.character_id end,
      'name', case when concealed then 'Turno oculto' else nxt.name end, 'hidden', concealed, 'round', r));
  return jsonb_build_object('id', nxt.id, 'name', case when concealed and not is_dm(p_campaign) then 'Turno oculto' else nxt.name end, 'hidden', concealed, 'round', r);
end $$;

-- Reuse the staged position even if the NPC already has an ordinary map token.
create or replace function public.link_prepared_npc(p_campaign uuid, p_stage text, p_combatant uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c combatants; token map_tokens;
begin
  if not is_dm(p_campaign) then raise exception 'Solo el DM puede colocar PNJ guardados.'; end if;
  select * into c from combatants where id = p_combatant and campaign_id = p_campaign and character_id is not null;
  if not found or p_stage not like 'enc:%' then raise exception 'Esa ficha preparada no existe.'; end if;
  for token in select * from map_tokens where campaign_id = p_campaign and stage = p_stage for update loop
    delete from map_tokens where campaign_id = p_campaign and map_id = token.map_id and id <> token.id
      and (character_id = c.character_id or combatant_id = c.id);
    update map_tokens set kind = c.kind, character_id = c.character_id, combatant_id = c.id, name = c.name, hidden = c.hidden
      where id = token.id;
  end loop;
end $$;
revoke all on function public.link_prepared_npc(uuid, text, uuid) from public;
grant execute on function public.link_prepared_npc(uuid, text, uuid) to authenticated;
create or replace function public.reset_npc_stage() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.combatant_id is not null and new.combatant_id is null and new.stage like 'enc:%' and old.character_id is not null then
    new.kind := 'monster';
    new.character_id := null;
    new.hidden := true;
  end if;
  return new;
end $$;
drop trigger if exists stage_reset_npc on public.map_tokens;
create trigger stage_reset_npc before update on public.map_tokens for each row execute function public.reset_npc_stage();
notify pgrst, 'reload schema';
commit;
