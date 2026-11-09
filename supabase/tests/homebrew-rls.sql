-- Homebrew (migración 015): colecciones privadas que se comparten con una mesa. Los miembros ven clases,
-- subclases y conjuros; las criaturas quedan para su autor. Cada «ok:» es una comprobación.
\set ON_ERROR_STOP 1
reset role;
insert into auth.users values ('00000000-0000-0000-0000-0000000000d7','hb-dm@x'),('00000000-0000-0000-0000-0000000000a7','hb-a@x'),('00000000-0000-0000-0000-0000000000e7','hb-e@x');
insert into campaigns (id,name,code,dm_id) values ('10000000-0000-0000-0000-0000000000c7','Mesa HB','HOMEBR','00000000-0000-0000-0000-0000000000d7');
insert into members values ('10000000-0000-0000-0000-0000000000c7','00000000-0000-0000-0000-0000000000d7','dm','DM'),('10000000-0000-0000-0000-0000000000c7','00000000-0000-0000-0000-0000000000a7','player','A');
create or replace function pg_temp.check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FALLA: %', label; end if; raise notice 'ok: %', label; end $$;

set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d7';
insert into library_books (id,title,lang,homebrew) values ('60000000-0000-0000-0000-000000000001','Mi homebrew','es',true);
insert into library_entries (book_id,kind,key,name,data) values
 ('60000000-0000-0000-0000-000000000001','class','hb-c-aaaaaaaaaaaa','Brujo de sangre','{}'),
 ('60000000-0000-0000-0000-000000000001','subclass','hb-s-aaaaaaaaaaaa','Linaje','{}'),
 ('60000000-0000-0000-0000-000000000001','spell','hb-s-bbbbbbbbbbbb','Lanza de sangre','{}'),
 ('60000000-0000-0000-0000-000000000001','monster','hb-c-cccccccccccc','Jefe secreto','{}');
select pg_temp.check('acepta clases y subclases', (select count(*) from library_entries where book_id = '60000000-0000-0000-0000-000000000001') = 4);
select pg_temp.check('la colección queda marcada como homebrew', (select homebrew from library_books where id = '60000000-0000-0000-0000-000000000001'));
do $$ begin
  begin insert into library_entries (book_id,kind,key,name,data) values ('60000000-0000-0000-0000-000000000001','race','x','X','{}'); raise exception 'FALLA: aceptó un tipo desconocido';
  exception when check_violation then raise notice 'ok: rechaza tipos desconocidos'; end;
end $$;

reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a7';
select pg_temp.check('sin compartir, el jugador no ve la colección', (select count(*) from library_books where homebrew) = 0);

reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d7';
update library_books set shared_with = '10000000-0000-0000-0000-0000000000c7' where id = '60000000-0000-0000-0000-000000000001';
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a7';
select pg_temp.check('compartida: ve clase, subclase y conjuro, no la criatura',
  (select array_agg(kind order by kind) from library_entries where book_id = '60000000-0000-0000-0000-000000000001') = array['class','spell','subclass']);
with u as (update library_entries set name = 'X' returning 1) select pg_temp.check('el jugador no edita homebrew ajeno', (select count(*) from u) = 0);
with u as (delete from library_entries returning 1) select pg_temp.check('el jugador no borra homebrew ajeno', (select count(*) from u) = 0);

reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e7';
select pg_temp.check('alguien ajeno no ve nada', (select count(*) from library_books where homebrew) = 0 and (select count(*) from library_entries) = 0);
reset role;
