\set ON_ERROR_STOP 1
begin;
create function pg_temp.check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FALLA: %',label; end if; raise notice 'ok: %',label; end $$;

alter table auth.users add column if not exists is_anonymous boolean not null default false;
insert into auth.users (id,email) values
 ('24000000-0000-0000-0000-000000000001','guest24@x'),
 ('24000000-0000-0000-0000-000000000002','account24@x'),
 ('24000000-0000-0000-0000-000000000003','player24@x');
update auth.users set is_anonymous = true where id = '24000000-0000-0000-0000-000000000001';
insert into campaigns (id,name,code,dm_id) values
 ('24000000-0000-0000-0000-000000000010','Mesa preparada','PREP24','24000000-0000-0000-0000-000000000001');
insert into members (campaign_id,user_id,role) values
 ('24000000-0000-0000-0000-000000000010','24000000-0000-0000-0000-000000000001','dm'),
 ('24000000-0000-0000-0000-000000000010','24000000-0000-0000-0000-000000000002','player'),
 ('24000000-0000-0000-0000-000000000010','24000000-0000-0000-0000-000000000003','player');

set role authenticated;
set request.jwt.claim.sub = '24000000-0000-0000-0000-000000000001';
insert into maps (id,campaign_id,name,image_path) values
 ('24000000-0000-0000-0000-000000000021','24000000-0000-0000-0000-000000000010','Mapa privado','24000000-0000-0000-0000-000000000010/map.webp');
insert into storage.objects (bucket_id,name) values
 ('maps','24000000-0000-0000-0000-000000000010/map.webp');
insert into prepared_encounters (campaign_id,id,data) values
 ('24000000-0000-0000-0000-000000000010','enc-local','{"id":"enc-local","name":"Guarida","notes":"Privado","monsters":[{"uid":"m-local","name":"Kobold"}]}');
insert into map_tokens (map_id,campaign_id,kind,name,stage,hidden) values
 ('24000000-0000-0000-0000-000000000021','24000000-0000-0000-0000-000000000010','monster','Kobold','enc:enc-local:m-local',true);
select set_config('test.prep_token', create_transfer_token(), true);

set request.jwt.claim.sub = '24000000-0000-0000-0000-000000000003';
select pg_temp.check('jugador no ve preparación privada ni mapas en borrador',
  (select count(*) from prepared_encounters) = 0 and (select count(*) from maps) = 0);
do $$
begin
  begin
    insert into prepared_encounters (campaign_id,id,data) values
      ('24000000-0000-0000-0000-000000000010','no','{"id":"no","name":"No","monsters":[]}');
    raise exception 'FALLA: jugador guardó un encuentro privado';
  exception when insufficient_privilege then null;
  end;
end $$;

set request.jwt.claim.sub = '24000000-0000-0000-0000-000000000002';
select redeem_transfer_token(current_setting('test.prep_token'));
select pg_temp.check('al juntar accesos, quien ya estaba como jugador pasa a DM',
  is_dm('24000000-0000-0000-0000-000000000010'));
select pg_temp.check('la cuenta recupera mapas privados, imágenes, encuentros y posiciones preparadas',
  exists (select from maps where name='Mapa privado')
  and exists (select from storage.objects where name like '%/map.webp')
  and exists (select from prepared_encounters where data->>'notes'='Privado')
  and exists (select from map_tokens where stage='enc:enc-local:m-local' and hidden));
update maps set name='Mapa renombrado' where id='24000000-0000-0000-0000-000000000021';
select pg_temp.check('la cuenta puede editar el mapa recuperado',
  exists(select from maps where name='Mapa renombrado'));
update prepared_encounters set data=null, revision=2 where id='enc-local' and revision=1;
insert into prepared_encounters (campaign_id,id,data) values
 ('24000000-0000-0000-0000-000000000010','enc-local','{"id":"enc-local","name":"Copia vieja","monsters":[]}')
 on conflict (campaign_id,id) do nothing;
with stale as (
  update prepared_encounters set data='{"id":"enc-local","name":"Viejo","monsters":[]}' where id='enc-local' and revision=1 returning 1
)
select pg_temp.check('una copia vieja no restaura un encuentro eliminado ni lo sobrescribe',
  not exists(select from stale) and exists(select from prepared_encounters where id='enc-local' and data is null and revision=2));

set request.jwt.claim.sub = '24000000-0000-0000-0000-000000000001';
select pg_temp.check('el acceso anterior ya no ve la preparación ni los mapas',
  (select count(*) from prepared_encounters) = 0 and (select count(*) from maps) = 0);
rollback;
