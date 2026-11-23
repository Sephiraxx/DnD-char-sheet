\set ON_ERROR_STOP 1
begin;
insert into auth.users values
 ('21000000-0000-0000-0000-000000000001', 'initiative-dm@x'),
 ('21000000-0000-0000-0000-000000000002', 'initiative-player@x');
insert into campaigns (id,name,code,dm_id) values
 ('21000000-0000-0000-0000-000000000011', 'Iniciativa', 'ORDER21', '21000000-0000-0000-0000-000000000001');
insert into members (campaign_id,user_id,role) values
 ('21000000-0000-0000-0000-000000000011', '21000000-0000-0000-0000-000000000001', 'dm'),
 ('21000000-0000-0000-0000-000000000011', '21000000-0000-0000-0000-000000000002', 'player');
insert into characters (id,campaign_id,owner_id,name,data) values
 ('21000000-0000-0000-0000-000000000021','21000000-0000-0000-0000-000000000011','21000000-0000-0000-0000-000000000002','Representante','{}'),
 ('21000000-0000-0000-0000-000000000022','21000000-0000-0000-0000-000000000011','21000000-0000-0000-0000-000000000001','Aliado','{}');
insert into combatants (id,campaign_id,character_id,kind,name,init,hidden) values
 ('21000000-0000-0000-0000-000000000031','21000000-0000-0000-0000-000000000011','21000000-0000-0000-0000-000000000021','pc','Representante',12,false),
 ('21000000-0000-0000-0000-000000000032','21000000-0000-0000-0000-000000000011','21000000-0000-0000-0000-000000000022','pc','Aliado',22,false),
 ('21000000-0000-0000-0000-000000000033','21000000-0000-0000-0000-000000000011',null,'monster','Jefe secreto',15,true);

create function pg_temp.check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FALLA: %',label; end if; raise notice 'ok: %',label; end $$;

set role authenticated;
set request.jwt.claim.sub = '21000000-0000-0000-0000-000000000002';
do $$ begin
  perform set_initiative_order('21000000-0000-0000-0000-000000000011','individual','{}');
  raise exception 'FALLA: un jugador cambió el modo';
exception when raise_exception then if sqlerrm like 'FALLA:%' then raise; end if; end $$;

set request.jwt.claim.sub = '21000000-0000-0000-0000-000000000001';
do $$ begin
  perform set_initiative_order(
    '21000000-0000-0000-0000-000000000011','boss',
    array['21000000-0000-0000-0000-000000000031','21000000-0000-0000-0000-000000000031','21000000-0000-0000-0000-000000000032']::uuid[]
  );
  raise exception 'FALLA: orden duplicado';
exception when raise_exception then if sqlerrm like 'FALLA:%' then raise; end if; end $$;

select set_initiative_order(
  '21000000-0000-0000-0000-000000000011', 'boss',
  array['21000000-0000-0000-0000-000000000031','21000000-0000-0000-0000-000000000033','21000000-0000-0000-0000-000000000032']::uuid[]
);
select pg_temp.check('el representante va primero aunque su iniciativa individual sea menor',
  advance_turn('21000000-0000-0000-0000-000000000011')->>'name' = 'Representante');
do $$ begin
  perform set_initiative_order('21000000-0000-0000-0000-000000000011','individual','{}');
  raise exception 'FALLA: se cambió el modo durante el combate';
exception when raise_exception then if sqlerrm like 'FALLA:%' then raise; end if; end $$;

set request.jwt.claim.sub = '21000000-0000-0000-0000-000000000002';
select pg_temp.check('el jugador avanza al turno del jefe sin leer su nombre',
  advance_turn('21000000-0000-0000-0000-000000000011')->>'name' = 'Turno oculto');

set request.jwt.claim.sub = '21000000-0000-0000-0000-000000000001';
update combatants set status = 'derrotado' where id = '21000000-0000-0000-0000-000000000033';
select pg_temp.check('derrotar al combatiente actual avanza al aliado sin volver al inicio',
  advance_turn('21000000-0000-0000-0000-000000000011')->>'name' = 'Aliado');
select pg_temp.check('la ronda se incrementa al volver al inicio',
  (advance_turn('21000000-0000-0000-0000-000000000011')->>'round')::int = 2);
select end_combat('21000000-0000-0000-0000-000000000011');
select set_initiative_order('21000000-0000-0000-0000-000000000011','individual','{}');
select pg_temp.check('volver a individual usa las tiradas originales',
  advance_turn('21000000-0000-0000-0000-000000000011')->>'name' = 'Aliado');
rollback;
