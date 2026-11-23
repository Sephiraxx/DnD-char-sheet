\set ON_ERROR_STOP 1
begin;
insert into auth.users values
 ('22000000-0000-0000-0000-000000000001', 'enemy-dm@x'),
 ('22000000-0000-0000-0000-000000000002', 'enemy-player@x');
insert into campaigns (id,name,code,dm_id) values
 ('22000000-0000-0000-0000-000000000011','Enemigos','ENEMY22','22000000-0000-0000-0000-000000000001');
insert into members (campaign_id,user_id,role) values
 ('22000000-0000-0000-0000-000000000011','22000000-0000-0000-0000-000000000001','dm'),
 ('22000000-0000-0000-0000-000000000011','22000000-0000-0000-0000-000000000002','player');
create function pg_temp.check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FALLA: %',label; end if; raise notice 'ok: %',label; end $$;
set role authenticated;
set request.jwt.claim.sub = '22000000-0000-0000-0000-000000000001';
select add_enemy_npc_to_initiative(
  create_enemy_npc('22000000-0000-0000-0000-000000000011','{"name":"Lyra","enemyNpc":true,"notes":"privado"}',
    '{"hp":25,"maxHP":25,"ac":14,"initiative":2,"saves":[["dex",2]],"conditions":[]}'), 15, false
);
select pg_temp.check('el enemigo tiene CA e iniciativa y datos privados de combate',
  exists (select 1 from combatants c join combatant_secrets s on s.combatant_id = c.id
    where c.campaign_id = '22000000-0000-0000-0000-000000000011'
      and c.kind = 'monster' and c.character_id is not null and c.init = 15 and s.hp = 25 and s.ac = 14));
select set_config('enemy_test.id',
  (select id::text from combatants where campaign_id = '22000000-0000-0000-0000-000000000011'),true);
set request.jwt.claim.sub = '22000000-0000-0000-0000-000000000002';
select pg_temp.check('jugador ve al enemigo en iniciativa, con ficha y detalles privados',
  exists (select 1 from combatants where id = current_setting('enemy_test.id')::uuid)
  and not exists (select 1 from character_summaries where id = current_setting('enemy_test.id')::uuid)
  and not exists (select 1 from characters where id = current_setting('enemy_test.id')::uuid)
  and not exists (select 1 from combatant_secrets where combatant_id = current_setting('enemy_test.id')::uuid));
select pg_temp.check('el daño se encola para la ficha del enemigo',
  damage_combatant(current_setting('enemy_test.id')::uuid,6,'Espada','PJ','{"type":"slashing","crit":true}')->>'pending' = 'true');
set request.jwt.claim.sub = '22000000-0000-0000-0000-000000000001';
select pg_temp.check('el DM recibe el daño pendiente',
  exists (select 1 from events where target_character = current_setting('enemy_test.id')::uuid
    and kind = 'damage' and applied_at is null and payload->>'amount' = '6' and payload->>'crit' = 'true'));
update characters set public_summary = public_summary || '{"hp":19,"conditions":["Derribado"]}'
  where id = current_setting('enemy_test.id')::uuid;
select pg_temp.check('al guardar la ficha se actualizan los PG y estados del enemigo',
  exists (select 1 from combatants c join combatant_secrets s on s.combatant_id = c.id
    where c.id = current_setting('enemy_test.id')::uuid and s.hp = 19 and c.status = 'herido'
      and c.conditions = array['Derribado']));
set constraints all immediate;
rollback;
