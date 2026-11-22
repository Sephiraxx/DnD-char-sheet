-- Claiming loot and enqueueing its item command succeed or roll back together.
begin;

create or replace function public.claim_loot_for_delivery(p_loot uuid, p_character uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  item loot%rowtype;
  recipient characters%rowtype;
  delivery bigint;
begin
  select * into item from loot where id = p_loot for update;
  if not found or not is_member(item.campaign_id) then raise exception 'Ese objeto ya no está disponible.'; end if;
  select * into recipient
    from characters c where c.id = p_character and c.owner_id = auth.uid() and c.campaign_id = item.campaign_id;
  if not found then raise exception 'Elegí una ficha propia de esta mesa.'; end if;
  if item.claimed_character is not null then raise exception 'Alguien ya tomó ese objeto.'; end if;
  if coalesce(item.data->>'for', '') not in ('', p_character::text) then
    raise exception 'El objeto está reservado para otra ficha.';
  end if;
  update loot set claimed_character = p_character, claimed_name = recipient.name where id = p_loot;
  insert into events (campaign_id, author_id, kind, target_character, payload)
    values (item.campaign_id, auth.uid(), 'item', p_character, jsonb_build_object(
      'name', item.name, 'qty', item.qty, 'notes', item.notes, 'ref', item.data->'ref', 'from', 'Botín'
    )) returning id into delivery;
  return delivery;
end $$;

revoke all on function public.claim_loot_for_delivery(uuid, uuid) from public;
grant execute on function public.claim_loot_for_delivery(uuid, uuid) to authenticated;
notify pgrst, 'reload schema';

commit;
