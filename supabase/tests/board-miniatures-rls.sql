\set ON_ERROR_STOP 1
begin;
insert into auth.users values
 ('89100000-0000-0000-0000-000000000001','mini-dm@x'),
 ('89100000-0000-0000-0000-000000000002','mini-player@x');
insert into campaigns (id, name, code, dm_id) values
 ('89100000-0000-0000-0000-000000000010','Miniaturas','MINI27','89100000-0000-0000-0000-000000000001');
insert into members (campaign_id, user_id, role) values
 ('89100000-0000-0000-0000-000000000010','89100000-0000-0000-0000-000000000001','dm'),
 ('89100000-0000-0000-0000-000000000010','89100000-0000-0000-0000-000000000002','player');
insert into maps (id, campaign_id, name) values
 ('89100000-0000-0000-0000-000000000020','89100000-0000-0000-0000-000000000010','Tablero');
insert into combatants (id, campaign_id, kind, name) values
 ('89100000-0000-0000-0000-000000000030','89100000-0000-0000-0000-000000000010','monster','Dragón rojo');
insert into combatant_secrets (combatant_id, campaign_id, hp, max_hp) values
 ('89100000-0000-0000-0000-000000000030','89100000-0000-0000-0000-000000000010',39,52);
insert into map_tokens (id, campaign_id, map_id, combatant_id, kind, name, size, model_form, creature_model) values
 ('89100000-0000-0000-0000-000000000040','89100000-0000-0000-0000-000000000010','89100000-0000-0000-0000-000000000020',
  '89100000-0000-0000-0000-000000000030','monster','Dragón rojo',2,'young','dragon-red');

create function pg_temp.check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FALLA: %', label; end if; end $$;

set role authenticated;
set request.jwt.claim.sub = '89100000-0000-0000-0000-000000000002';
select pg_temp.check('los PG son privados sin permiso del DM',
  (select not show_hp and hp_fraction is null from map_tokens where id = '89100000-0000-0000-0000-000000000040')
  and not exists (select 1 from combatant_secrets));
update map_tokens set show_hp = true, model_form = 'adult' where id = '89100000-0000-0000-0000-000000000040';
select pg_temp.check('el jugador no puede publicar los PG ni modificar la variante',
  (select not show_hp and model_form = 'young' from map_tokens where id = '89100000-0000-0000-0000-000000000040'));

set request.jwt.claim.sub = '89100000-0000-0000-0000-000000000001';
update map_tokens set show_hp = true, model_form = 'adult', size = 3 where id = '89100000-0000-0000-0000-000000000040';
set request.jwt.claim.sub = '89100000-0000-0000-0000-000000000002';
select pg_temp.check('el jugador solo recibe la proporción autorizada y la variante elegida',
  (select show_hp and hp_fraction = 0.75 and model_form = 'adult' and size = 3
    from map_tokens where id = '89100000-0000-0000-0000-000000000040')
  and not exists (select 1 from combatant_secrets));

set request.jwt.claim.sub = '89100000-0000-0000-0000-000000000001';
update combatant_secrets set hp = 13 where combatant_id = '89100000-0000-0000-0000-000000000030';
select pg_temp.check('el daño actualiza la proporción compartida',
  (select hp_fraction = 0.25 from map_tokens where id = '89100000-0000-0000-0000-000000000040'));
update map_tokens set show_hp = false where id = '89100000-0000-0000-0000-000000000040';
select pg_temp.check('el DM puede ocultarla de nuevo',
  (select hp_fraction is null from map_tokens where id = '89100000-0000-0000-0000-000000000040'));
rollback;
