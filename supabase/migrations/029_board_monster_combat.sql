begin;

alter table public.combatant_secrets add column if not exists damage_traits jsonb;
alter table public.combatants add column if not exists board_only boolean not null default false;

create or replace function public.combatant_is_hidden(p_id uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare c combatants;
begin
  select * into c from combatants where id = p_id;
  if not found or not is_member(c.campaign_id) then return true; end if;
  if c.board_only then
    return not exists (
      select 1 from map_tokens t join boards b on b.campaign_id = t.campaign_id and b.map_id = t.map_id
      where t.combatant_id = c.id and t.campaign_id = c.campaign_id and not t.hidden
    );
  end if;
  return c.hidden or exists (
    select 1 from map_tokens t join boards b on b.campaign_id = t.campaign_id and b.map_id = t.map_id
    where t.combatant_id = c.id and t.campaign_id = c.campaign_id and t.hidden
  );
end $$;

-- The map token is locked so two DM tabs cannot give it two initiative entries.
create or replace function public.link_board_monster(p_token uuid, p_profile jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t map_tokens;
  existing combatant_secrets;
  cid uuid;
  hp_max int := (p_profile->>'max_hp')::int;
  armor int := (p_profile->>'ac')::int;
  stat_id text := nullif(p_profile->>'monster_id', '');
begin
  select * into t from map_tokens where id = p_token for update;
  if not found or not is_dm(t.campaign_id) or t.kind <> 'monster' or t.character_id is not null then
    raise exception 'Ficha de criatura no encontrada.';
  end if;
  if hp_max is null or hp_max not between 1 and 99999 or armor is null or armor not between 0 and 40
     or jsonb_typeof(p_profile->'saves') is distinct from 'object' or char_length(stat_id) > 200
     or jsonb_typeof(p_profile->'damage_traits') is distinct from 'object' then
    raise exception 'Bloque de criatura inválido.';
  end if;
  cid := t.combatant_id;
  if cid is null then
    insert into combatants (campaign_id, kind, name, hidden, tiebreak, board_only)
      values (t.campaign_id, 'monster', t.name, false, coalesce((p_profile->'saves'->>'dex')::int, 0), true) returning id into cid;
    update map_tokens set combatant_id = cid where id = t.id;
  elsif not exists (select 1 from combatants c where c.id = cid and c.campaign_id = t.campaign_id and c.kind = 'monster' and c.character_id is null) then
    raise exception 'Iniciativa de criatura inválida.';
  end if;
  select * into existing from combatant_secrets where combatant_id = cid for update;
  if not found then
    insert into combatant_secrets (combatant_id, campaign_id, hp, max_hp, ac, saves, monster_id, damage_traits)
      values (cid, t.campaign_id, hp_max, hp_max, armor, p_profile->'saves', stat_id, p_profile->'damage_traits');
  elsif existing.monster_id is distinct from stat_id then
    update combatant_secrets set max_hp = hp_max,
      hp = case when existing.hp = 0 then 0 else greatest(1, hp_max - (existing.max_hp - existing.hp)) end,
      ac = armor, saves = p_profile->'saves', monster_id = stat_id, damage_traits = p_profile->'damage_traits'
      where combatant_id = cid;
  else
    update combatant_secrets set damage_traits = p_profile->'damage_traits' where combatant_id = cid;
  end if;
  return cid;
end $$;
revoke all on function public.link_board_monster(uuid, jsonb) from public;
grant execute on function public.link_board_monster(uuid, jsonb) to authenticated;

create or replace function public.resolve_attack(p_target uuid, p_total int, p_natural int, p_label text, p_attacker text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c combatants;
  armor int;
  hit boolean;
  expose boolean;
begin
  select * into c from combatants where id = p_target;
  if not found or not is_member(c.campaign_id) or (not is_dm(c.campaign_id) and combatant_is_hidden(c.id)) then
    raise exception 'Objetivo no encontrado.';
  end if;
  if c.kind <> 'monster' then raise exception 'Solo se resuelven así los ataques contra criaturas.'; end if;
  select ac into armor from combatant_secrets where combatant_id = p_target;
  if armor is null then raise exception 'La criatura necesita un bloque de estadísticas.'; end if;
  select settings->'showEnemyAC' = 'true'::jsonb into expose from campaigns where id = c.campaign_id;
  hit := p_natural = 20 or (p_natural <> 1 and p_total >= armor);
  insert into events (campaign_id, author_id, kind, payload)
    values (c.campaign_id, auth.uid(), 'attack', jsonb_build_object(
      'attacker', left(coalesce(p_attacker, ''), 100), 'target', c.name, 'targetId', c.id,
      'label', left(coalesce(p_label, ''), 120), 'total', p_total, 'natural', p_natural, 'hit', hit));
  return jsonb_build_object('hit', hit, 'name', c.name, 'status', c.status)
    || case when expose then jsonb_build_object('ac', armor) else '{}'::jsonb end;
end $$;

create or replace function public.monster_damage_amount(p_traits jsonb, p_type text, p_amount int, p_details jsonb)
returns int language plpgsql immutable set search_path = public as $$
declare
  multiplier int := 1;
  damage int := p_amount;
  kind text;
begin
  if coalesce(p_type, '') = '' then return damage; end if;
  foreach kind in array array['immune', 'resist', 'vulnerable'] loop
    if (p_traits->kind) ? p_type or exists (
      select 1 from jsonb_array_elements(coalesce(p_traits->'weapon', '[]'::jsonb)) as rules(rule)
      where rule->>'type' = p_type and rule->>'kind' = kind
      and not (rule->'nonmagical' = 'true'::jsonb and coalesce(p_details->'magical' = 'true'::jsonb, false))
      and not (rule->'silver' = 'true'::jsonb and coalesce(p_details->'silvered' = 'true'::jsonb, false))
      and not (rule->'adamantine' = 'true'::jsonb and coalesce(p_details->'adamantine' = 'true'::jsonb, false))
    ) then
      if kind = 'immune' then return 0;
      elsif kind = 'resist' then damage := damage / 2;
      else multiplier := 2;
      end if;
    end if;
  end loop;
  return damage * multiplier;
end $$;

create or replace function public.damage_combatant(p_target uuid, p_amount int, p_label text, p_attacker text, p_details jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c combatants;
  traits jsonb;
  resolved int;
  amount int := greatest(0, least(coalesce(p_amount, 0), 9999));
begin
  select * into c from combatants where id = p_target;
  if not found or not is_member(c.campaign_id) or (not is_dm(c.campaign_id) and combatant_is_hidden(c.id)) then
    raise exception 'Objetivo no encontrado.';
  end if;
  if c.kind <> 'monster' then raise exception 'Solo se aplica así el daño a criaturas.'; end if;
  if c.character_id is not null and exists (select 1 from characters where id = c.character_id and enemy_npc) then
    if amount > 0 then
      insert into events(campaign_id, author_id, kind, target_character, visibility, payload)
        values (c.campaign_id, auth.uid(), 'damage', c.character_id, 'dm', jsonb_build_object(
          'amount', amount, 'source', left(coalesce(p_label,''),120), 'from', left(coalesce(p_attacker,''),100),
          'crit', coalesce(p_details->'crit' = 'true'::jsonb,false), 'type', left(coalesce(p_details->>'type',''),40),
          'parts', p_details->'parts'));
    end if;
    return jsonb_build_object('name', c.name, 'status', c.status, 'pending', amount > 0);
  end if;
  select damage_traits into traits from combatant_secrets where combatant_id = p_target for update;
  if not found then raise exception 'La criatura necesita un bloque de estadísticas.'; end if;
  if jsonb_typeof(p_details->'parts') = 'array' and jsonb_array_length(p_details->'parts') between 1 and 30 then
    select coalesce(sum(public.monster_damage_amount(traits, type, subtotal, p_details)), 0) into resolved
      from (select part->>'type' as type, sum(greatest(0, least(9999, (part->>'amount')::int)))::int as subtotal
        from jsonb_array_elements(p_details->'parts') as parts(part) group by part->>'type') as grouped;
  else
    resolved := public.monster_damage_amount(traits, p_details->>'type', amount, p_details);
  end if;
  update combatant_secrets set hp = greatest(0, hp - resolved) where combatant_id = p_target;
  select * into c from combatants where id = p_target;
  insert into events (campaign_id, author_id, kind, payload)
    values (c.campaign_id, auth.uid(), 'creature-damage', jsonb_build_object(
      'attacker', left(coalesce(p_attacker, ''), 100), 'target', c.name, 'targetId', c.id,
      'label', left(coalesce(p_label, ''), 120), 'amount', resolved, 'status', c.status));
  return jsonb_build_object('name', c.name, 'status', c.status, 'amount', resolved);
end $$;

create unique index if not exists events_zone_trigger_once on public.events (campaign_id, (payload->>'key'))
  where kind = 'spell-zone-trigger';

drop policy if exists events_spell_zone_insert on public.events;
create policy events_spell_zone_insert on public.events for insert with check (
  author_id = auth.uid() and public.is_member(campaign_id) and (
    (kind = 'spell-zone' and visibility = 'all') or
    (kind = 'spell-zone-trigger' and visibility = 'dm')
  )
);

-- A monster with a token but no initiative still has private combat stats.
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
    into eligible from combatants where campaign_id = p_campaign and not board_only and not (kind = 'monster' and status = 'derrotado');
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
      where campaign_id = p_campaign and not board_only and not (kind = 'monster' and status = 'derrotado');
    if players = 0 or monsters = 0 or (p_mode = 'boss' and monsters <> 1) then
      raise exception 'Revisá cuántos aliados y enemigos hay en la iniciativa.';
    end if;
    if p_order is null or cardinality(p_order) <> players + monsters or (
      select count(distinct c.id) from combatants c
      where c.id = any(p_order) and c.campaign_id = p_campaign
        and not c.board_only and not (c.kind = 'monster' and c.status = 'derrotado')
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

create or replace function public.remove_board_only_combatant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from combatants c where c.id = old.combatant_id and c.board_only
    and not exists (select 1 from map_tokens t where t.combatant_id = c.id);
  return old;
end $$;
drop trigger if exists map_tokens_remove_board_only_combatant on public.map_tokens;
create trigger map_tokens_remove_board_only_combatant after delete on public.map_tokens
  for each row execute function public.remove_board_only_combatant();

notify pgrst, 'reload schema';
commit;
