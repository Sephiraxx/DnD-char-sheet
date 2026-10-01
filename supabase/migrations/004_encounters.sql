-- Combate compartido: encuentro, iniciativa y criaturas con PG/CA ocultos para los jugadores.
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.

-- Estado del encuentro de cada mesa (uno por mesa).
create table if not exists public.encounters (
  campaign_id uuid primary key references public.campaigns on delete cascade,
  active boolean not null default false,
  round int not null default 0,
  current_id uuid,
  updated_at timestamptz not null default now()
);

-- Quiénes participan: personajes de la mesa y criaturas. Lo ven todos (salvo criaturas ocultas).
create table if not exists public.combatants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns on delete cascade,
  kind text not null check (kind in ('pc', 'monster')),
  character_id uuid references public.characters on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  init int,
  tiebreak int not null default 0,
  status text not null default 'ileso',
  conditions text[] not null default '{}',
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists combatants_campaign on public.combatants (campaign_id);

-- Datos que solo ve el DM: PG, CA y bonos de salvación de cada criatura.
create table if not exists public.combatant_secrets (
  combatant_id uuid primary key references public.combatants on delete cascade,
  campaign_id uuid not null references public.campaigns on delete cascade,
  hp int not null default 1 check (hp >= 0),
  max_hp int not null default 1 check (max_hp >= 1),
  ac int not null default 10 check (ac between 0 and 40),
  saves jsonb not null default '{}'::jsonb,
  monster_id text
);

alter table public.encounters enable row level security;
alter table public.combatants enable row level security;
alter table public.combatant_secrets enable row level security;

drop policy if exists encounters_select on public.encounters;
create policy encounters_select on public.encounters for select using (public.is_member(campaign_id));
drop policy if exists encounters_write on public.encounters;
create policy encounters_write on public.encounters for all
  using (public.is_dm(campaign_id)) with check (public.is_dm(campaign_id));

drop policy if exists combatants_select on public.combatants;
create policy combatants_select on public.combatants for select
  using (public.is_member(campaign_id) and (not hidden or public.is_dm(campaign_id)));
drop policy if exists combatants_write on public.combatants;
create policy combatants_write on public.combatants for all
  using (public.is_dm(campaign_id)) with check (public.is_dm(campaign_id));

drop policy if exists secrets_dm on public.combatant_secrets;
create policy secrets_dm on public.combatant_secrets for all
  using (public.is_dm(campaign_id)) with check (public.is_dm(campaign_id));

-- Estado descriptivo a partir de los PG (lo que ven los jugadores).
create or replace function public.status_for(hp int, max_hp int) returns text
language sql immutable as $$
  select case
    when hp <= 0 then 'derrotado'
    when hp * 4 < max_hp then 'a punto de caer'
    when hp * 2 < max_hp then 'malherido'
    when hp < max_hp then 'herido'
    else 'ileso' end;
$$;
create or replace function public.secrets_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update combatants set status = status_for(new.hp, new.max_hp) where id = new.combatant_id;
  return new;
end $$;
drop trigger if exists secrets_status on public.combatant_secrets;
create trigger secrets_status after insert or update on public.combatant_secrets
  for each row execute function public.secrets_status();

-- Pasar el turno: el DM siempre; un jugador solo si el turno es de su personaje.
create or replace function public.advance_turn(p_campaign uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e encounters;
  cur combatants;
  nxt combatants;
  ids uuid[];
  i int;
  r int;
begin
  if not is_member(p_campaign) then raise exception 'No sos parte de esta mesa.'; end if;
  select * into e from encounters where campaign_id = p_campaign;
  if e.active is true and e.current_id is not null then
    select * into cur from combatants where id = e.current_id;
    if not is_dm(p_campaign) and not (cur.kind = 'pc' and owns_character(cur.character_id)) then
      raise exception 'Solo quien tiene el turno o el DM pueden pasarlo.';
    end if;
  elsif not is_dm(p_campaign) then
    raise exception 'El combate todavía no empezó.';
  end if;
  select array_agg(id order by init desc nulls last, tiebreak desc, created_at) into ids
    from combatants
    where campaign_id = p_campaign and not hidden and not (kind = 'monster' and status = 'derrotado');
  if ids is null then raise exception 'No hay nadie en la iniciativa.'; end if;
  i := array_position(ids, e.current_id);
  if e.active is not true then
    r := 1;
    i := 1;
  elsif i is null then
    r := greatest(e.round, 1);
    i := 1;
  else
    r := e.round;
    i := i + 1;
    if i > array_length(ids, 1) then
      i := 1;
      r := r + 1;
    end if;
  end if;
  insert into encounters (campaign_id, active, round, current_id, updated_at)
    values (p_campaign, true, r, ids[i], now())
    on conflict (campaign_id) do update
      set active = true, round = excluded.round, current_id = excluded.current_id, updated_at = now();
  select * into nxt from combatants where id = ids[i];
  insert into events (campaign_id, author_id, kind, payload)
    values (p_campaign, auth.uid(), 'turn',
      jsonb_build_object('combatantId', nxt.id, 'characterId', nxt.character_id, 'name', nxt.name, 'round', r));
  return jsonb_build_object('id', nxt.id, 'name', nxt.name, 'round', r);
end $$;

create or replace function public.end_combat(p_campaign uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_dm(p_campaign) then raise exception 'Solo el DM termina el combate.'; end if;
  insert into encounters (campaign_id, active, round, current_id) values (p_campaign, false, 0, null)
    on conflict (campaign_id) do update set active = false, round = 0, current_id = null, updated_at = now();
  insert into events (campaign_id, author_id, kind, payload) values (p_campaign, auth.uid(), 'combat-end', '{}'::jsonb);
end $$;

-- Ataque de un jugador contra una criatura: se compara con la CA oculta. El jugador solo sabe si impacta.
create or replace function public.resolve_attack(p_target uuid, p_total int, p_natural int, p_label text, p_attacker text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c combatants;
  s combatant_secrets;
  hit boolean;
begin
  select * into c from combatants where id = p_target;
  if not found or not is_member(c.campaign_id) then raise exception 'Objetivo no encontrado.'; end if;
  if c.kind <> 'monster' then raise exception 'Solo se resuelven así los ataques contra criaturas.'; end if;
  select * into s from combatant_secrets where combatant_id = p_target;
  hit := p_natural = 20 or (p_natural <> 1 and p_total >= coalesce(s.ac, 10));
  insert into events (campaign_id, author_id, kind, payload)
    values (c.campaign_id, auth.uid(), 'attack', jsonb_build_object(
      'attacker', left(coalesce(p_attacker, ''), 100), 'target', c.name, 'targetId', c.id,
      'label', left(coalesce(p_label, ''), 120), 'total', p_total, 'natural', p_natural, 'hit', hit));
  return jsonb_build_object('hit', hit, 'name', c.name, 'status', c.status);
end $$;

-- Daño a una criatura (de un jugador o del DM). Devuelve solo el estado descriptivo.
create or replace function public.damage_combatant(p_target uuid, p_amount int, p_label text, p_attacker text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c combatants;
  amount int := greatest(0, least(coalesce(p_amount, 0), 9999));
begin
  select * into c from combatants where id = p_target;
  if not found or not is_member(c.campaign_id) then raise exception 'Objetivo no encontrado.'; end if;
  if c.kind <> 'monster' then raise exception 'Solo se aplica así el daño a criaturas.'; end if;
  update combatant_secrets set hp = greatest(0, hp - amount) where combatant_id = p_target;
  select * into c from combatants where id = p_target;
  insert into events (campaign_id, author_id, kind, payload)
    values (c.campaign_id, auth.uid(), 'creature-damage', jsonb_build_object(
      'attacker', left(coalesce(p_attacker, ''), 100), 'target', c.name, 'targetId', c.id,
      'label', left(coalesce(p_label, ''), 120), 'amount', amount, 'status', c.status));
  return jsonb_build_object('name', c.name, 'status', c.status);
end $$;

grant execute on function public.advance_turn(uuid), public.end_combat(uuid),
  public.resolve_attack(uuid, int, int, text, text), public.damage_combatant(uuid, int, text, text) to authenticated;

-- Los jugadores pueden mandarse curaciones, efectos y dados entre ellos y pedir salvaciones de criaturas al DM.
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert with check (
  author_id = auth.uid() and public.is_member(campaign_id) and (
    public.is_dm(campaign_id)
    or kind in ('roll', 'roll-response', 'note', 'heal', 'temp', 'effect', 'bonus-die', 'creature-save')
  )
);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'encounters') then
    alter publication supabase_realtime add table public.encounters;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'combatants') then
    alter publication supabase_realtime add table public.combatants;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'combatant_secrets') then
    alter publication supabase_realtime add table public.combatant_secrets;
  end if;
end $$;
