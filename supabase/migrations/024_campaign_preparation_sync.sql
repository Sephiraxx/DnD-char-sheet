-- Private prepared encounters follow their campaign across the DM's devices.
begin;
create table if not exists public.prepared_encounters (
  campaign_id uuid not null references public.campaigns on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  revision int not null default 1 check (revision > 0),
  -- A null draft reserves the id after deletion so an older device cannot import it again.
  data jsonb check (data is null or (
    jsonb_typeof(data) = 'object' and octet_length(data::text) <= 524288
    and data->>'id' is not distinct from id
    and coalesce(char_length(data->>'name') between 1 and 80, false)
    and jsonb_typeof(data->'monsters') is not distinct from 'array'
  )),
  created_at timestamptz not null default now(),
  primary key (campaign_id, id)
);
alter table public.prepared_encounters enable row level security;
revoke all on public.prepared_encounters from public, anon, authenticated;
grant select, insert, update on public.prepared_encounters to authenticated;
drop policy if exists prepared_encounters_dm on public.prepared_encounters;
create policy prepared_encounters_dm on public.prepared_encounters for all to authenticated
  using (campaign_id in (select id from public.campaigns where dm_id = auth.uid()))
  with check (campaign_id in (select id from public.campaigns where dm_id = auth.uid()));

-- Account merges can leave the new owner with an existing player membership.
create or replace function public.sync_campaign_dm_membership() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into members (campaign_id, user_id, role, display_name)
    values (new.id, new.dm_id, 'dm', 'DM')
    on conflict (campaign_id, user_id) do update set role = 'dm' where members.role <> 'dm';
  return new;
end $$;
drop trigger if exists campaign_dm_membership on public.campaigns;
create trigger campaign_dm_membership after update of dm_id on public.campaigns
  for each row when (old.dm_id is distinct from new.dm_id) execute function public.sync_campaign_dm_membership();
insert into public.members (campaign_id, user_id, role, display_name)
  select id, dm_id, 'dm', 'DM' from public.campaigns
  on conflict (campaign_id, user_id) do update set role = 'dm' where members.role <> 'dm';
notify pgrst, 'reload schema';
commit;
