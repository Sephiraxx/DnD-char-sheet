-- Per-account settings and character creation records are private to the database.
begin;

create table if not exists public.account_d20_profiles (
  owner_id uuid primary key references auth.users on delete cascade,
  sample_rate smallint not null check (sample_rate between 1 and 20)
);
create table if not exists public.account_d20_characters (
  owner_id uuid not null references public.account_d20_profiles on delete cascade,
  local_id uuid not null,
  primary key (owner_id, local_id)
);
alter table public.account_d20_profiles enable row level security;
alter table public.account_d20_characters enable row level security;
revoke all on public.account_d20_profiles, public.account_d20_characters from anon, authenticated;

create or replace function public.character_d20_profile(p_local_id uuid, p_created boolean default false)
returns smallint language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := auth.uid();
  rate smallint;
begin
  select p.sample_rate into rate from public.account_d20_profiles p where p.owner_id = account_id;
  if not found then return 0; end if;

  if p_created then
    insert into public.account_d20_characters (owner_id, local_id) values (account_id, p_local_id)
      on conflict do nothing;
  end if;
  if exists (
    select 1 from public.account_d20_characters c
    where c.owner_id = account_id and c.local_id = p_local_id
  ) then return rate; end if;
  return 0;
end $$;
revoke all on function public.character_d20_profile(uuid, boolean) from public, anon;
grant execute on function public.character_d20_profile(uuid, boolean) to authenticated;
notify pgrst, 'reload schema';

commit;
