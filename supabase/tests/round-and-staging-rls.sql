\set ON_ERROR_STOP 1
begin;
insert into auth.users values ('23000000-0000-0000-0000-000000000001','round-dm@x');
insert into campaigns (id,name,code,dm_id) values
 ('23000000-0000-0000-0000-000000000010','Rondas','ROUND23','23000000-0000-0000-0000-000000000001');
insert into members (campaign_id,user_id,role) values
 ('23000000-0000-0000-0000-000000000010','23000000-0000-0000-0000-000000000001','dm');
insert into characters (id,campaign_id,owner_id,name,data) values
 ('23000000-0000-0000-0000-000000000039','23000000-0000-0000-0000-000000000010','23000000-0000-0000-0000-000000000001','Tizne','{"friendlyNpc":true}');
insert into combatants (id,campaign_id,kind,name,character_id) values
 ('23000000-0000-0000-0000-000000000031','23000000-0000-0000-0000-000000000010','pc','PJ 1',null),
 ('23000000-0000-0000-0000-000000000032','23000000-0000-0000-0000-000000000010','monster','Enemigo 1',null),
 ('23000000-0000-0000-0000-000000000033','23000000-0000-0000-0000-000000000010','pc','Tizne','23000000-0000-0000-0000-000000000039'),
 ('23000000-0000-0000-0000-000000000034','23000000-0000-0000-0000-000000000010','monster','Enemigo 2',null);
insert into maps (id,campaign_id,name) values ('23000000-0000-0000-0000-000000000041','23000000-0000-0000-0000-000000000010','Mapa');
insert into map_tokens (campaign_id,map_id,kind,name,hidden,x,y,stage) values
 ('23000000-0000-0000-0000-000000000010','23000000-0000-0000-0000-000000000041','monster','Tizne',true,4,5,'enc:test:tizne');
insert into map_tokens (campaign_id,map_id,kind,name,character_id,x,y) values
 ('23000000-0000-0000-0000-000000000010','23000000-0000-0000-0000-000000000041','pc','Tizne','23000000-0000-0000-0000-000000000039',2,3);
create function pg_temp.check(label text,ok boolean) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FALLA: %',label; end if; raise notice 'ok: %',label; end $$;
set role authenticated;
set request.jwt.claim.sub = '23000000-0000-0000-0000-000000000001';
select link_prepared_npc('23000000-0000-0000-0000-000000000010','enc:test:tizne','23000000-0000-0000-0000-000000000033');
select pg_temp.check('el aliado preparado ocupa la posición elegida sin duplicados',
  (select count(*) from map_tokens where character_id = '23000000-0000-0000-0000-000000000039') = 1
  and exists (select 1 from map_tokens where stage = 'enc:test:tizne' and kind = 'pc' and not hidden and x=4 and y=5));
select set_initiative_order('23000000-0000-0000-0000-000000000010','alternating',
 array['23000000-0000-0000-0000-000000000031','23000000-0000-0000-0000-000000000032',
       '23000000-0000-0000-0000-000000000033','23000000-0000-0000-0000-000000000034']::uuid[]);
select pg_temp.check('la party empieza',advance_turn('23000000-0000-0000-0000-000000000010')->>'name'='PJ 1');
update combatants set status='derrotado' where name='Enemigo 1' and campaign_id='23000000-0000-0000-0000-000000000010';
select pg_temp.check('si cae el siguiente enemigo avanza el otro enemigo',
  advance_turn('23000000-0000-0000-0000-000000000010')->>'name'='Enemigo 2');
insert into combatants (id,campaign_id,kind,name,init) values
 ('23000000-0000-0000-0000-000000000035','23000000-0000-0000-0000-000000000010','monster','Refuerzo',50);
delete from combatants where id='23000000-0000-0000-0000-000000000034';
select pg_temp.check('quitar al combatiente actual no repite un turno',
  advance_turn('23000000-0000-0000-0000-000000000010')->>'name'='Tizne');
select pg_temp.check('el refuerzo espera a la ronda siguiente',
  (advance_turn('23000000-0000-0000-0000-000000000010')->>'round')::int=2);
select pg_temp.check('el refuerzo actúa en la ronda siguiente',
  advance_turn('23000000-0000-0000-0000-000000000010')->>'name'='Refuerzo');
delete from combatants where id='23000000-0000-0000-0000-000000000033';
select pg_temp.check('retirar al aliado vuelve a ocultar su ficha preparada',
  exists(select 1 from map_tokens where stage='enc:test:tizne' and hidden and kind='monster' and character_id is null and combatant_id is null));
rollback;
