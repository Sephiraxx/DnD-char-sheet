\set ON_ERROR_STOP 1
begin;
insert into auth.users values
 ('89200000-0000-0000-0000-000000000001','facing-dm@x'),
 ('89200000-0000-0000-0000-000000000002','facing-pc@x');
insert into campaigns (id, name, code, dm_id) values
 ('89200000-0000-0000-0000-000000000010','Giros','GIRO28','89200000-0000-0000-0000-000000000001');
insert into members (campaign_id, user_id, role) values
 ('89200000-0000-0000-0000-000000000010','89200000-0000-0000-0000-000000000001','dm'),
 ('89200000-0000-0000-0000-000000000010','89200000-0000-0000-0000-000000000002','player');
insert into characters (id, campaign_id, owner_id, name, data) values
 ('89200000-0000-0000-0000-000000000020','89200000-0000-0000-0000-000000000010','89200000-0000-0000-0000-000000000002','PJ','{}');
insert into maps (id, campaign_id, name) values
 ('89200000-0000-0000-0000-000000000030','89200000-0000-0000-0000-000000000010','Mapa');
insert into boards (campaign_id, map_id) values
 ('89200000-0000-0000-0000-000000000010','89200000-0000-0000-0000-000000000030');
insert into map_tokens (id, campaign_id, map_id, character_id, name, kind) values
 ('89200000-0000-0000-0000-000000000040','89200000-0000-0000-0000-000000000010','89200000-0000-0000-0000-000000000030','89200000-0000-0000-0000-000000000020','PJ','pc'),
 ('89200000-0000-0000-0000-000000000041','89200000-0000-0000-0000-000000000010','89200000-0000-0000-0000-000000000030',null,'Rata','monster');

create function pg_temp.pose(changes jsonb) returns setof public.map_tokens language sql as $$
  select * from public.commit_board_token_poses('89200000-0000-0000-0000-000000000010', '89200000-0000-0000-0000-000000000030', changes)
$$;
set role authenticated;
set request.jwt.claim.sub = '89200000-0000-0000-0000-000000000002';
do $$ begin
  perform pg_temp.pose('[{"id":"89200000-0000-0000-0000-000000000040","before":{"facing":0},"patch":{"facing":6,"facing_manual":true}}]');
  begin
    perform pg_temp.pose('[{"id":"89200000-0000-0000-0000-000000000040","before":{"facing":6},"patch":{"facing":5}},{"id":"89200000-0000-0000-0000-000000000041","before":{"facing":0},"patch":{"facing":5}}]');
    raise exception 'La rotación de monstruos debía estar bloqueada';
  exception when raise_exception then
    if sqlerrm <> 'No podés girar o mover esa ficha.' then raise; end if;
  end;
  if (select facing from map_tokens where name = 'PJ') <> 6 then raise exception 'El grupo no se revirtió completo'; end if;
  if not (select facing_manual from map_tokens where name = 'PJ') then raise exception 'No se guardó el giro manual'; end if;
end $$;

set request.jwt.claim.sub = '89200000-0000-0000-0000-000000000001';
update maps set grid = '{"rotation":{"playerMonsters":true}}' where id = '89200000-0000-0000-0000-000000000030';
set request.jwt.claim.sub = '89200000-0000-0000-0000-000000000002';
do $$ begin
  perform pg_temp.pose('[{"id":"89200000-0000-0000-0000-000000000041","before":{"facing":0},"patch":{"facing":2,"facing_manual":true}}]');
  begin
    perform pg_temp.pose('[{"id":"89200000-0000-0000-0000-000000000041","before":{},"patch":{"x":3}}]');
    raise exception 'El permiso de giro no debía otorgar movimiento';
  exception when raise_exception then
    if sqlerrm <> 'No podés girar o mover esa ficha.' then raise; end if;
  end;
  if (select facing from map_tokens where name = 'Rata') <> 2 then raise exception 'No se guardó el giro permitido'; end if;
end $$;
rollback;
