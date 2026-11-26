\set ON_ERROR_STOP 1
begin;
insert into auth.users values
 ('29000000-0000-0000-0000-000000000001','zones-dm@x'),
 ('29000000-0000-0000-0000-000000000002','zones-player@x');
insert into campaigns (id, name, code, dm_id) values
 ('29000000-0000-0000-0000-000000000010','Zonas','ZONA29','29000000-0000-0000-0000-000000000001');
insert into members (campaign_id, user_id, role) values
 ('29000000-0000-0000-0000-000000000010','29000000-0000-0000-0000-000000000001','dm'),
 ('29000000-0000-0000-0000-000000000010','29000000-0000-0000-0000-000000000002','player');
insert into maps (id, campaign_id, name) values
 ('29000000-0000-0000-0000-000000000030','29000000-0000-0000-0000-000000000010','Mapa');
insert into boards (campaign_id, map_id) values
 ('29000000-0000-0000-0000-000000000010','29000000-0000-0000-0000-000000000030');
insert into map_tokens (id, campaign_id, map_id, name, kind) values
 ('29000000-0000-0000-0000-000000000040','29000000-0000-0000-0000-000000000010','29000000-0000-0000-0000-000000000030','Goblin','monster');
insert into combatants (id,campaign_id,kind,name,init) values
 ('29000000-0000-0000-0000-000000000041','29000000-0000-0000-0000-000000000010','pc','Clériga',5);

set local role authenticated;
set local request.jwt.claim.sub = '29000000-0000-0000-0000-000000000001';
do $$
declare
  cid uuid;
  profile jsonb := '{"hp":7,"max_hp":7,"ac":15,"monster_id":"goblin","saves":{"dex":2},"damage_traits":{"resist":[],"immune":[],"vulnerable":[],"weapon":[]}}';
begin
  cid := link_board_monster('29000000-0000-0000-0000-000000000040',profile);
  if cid <> link_board_monster('29000000-0000-0000-0000-000000000040',profile)
     or not exists (select 1 from combatant_secrets where combatant_id=cid and ac=15 and saves->>'dex'='2')
  then raise exception 'The token must use one goblin stat block'; end if;
  if advance_turn('29000000-0000-0000-0000-000000000010')->>'name' <> 'Clériga'
     or advance_turn('29000000-0000-0000-0000-000000000010')->>'name' <> 'Clériga'
  then raise exception 'A placed token must not get an initiative turn automatically'; end if;
  if monster_damage_amount('{"resist":["fire"]}','fire',19,'{"magical":true}') <> 9
  then raise exception 'Resistance must round down after the saving throw'; end if;
end $$;
set local request.jwt.claim.sub = '29000000-0000-0000-0000-000000000002';
do $$
declare
  cid uuid := (select combatant_id from map_tokens where name='Goblin');
  result jsonb;
  campaign uuid := '29000000-0000-0000-0000-000000000010';
begin
  result := resolve_attack(cid,11,4,'Descarga de fuego','Clériga');
  if result->'hit' is distinct from 'false'::jsonb or result ? 'ac'
  then raise exception 'An 11 must miss the goblin without exposing armor class'; end if;
  if exists (select 1 from combatant_secrets where combatant_id=cid)
  then raise exception 'Players must not read private monster stats'; end if;
  insert into events (campaign_id, author_id, kind, visibility, payload) values
    (campaign, auth.uid(), 'spell-zone-trigger', 'dm', '{"key":"cast:target:turn:enter"}');
  begin
    insert into events (campaign_id, author_id, kind, visibility, payload) values
      (campaign, auth.uid(), 'spell-zone-trigger', 'dm', '{"key":"cast:target:turn:enter"}');
    raise exception 'The same zone entry cannot prompt twice';
  exception when unique_violation then null;
  end;
end $$;
set local request.jwt.claim.sub = '29000000-0000-0000-0000-000000000001';
update campaigns set settings='{"showEnemyAC":true}' where id='29000000-0000-0000-0000-000000000010';
set local request.jwt.claim.sub = '29000000-0000-0000-0000-000000000002';
do $$
declare
  cid uuid := (select combatant_id from map_tokens where name='Goblin');
  result jsonb := resolve_attack(cid,15,8,'Descarga de fuego','Clériga');
begin
  if result->'hit' is distinct from 'true'::jsonb or result->'ac' is distinct from '15'::jsonb
  then raise exception 'The DM can opt into showing AC 15 on attack results'; end if;
end $$;
rollback;
