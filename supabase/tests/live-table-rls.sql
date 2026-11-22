-- The player sees an allowlisted party view, and loot reservation creates one recoverable delivery.
\set ON_ERROR_STOP 1
begin;
insert into auth.users values
 ('90000000-0000-0000-0000-000000000001','live-dm@x'),
 ('90000000-0000-0000-0000-000000000002','live-player@x'),
 ('90000000-0000-0000-0000-000000000003','live-peer@x'),
 ('90000000-0000-0000-0000-000000000004','live-guest@x');
insert into campaigns (id,name,code,dm_id,settings) values
 ('90000000-0000-0000-0000-000000000010','Mesa viva','VIVA22','90000000-0000-0000-0000-000000000001',
  '{"quests":[{"title":"Publicada","shared":true},{"title":"Privada","shared":false}],"downtime":[{"text":"privado"}],"startLevel":3}'),
 ('90000000-0000-0000-0000-000000000011','Copia nueva','COPIA2','90000000-0000-0000-0000-000000000001','{}');
insert into members (campaign_id,user_id,role) values
 ('90000000-0000-0000-0000-000000000010','90000000-0000-0000-0000-000000000001','dm'),
 ('90000000-0000-0000-0000-000000000010','90000000-0000-0000-0000-000000000002','player'),
 ('90000000-0000-0000-0000-000000000010','90000000-0000-0000-0000-000000000003','player'),
 ('90000000-0000-0000-0000-000000000011','90000000-0000-0000-0000-000000000001','dm');
insert into characters (id,campaign_id,owner_id,name,data,public_summary) values
 ('90000000-0000-0000-0000-000000000020','90000000-0000-0000-0000-000000000010','90000000-0000-0000-0000-000000000002','Mi PJ','{}','{"hp":8}'),
 ('90000000-0000-0000-0000-000000000021','90000000-0000-0000-0000-000000000010','90000000-0000-0000-0000-000000000003','Otro PJ','{"notes":"Diario privado"}','{"hp":10}');
insert into loot (id,campaign_id,name,qty,data) values
 ('90000000-0000-0000-0000-000000000030','90000000-0000-0000-0000-000000000010','Pociones',2,'{"ref":{"kind":"magic","id":"potion-of-healing"}}');
create function pg_temp.check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FALLA: %', label; end if; raise notice 'ok: %', label; end $$;

set role authenticated;
set request.jwt.claim.sub = '90000000-0000-0000-0000-000000000002';
select pg_temp.check('jugador ve su propia ficha y ambos resúmenes',
  (select count(*) from characters where campaign_id = '90000000-0000-0000-0000-000000000010') = 1
  and (select count(*) from character_summaries where campaign_id = '90000000-0000-0000-0000-000000000010') = 2);
select pg_temp.check('jugador ve únicamente las misiones publicadas',
  not exists (select 1 from campaigns where id = '90000000-0000-0000-0000-000000000010')
  and (campaign_for_member('90000000-0000-0000-0000-000000000010')).settings->'quests' = '[{"title":"Publicada","shared":true}]'::jsonb
  and not ((campaign_for_member('90000000-0000-0000-0000-000000000010')).settings ? 'downtime'));
select pg_temp.check('reclamo crea una orden con cantidad y referencia',
  claim_loot_for_delivery('90000000-0000-0000-0000-000000000030','90000000-0000-0000-0000-000000000020') > 0);
select pg_temp.check('la orden queda pendiente de guardar',
  (select count(*) from events where target_character = '90000000-0000-0000-0000-000000000020' and kind = 'item'
    and applied_at is null and (payload->>'qty')::int = 2 and payload->'ref'->>'id' = 'potion-of-healing') = 1);

set request.jwt.claim.sub = '90000000-0000-0000-0000-000000000004';
select pg_temp.check('ajeno no recibe los resúmenes',
  not exists (select 1 from character_summaries where campaign_id = '90000000-0000-0000-0000-000000000010'));
select pg_temp.check('al unirse se filtran las misiones en la misma respuesta',
  (join_campaign('VIVA22','Invitado')).settings->'quests' = '[{"title":"Publicada","shared":true}]'::jsonb);

set request.jwt.claim.sub = '90000000-0000-0000-0000-000000000001';
select pg_temp.check('el DM conserva acceso a sus misiones sin publicar',
  jsonb_array_length((campaign_for_member('90000000-0000-0000-0000-000000000010')).settings->'quests') = 2);
select restore_campaign_archive(
  '90000000-0000-0000-0000-000000000011', '{"quests":[{"title":"Copiada","shared":false}]}',
  '[{"id":"90000000-0000-0000-0000-000000000040","name":"Mapa nuevo","grid":{},"terrain":{},"fog":{},"sort":0}]',
  '[{"map_id":"90000000-0000-0000-0000-000000000040","kind":"npc","name":"PNJ","label":"P","color":"","x":1,"y":2,"size":1,"hidden":true,"elev":0}]',
  '[{"kind":"rule","name":"Regla","data":{"text":"Regla de mesa"}}]', '90000000-0000-0000-0000-000000000040'
);
select pg_temp.check('restauración crea mapa, ficha y homebrew en mesa nueva',
  exists (select 1 from maps where campaign_id = '90000000-0000-0000-0000-000000000011')
  and exists (select 1 from map_tokens where campaign_id = '90000000-0000-0000-0000-000000000011' and hidden)
  and exists (select 1 from homebrew where campaign_id = '90000000-0000-0000-0000-000000000011'));
rollback;
