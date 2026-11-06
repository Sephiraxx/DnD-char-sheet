-- Permisos del botín (migración 013): el DM guarda el objeto del catálogo y la reserva; un jugador
-- reclama lo libre, no lo reservado para otra ficha, y no puede cambiar el objeto. Cada «ok:» es una comprobación.
\set ON_ERROR_STOP 1
insert into auth.users values ('00000000-0000-0000-0000-0000000000d2','dm2@x'),('00000000-0000-0000-0000-0000000000a2','a2@x'),('00000000-0000-0000-0000-0000000000b2','b2@x');
insert into campaigns (id,name,code,dm_id) values ('10000000-0000-0000-0000-0000000000c2','Mesa B','BOTIN1','00000000-0000-0000-0000-0000000000d2');
insert into members values ('10000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000d2','dm','DM'),('10000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000a2','player','A'),('10000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000b2','player','B');
insert into characters (id,campaign_id,owner_id,name,data) values ('20000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000a2','Ana','{}'),('20000000-0000-0000-0000-0000000000b2','10000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000b2','Beto','{}');
create function pg_temp.check(label text, ok boolean) returns void language plpgsql as $$
begin if not ok then raise exception 'FALLA: %', label; end if; raise notice 'ok: %', label; end $$;

set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d2';
insert into loot (id,campaign_id,name,qty,data) values
 ('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-0000000000c2','Poción de curación',2,'{"ref":{"kind":"magic","id":"potion-of-healing"}}'),
 ('60000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-0000000000c2','Anillo de protección',1,'{"ref":{"kind":"magic","id":"ring-of-protection"},"for":"20000000-0000-0000-0000-0000000000b2"}');
select pg_temp.check('el DM guarda el objeto del catálogo', (select data->'ref'->>'id' from loot where id = '60000000-0000-0000-0000-000000000001') = 'potion-of-healing');
do $$ begin
  begin insert into loot (campaign_id,name,data) values ('10000000-0000-0000-0000-0000000000c2','X', jsonb_build_object('t', repeat('x', 3000))); raise exception 'FALLA: aceptó datos enormes';
  exception when check_violation then raise notice 'ok: los datos del botín tienen tope'; end;
end $$;

-- Ana: toma la poción, no puede cambiar qué objeto es ni tomar el anillo reservado para Beto.
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
update loot set claimed_character = '20000000-0000-0000-0000-0000000000a2', claimed_name = 'Ana', data = '{"ref":{"kind":"magic","id":"belt-of-storm-giant-strength"}}', qty = 99
 where id = '60000000-0000-0000-0000-000000000001';
select pg_temp.check('Ana reclama lo libre', (select claimed_name from loot where id = '60000000-0000-0000-0000-000000000001') = 'Ana');
select pg_temp.check('Ana no cambia el objeto ni la cantidad', (select data->'ref'->>'id' = 'potion-of-healing' and qty = 2 from loot where id = '60000000-0000-0000-0000-000000000001'));
do $$ begin
  begin update loot set claimed_character = '20000000-0000-0000-0000-0000000000a2', claimed_name = 'Ana' where id = '60000000-0000-0000-0000-000000000002'; raise exception 'FALLA: tomó lo reservado para otro';
  exception when raise_exception then
    if sqlerrm like 'FALLA%' then raise; end if;
    raise notice 'ok: no toma lo reservado para otra ficha';
  end;
end $$;

-- Beto sí puede.
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
update loot set claimed_character = '20000000-0000-0000-0000-0000000000b2', claimed_name = 'Beto' where id = '60000000-0000-0000-0000-000000000002';
select pg_temp.check('la ficha reservada lo reclama', (select claimed_name from loot where id = '60000000-0000-0000-0000-000000000002') = 'Beto');
reset role;
