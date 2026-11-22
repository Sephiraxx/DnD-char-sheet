-- Roles see a profile only for characters registered under their own account.
\set ON_ERROR_STOP 1
begin;
insert into auth.users values
  ('21000000-0000-0000-0000-000000000001', 'profile@x'),
  ('21000000-0000-0000-0000-000000000002', 'standard@x');
insert into account_d20_profiles values ('21000000-0000-0000-0000-000000000001', 1);

create function pg_temp.check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FALLA: %', label; end if; raise notice 'ok: %', label; end $$;

set role authenticated;
set request.jwt.claim.sub = '21000000-0000-0000-0000-000000000001';
select pg_temp.check('las fichas anteriores conservan el dado estándar',
  character_d20_profile('21000000-0000-0000-0000-000000000010') = 0);
select pg_temp.check('la creación registra la ficha para la cuenta',
  character_d20_profile('21000000-0000-0000-0000-000000000010', true) = 1);
select pg_temp.check('la ficha registrada conserva el perfil',
  character_d20_profile('21000000-0000-0000-0000-000000000010') = 1);

set request.jwt.claim.sub = '21000000-0000-0000-0000-000000000002';
select pg_temp.check('otra cuenta conserva el dado estándar para el mismo identificador',
  character_d20_profile('21000000-0000-0000-0000-000000000010', true) = 0);
select pg_temp.check('los perfiles están fuera del acceso directo',
  not has_table_privilege('account_d20_profiles', 'select'));
rollback;
