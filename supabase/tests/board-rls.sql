-- Permisos del tablero (migración 008): qué ve y qué puede tocar cada jugador, el DM y alguien ajeno.
-- Se corre con tools/test-sql.sh; cada línea «ok:» es una comprobación superada.
\set ON_ERROR_STOP 1
-- Datos de prueba (como superusuario).
insert into auth.users values ('00000000-0000-0000-0000-00000000000d','dm@x'),('00000000-0000-0000-0000-00000000000a','a@x'),('00000000-0000-0000-0000-00000000000b','b@x'),('00000000-0000-0000-0000-00000000000e','e@x');
insert into campaigns (id,name,code,dm_id) values ('10000000-0000-0000-0000-000000000001','Mesa','ABCDEF','00000000-0000-0000-0000-00000000000d');
insert into members values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000d','dm','DM'),('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','player','A'),('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b','player','B');
insert into characters (id,campaign_id,owner_id,name,data) values ('20000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','Ana','{}'),('20000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b','Beto','{}');
insert into maps (id,campaign_id,name,image_path) values ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Cripta','10000000-0000-0000-0000-000000000001/cripta.webp'),('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Secreto','10000000-0000-0000-0000-000000000001/secreto.webp');
insert into boards values ('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001');
insert into map_tokens (id,campaign_id,map_id,kind,character_id,name,x,y,hidden) values
 ('40000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','pc','20000000-0000-0000-0000-00000000000a','Ana',1,1,false),
 ('40000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','pc','20000000-0000-0000-0000-00000000000b','Beto',2,1,false),
 ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','monster',null,'Goblin',5,5,false),
 ('40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','monster',null,'Emboscada',6,6,true),
 ('40000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','monster',null,'Jefe',1,1,false);
insert into storage.objects (bucket_id,name) values ('maps','10000000-0000-0000-0000-000000000001/cripta.webp'),('maps','10000000-0000-0000-0000-000000000001/secreto.webp');

create function pg_temp.check(label text, ok boolean) returns void language plpgsql as $$
begin if not ok then raise exception 'FALLA: %', label; end if; raise notice 'ok: %', label; end $$;

-- Jugador A.
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check('jugador ve solo el mapa activo', (select count(*) from maps) = 1);
select pg_temp.check('jugador ve fichas visibles del mapa activo', (select count(*) from map_tokens) = 3);
select pg_temp.check('jugador lee solo la imagen activa', (select array_agg(name) from storage.objects) = array['10000000-0000-0000-0000-000000000001/cripta.webp']);
update map_tokens set x = 4, y = 3, name = 'Hackeo', hidden = true, size = 6 where id = '40000000-0000-0000-0000-00000000000a';
reset role; set role authenticated;
select pg_temp.check('mueve su ficha pero no cambia nada más', (select x = 4 and y = 3 and name = 'Ana' and not hidden and size = 1 from map_tokens where id = '40000000-0000-0000-0000-00000000000a'));
with u as (update map_tokens set x = 9 where id = '40000000-0000-0000-0000-00000000000b' returning 1) select pg_temp.check('no mueve la ficha de otro', (select count(*) from u) = 0);
with u as (update map_tokens set x = 9 where id = '40000000-0000-0000-0000-000000000001' returning 1) select pg_temp.check('no mueve criaturas', (select count(*) from u) = 0);
with u as (update maps set fog = '{"on":false}' returning 1) select pg_temp.check('no toca la niebla', (select count(*) from u) = 0);
with u as (update boards set map_id = '30000000-0000-0000-0000-000000000002' returning 1) select pg_temp.check('no cambia el mapa activo', (select count(*) from u) = 0);
do $$ begin
  begin insert into map_tokens (campaign_id,map_id,kind,name) values ('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','npc','X'); raise exception 'FALLA: jugador insertó ficha';
  exception when insufficient_privilege then raise notice 'ok: jugador no crea fichas'; end;
  begin insert into storage.objects (bucket_id,name) values ('maps','10000000-0000-0000-0000-000000000001/x.webp'); raise exception 'FALLA: jugador subió imagen';
  exception when insufficient_privilege then raise notice 'ok: jugador no sube imágenes'; end;
end $$;

-- Ajeno a la mesa.
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
select pg_temp.check('ajeno no ve mapas ni fichas ni imágenes', (select count(*) from maps) + (select count(*) from map_tokens) + (select count(*) from storage.objects) = 0);

-- DM.
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select pg_temp.check('DM ve todos los mapas, fichas e imágenes', (select count(*) from maps) = 2 and (select count(*) from map_tokens) = 5 and (select count(*) from storage.objects) = 2);
update map_tokens set hidden = false, name = 'Emboscada!' where id = '40000000-0000-0000-0000-000000000002';
select pg_temp.check('DM edita cualquier ficha', (select name = 'Emboscada!' and not hidden from map_tokens where id = '40000000-0000-0000-0000-000000000002'));
insert into storage.objects (bucket_id,name) values ('maps','10000000-0000-0000-0000-000000000001/nuevo.webp');
update boards set map_id = '30000000-0000-0000-0000-000000000002';
-- Cambió el mapa: el jugador ahora ve el otro.
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check('al cambiar el mapa, el jugador ve el nuevo', (select name from maps) = 'Secreto' and (select count(*) from map_tokens) = 1);
with u as (update map_tokens set x = 2 where id = '40000000-0000-0000-0000-00000000000a' returning 1) select pg_temp.check('no mueve su ficha en un mapa que no está en el tablero', (select count(*) from u) = 0);

-- Migración 010: fichas preparadas.
reset role;
update map_tokens set stage = 'enc:e1:m1', hidden = true where id = '40000000-0000-0000-0000-000000000003';
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check('jugador no ve criaturas preparadas', (select count(*) from map_tokens where stage is not null) = 0);
update map_tokens set stage = 'hack' where id = '40000000-0000-0000-0000-00000000000a';
reset role; set role authenticated;
select pg_temp.check('jugador no cambia la marca de preparación', (select stage is null from map_tokens where id = '40000000-0000-0000-0000-00000000000a'));
reset role;
insert into combatants (id, campaign_id, kind, name) values ('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','monster','Jefe');
update map_tokens set combatant_id = '50000000-0000-0000-0000-000000000001', hidden = false where stage = 'enc:e1:m1';
delete from combatants where id = '50000000-0000-0000-0000-000000000001';
select pg_temp.check('si la criatura sale del combate, la ficha preparada queda', (select combatant_id is null and stage = 'enc:e1:m1' from map_tokens where id = '40000000-0000-0000-0000-000000000003'));
