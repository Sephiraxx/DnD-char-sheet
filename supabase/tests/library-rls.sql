-- Permisos de la biblioteca (migraciones 011 y 012): lo importado es privado; un libro compartido con una mesa
-- deja ver sus conjuros y objetos a los miembros, nunca las criaturas. Cada «ok:» es una comprobación.
\set ON_ERROR_STOP 1
insert into auth.users values ('00000000-0000-0000-0000-0000000000d1','dm@x'),('00000000-0000-0000-0000-0000000000a1','a@x'),('00000000-0000-0000-0000-0000000000e1','e@x');
insert into campaigns (id,name,code,dm_id) values ('10000000-0000-0000-0000-0000000000c1','Mesa L','LIBROS','00000000-0000-0000-0000-0000000000d1');
insert into members values ('10000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000d1','dm','DM'),('10000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','player','A');
create function pg_temp.check(label text, ok boolean) returns void language plpgsql as $$
begin if not ok then raise exception 'FALLA: %', label; end if; raise notice 'ok: %', label; end $$;

-- El DM importa un libro.
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
insert into library_books (id,title,lang) values ('50000000-0000-0000-0000-000000000001','Manual de Monstruos','es');
insert into library_entries (book_id,kind,key,name,data) values
 ('50000000-0000-0000-0000-000000000001','monster','mm:goblin','Goblin','{"ac":15}'),
 ('50000000-0000-0000-0000-000000000001','spell','mm:bola','Bola','{}'),
 ('50000000-0000-0000-0000-000000000001','item','mm:anillo','Anillo','{}'),
 ('50000000-0000-0000-0000-000000000001','feature','sub:x:Y','Rasgo','{}'),
 ('50000000-0000-0000-0000-000000000001','feat','feat:alert','Alerta','{}');
select pg_temp.check('el dueño ve sus entradas', (select count(*) from library_entries) = 5);
do $$ begin
  begin update library_books set shared_with = '10000000-0000-0000-0000-0000000000ff'; raise exception 'FALLA: compartió con una mesa ajena';
  exception when others then raise notice 'ok: no comparte con una mesa de la que no es miembro'; end;
end $$;

-- Jugador de la mesa: todavía no ve nada.
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.check('un jugador no ve un libro privado', (select count(*) from library_books) = 0 and (select count(*) from library_entries) = 0);

-- El DM lo comparte con su mesa.
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
update library_books set shared_with = '10000000-0000-0000-0000-0000000000c1';
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.check('compartido: el jugador ve el libro', (select count(*) from library_books) = 1);
select pg_temp.check('compartido: ve conjuros, objetos, rasgos y dotes, no criaturas', (select array_agg(kind order by kind) from library_entries) = array['feat','feature','item','spell']);
with u as (update library_entries set name = 'X' returning 1) select pg_temp.check('el jugador no edita entradas ajenas', (select count(*) from u) = 0);
with u as (delete from library_books returning 1) select pg_temp.check('el jugador no borra el libro', (select count(*) from u) = 0);
do $$ begin
  begin insert into library_entries (book_id,kind,key,name,data) values ('50000000-0000-0000-0000-000000000001','spell','x','X','{}'); raise exception 'FALLA: agregó entradas a un libro ajeno';
  exception when insufficient_privilege then raise notice 'ok: no agrega entradas a un libro ajeno'; end;
end $$;

-- Alguien ajeno a la mesa.
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select pg_temp.check('alguien ajeno no ve nada', (select count(*) from library_books) = 0 and (select count(*) from library_entries) = 0);

-- Borrar el libro borra sus entradas.
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
delete from library_books;
select pg_temp.check('borrar el libro borra sus entradas', (select count(*) from library_entries) = 0);
reset role;
