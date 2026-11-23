-- DM-owned sheets for enemies. Their character data and exact resources stay private.
begin;
alter table public.characters add column if not exists enemy_npc boolean not null default false;

create or replace function public.sync_character_summary() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.enemy_npc then
    delete from character_summaries where id = new.id;
  else
    insert into character_summaries (id, campaign_id, owner_id, name, summary, updated_at)
      values (new.id, new.campaign_id, new.owner_id, new.name, new.public_summary, new.updated_at)
      on conflict (id) do update set campaign_id = excluded.campaign_id, owner_id = excluded.owner_id,
        name = excluded.name, summary = excluded.summary, updated_at = excluded.updated_at;
  end if;
  return new;
end $$;
delete from public.character_summaries s using public.characters c where s.id = c.id and c.enemy_npc;

create or replace function public.check_enemy_npc() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from characters c join campaigns t on t.id = c.campaign_id
    where c.id = new.id and c.enemy_npc
      and (t.dm_id <> c.owner_id or c.data->'enemyNpc' is distinct from 'true'::jsonb)
  ) then raise exception 'Solo el DM puede guardar PNJ enemigos.'; end if;
  return new;
end $$;
revoke all on function public.check_enemy_npc() from public;
drop trigger if exists check_enemy_npc on public.characters;
create constraint trigger check_enemy_npc after insert or update on public.characters
  deferrable initially deferred for each row execute function public.check_enemy_npc();

create or replace function public.create_enemy_npc(p_campaign uuid, p_data jsonb, p_summary jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare result uuid;
begin
  if not is_dm(p_campaign) then raise exception 'Solo el DM puede crear PNJ enemigos.'; end if;
  if p_data->'enemyNpc' is distinct from 'true'::jsonb or jsonb_typeof(p_summary) is distinct from 'object'
  then raise exception 'Ficha de enemigo inválida.'; end if;
  insert into characters (campaign_id, owner_id, name, data, public_summary, enemy_npc)
    values (p_campaign, auth.uid(), p_data->>'name', p_data, p_summary, true)
    returning id into result;
  return result;
end $$;
revoke all on function public.create_enemy_npc(uuid, jsonb, jsonb) from public;
grant execute on function public.create_enemy_npc(uuid, jsonb, jsonb) to authenticated;

-- Copy only the values the combat tracker needs. The summary stays on the private character row.
create or replace function public.project_enemy_npc(p_id uuid, p_summary jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  max_hp int := greatest(1, least(99999, (p_summary->>'maxHP')::int));
  hp int := greatest(0, least(max_hp, (p_summary->>'hp')::int));
  ac int := greatest(0, least(40, (p_summary->>'ac')::int));
  saves jsonb;
begin
  select coalesce(jsonb_object_agg(pair->>0,pair->1),'{}'::jsonb) into saves
    from jsonb_array_elements(coalesce(p_summary->'saves', '[]'::jsonb)) pair;
  insert into combatant_secrets (combatant_id,campaign_id,hp,max_hp,ac,saves)
    select id,campaign_id,hp,max_hp,ac,saves from combatants where character_id = p_id and kind = 'monster'
    on conflict (combatant_id) do update set hp = excluded.hp, max_hp = excluded.max_hp, ac = excluded.ac, saves = excluded.saves
    where (combatant_secrets.hp, combatant_secrets.max_hp, combatant_secrets.ac, combatant_secrets.saves)
      is distinct from (excluded.hp, excluded.max_hp, excluded.ac, excluded.saves);
  update combatants set conditions = array(select jsonb_array_elements_text(coalesce(p_summary->'conditions','[]'::jsonb)))
    where character_id = p_id and kind = 'monster'
      and conditions is distinct from array(select jsonb_array_elements_text(coalesce(p_summary->'conditions','[]'::jsonb)));
end $$;
revoke all on function public.project_enemy_npc(uuid, jsonb) from public;

create or replace function public.sync_enemy_npc() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.enemy_npc and new.public_summary is distinct from old.public_summary then
    perform project_enemy_npc(new.id, new.public_summary);
  end if;
  return new;
end $$;
revoke all on function public.sync_enemy_npc() from public;
drop trigger if exists sync_enemy_npc on public.characters;
create trigger sync_enemy_npc after update on public.characters for each row execute function public.sync_enemy_npc();

create or replace function public.add_enemy_npc_to_initiative(p_character uuid, p_init int, p_hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
declare c characters;
begin
  select * into c from characters where id = p_character and enemy_npc for update;
  if not found or not is_dm(c.campaign_id) then raise exception 'PNJ enemigo no encontrado.'; end if;
  insert into combatants (id, campaign_id, kind, character_id, name, init, tiebreak, hidden)
    values (c.id, c.campaign_id, 'monster', c.id, c.name, p_init, (c.public_summary->>'initiative')::int, p_hidden)
    on conflict (id) do nothing;
  perform project_enemy_npc(c.id, c.public_summary);
end $$;
revoke all on function public.add_enemy_npc_to_initiative(uuid, int, boolean) from public;
grant execute on function public.add_enemy_npc_to_initiative(uuid, int, boolean) to authenticated;

create or replace function public.resolve_attack(p_target uuid, p_total int, p_natural int, p_label text, p_attacker text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c combatants;
  s combatant_secrets;
  hit boolean;
begin
  select * into c from combatants where id = p_target;
  if not found or not is_member(c.campaign_id) or (not is_dm(c.campaign_id) and combatant_is_hidden(c.id))
    then raise exception 'Objetivo no encontrado.'; end if;
  if c.kind <> 'monster' then raise exception 'Solo se resuelven así los ataques contra criaturas.'; end if;
  select * into s from combatant_secrets where combatant_id = p_target;
  hit := p_natural = 20 or (p_natural <> 1 and p_total >= coalesce(s.ac, 10));
  insert into events (campaign_id, author_id, kind, payload)
    values (c.campaign_id, auth.uid(), 'attack', jsonb_build_object(
      'attacker', left(coalesce(p_attacker, ''), 100), 'target', c.name, 'targetId', c.id,
      'label', left(coalesce(p_label, ''), 120), 'total', p_total, 'natural', p_natural, 'hit', hit));
  return jsonb_build_object('hit', hit, 'name', c.name, 'status', c.status);
end $$;

create or replace function public.damage_combatant(p_target uuid, p_amount int, p_label text, p_attacker text, p_details jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c combatants;
  amount int := greatest(0, least(coalesce(p_amount, 0), 9999));
begin
  select * into c from combatants where id = p_target;
  if not found or not is_member(c.campaign_id) or (not is_dm(c.campaign_id) and combatant_is_hidden(c.id))
    then raise exception 'Objetivo no encontrado.'; end if;
  if c.kind <> 'monster' then raise exception 'Solo se aplica así el daño a criaturas.'; end if;
  if c.character_id is not null and exists (select 1 from characters where id = c.character_id and enemy_npc) then
    if amount > 0 then
      insert into events(campaign_id,author_id,kind,target_character,visibility,payload)
        values (c.campaign_id,auth.uid(),'damage',c.character_id,'dm',jsonb_build_object(
          'amount',amount,'source',left(coalesce(p_label,''),120),'from',left(coalesce(p_attacker,''),100),
          'crit',coalesce(p_details->'crit' = 'true'::jsonb,false),'type',left(coalesce(p_details->>'type',''),40)));
    end if;
    return jsonb_build_object('name',c.name,'status',c.status,'pending',amount > 0);
  end if;
  update combatant_secrets set hp = greatest(0, hp - amount) where combatant_id = p_target;
  select * into c from combatants where id = p_target;
  insert into events (campaign_id, author_id, kind, payload)
    values (c.campaign_id, auth.uid(), 'creature-damage', jsonb_build_object(
      'attacker', left(coalesce(p_attacker, ''), 100), 'target', c.name, 'targetId', c.id,
      'label', left(coalesce(p_label, ''), 120), 'amount', amount, 'status', c.status));
  return jsonb_build_object('name', c.name, 'status', c.status);
end $$;
revoke all on function public.damage_combatant(uuid, int, text, text, jsonb) from public;
grant execute on function public.damage_combatant(uuid, int, text, text, jsonb) to authenticated;
create or replace function public.damage_combatant(p_target uuid, p_amount int, p_label text, p_attacker text)
returns jsonb language sql security definer set search_path = public as $$
  select public.damage_combatant(p_target, p_amount, p_label, p_attacker, '{}'::jsonb);
$$;
notify pgrst, 'reload schema';
commit;
