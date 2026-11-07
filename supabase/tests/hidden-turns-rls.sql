-- Ejecutar con tools/test-sql.sh: datos aislados, sin tocar la mesa real.
\set ON_ERROR_STOP 1
reset role;
select set_config('request.jwt.claim.sub','',false);
create or replace function pg_temp.check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FALLA: %',label; end if; raise notice 'ok: %',label; end $$;
insert into auth.users values ('a0000000-0000-0000-0000-00000000000d','hidden-dm@x'),('a0000000-0000-0000-0000-00000000000a','hidden-player@x'),('a0000000-0000-0000-0000-00000000000e','hidden-outsider@x');
insert into campaigns(id,name,code,dm_id) values ('a1000000-0000-0000-0000-000000000001','Turnos privados','HIDDEN','a0000000-0000-0000-0000-00000000000d');
insert into members(campaign_id,user_id,role,display_name) values ('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000d','dm','DM'),('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','player','Jugador');
insert into characters(id,campaign_id,owner_id,name,data) values ('a2000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','Jugador','{}');
insert into combatants(id,campaign_id,character_id,kind,name,init,hidden) values
 ('a3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','pc','Jugador',30,false),
 ('a3000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001',null,'monster','Revenant secreto',20,true),
 ('a3000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001',null,'monster','Bruja oculta en mapa',10,false),
 ('a3000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000001',null,'monster','Goblin visible',5,false);
insert into maps(id,campaign_id,name,image_path) values ('a4000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','Cripta','a1000000-0000-0000-0000-000000000001/map.webp');
insert into boards(campaign_id,map_id) values ('a1000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000001');
insert into map_tokens(campaign_id,map_id,kind,combatant_id,name,hidden) values
 ('a1000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000001','monster','a3000000-0000-0000-0000-000000000002','Revenant secreto',false),
 ('a1000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000001','monster','a3000000-0000-0000-0000-000000000003','Bruja oculta en mapa',true),
 ('a1000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000001','monster','a3000000-0000-0000-0000-000000000004','Goblin visible',false);
set role authenticated; set request.jwt.claim.sub='a0000000-0000-0000-0000-00000000000d';
select public.advance_turn('a1000000-0000-0000-0000-000000000001');
reset role; set role authenticated; set request.jwt.claim.sub='a0000000-0000-0000-0000-00000000000a';
select pg_temp.check('jugador no ve criaturas ocultas ni por iniciativa ni por mapa',(select count(*) from combatants where campaign_id='a1000000-0000-0000-0000-000000000001')=2);
select pg_temp.check('jugador no ve ficha visible de criatura oculta en iniciativa',(select count(*) from map_tokens where campaign_id='a1000000-0000-0000-0000-000000000001')=1);
select pg_temp.check('pasar turno hacia criatura oculta no devuelve su nombre',(public.advance_turn('a1000000-0000-0000-0000-000000000001')->>'name')='Turno oculto');
select pg_temp.check('evento de turno oculto no revela nombre',(select payload->>'name' from events where campaign_id='a1000000-0000-0000-0000-000000000001' and kind='turn' order by id desc limit 1)='Turno oculto');
do $$ begin
  perform public.advance_turn('a1000000-0000-0000-0000-000000000001');
  raise exception 'FALLA: jugador pasó turno de criatura oculta';
exception when raise_exception then if sqlerrm like 'FALLA:%' then raise; end if; end $$;
reset role; set role authenticated; set request.jwt.claim.sub='a0000000-0000-0000-0000-00000000000d';
select pg_temp.check('DM ve criaturas y fichas ocultas',(select count(*) from combatants where campaign_id='a1000000-0000-0000-0000-000000000001')=4 and (select count(*) from map_tokens where campaign_id='a1000000-0000-0000-0000-000000000001')=3);
select pg_temp.check('DM conserva nombre real al avanzar al turno oculto del mapa',(public.advance_turn('a1000000-0000-0000-0000-000000000001')->>'name')='Bruja oculta en mapa');
select pg_temp.check('criatura oculta por mapa tiene evento anónimo',(select payload->>'name' from events where campaign_id='a1000000-0000-0000-0000-000000000001' and kind='turn' order by id desc limit 1)='Turno oculto');
update map_tokens set hidden=false where combatant_id='a3000000-0000-0000-0000-000000000003';
reset role; set role authenticated; set request.jwt.claim.sub='a0000000-0000-0000-0000-00000000000a';
select pg_temp.check('mostrar explícitamente revela la criatura',(select count(*) from combatants where id='a3000000-0000-0000-0000-000000000003')=1);
reset role; set role authenticated; set request.jwt.claim.sub='a0000000-0000-0000-0000-00000000000e';
select pg_temp.check('ajeno no obtiene identidad ni visibilidad',public.combatant_is_hidden('a3000000-0000-0000-0000-000000000004'));
reset role;
