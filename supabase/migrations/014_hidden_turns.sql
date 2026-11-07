-- Una criatura oculta sigue teniendo turno; su identidad solo se muestra al DM.
-- Ejecutar en Supabase → SQL Editor. No modifica ni revela criaturas existentes.
begin;

-- La visibilidad de la iniciativa y del mapa usan la misma regla.
create or replace function public.combatant_is_hidden(p_id uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare c combatants;
begin
  select * into c from combatants where id = p_id;
  if not found or not is_member(c.campaign_id) then return true; end if;
  return c.hidden or exists (
    select 1 from map_tokens t join boards b on b.campaign_id = t.campaign_id and b.map_id = t.map_id
    where t.combatant_id = c.id and t.campaign_id = c.campaign_id and t.hidden
  );
end $$;
revoke all on function public.combatant_is_hidden(uuid) from public;
grant execute on function public.combatant_is_hidden(uuid) to authenticated;

drop policy if exists combatants_select on public.combatants;
create policy combatants_select on public.combatants for select using (
  public.is_member(campaign_id) and (public.is_dm(campaign_id) or not public.combatant_is_hidden(id))
);
drop policy if exists map_tokens_select on public.map_tokens;
create policy map_tokens_select on public.map_tokens for select using (
  public.is_dm(campaign_id) or (
    public.is_member(campaign_id) and not hidden and map_id = public.active_map(campaign_id)
    and (combatant_id is null or not public.combatant_is_hidden(combatant_id))
  )
);

create or replace function public.advance_turn(p_campaign uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e encounters; cur combatants; nxt combatants; ids uuid[]; i int; r int; concealed boolean;
begin
  if not is_member(p_campaign) then raise exception 'No sos parte de esta mesa.'; end if;
  select * into e from encounters where campaign_id = p_campaign for update;
  if e.active is true and e.current_id is not null then
    select * into cur from combatants where id = e.current_id;
    if not is_dm(p_campaign) and not (cur.kind = 'pc' and owns_character(cur.character_id)) then
      raise exception 'Solo quien tiene el turno o el DM pueden pasarlo.';
    end if;
  elsif not is_dm(p_campaign) then raise exception 'El combate todavía no empezó.'; end if;
  select array_agg(id order by init desc nulls last, tiebreak desc, created_at) into ids
    from combatants where campaign_id = p_campaign and not (kind = 'monster' and status = 'derrotado');
  if ids is null then raise exception 'No hay nadie en la iniciativa.'; end if;
  i := array_position(ids, e.current_id);
  if e.active is not true then r := 1; i := 1;
  elsif i is null then r := greatest(e.round, 1); i := 1;
  else
    r := e.round; i := i + 1;
    if i > array_length(ids, 1) then i := 1; r := r + 1; end if;
  end if;
  insert into encounters (campaign_id, active, round, current_id, updated_at)
    values (p_campaign, true, r, ids[i], now())
    on conflict (campaign_id) do update set active = true, round = excluded.round, current_id = excluded.current_id, updated_at = now();
  select * into nxt from combatants where id = ids[i];
  concealed := combatant_is_hidden(nxt.id);
  insert into events (campaign_id, author_id, kind, payload)
    values (p_campaign, auth.uid(), 'turn', jsonb_build_object(
      'combatantId', nxt.id, 'characterId', case when concealed then null else nxt.character_id end,
      'name', case when concealed then 'Turno oculto' else nxt.name end, 'hidden', concealed, 'round', r));
  return jsonb_build_object('id', nxt.id, 'name', case when concealed and not is_dm(p_campaign) then 'Turno oculto' else nxt.name end, 'hidden', concealed, 'round', r);
end $$;

commit;
