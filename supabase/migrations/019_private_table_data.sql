-- The live party reads summaries. Only the owner and DM can query a full sheet.
begin;

alter table public.characters add column if not exists public_summary jsonb;
alter table public.characters drop constraint if exists characters_summary_size;
alter table public.characters add constraint characters_summary_size
  check (public_summary is null or (jsonb_typeof(public_summary) = 'object' and octet_length(public_summary::text) <= 500000));

create table if not exists public.character_summaries (
  id uuid primary key references public.characters on delete cascade,
  campaign_id uuid not null references public.campaigns on delete cascade,
  owner_id uuid not null,
  name text not null,
  summary jsonb,
  updated_at timestamptz not null
);
create index if not exists character_summaries_campaign on public.character_summaries (campaign_id);
alter table public.character_summaries enable row level security;
revoke all on public.character_summaries from anon, authenticated;
grant select on public.character_summaries to authenticated;
drop policy if exists summaries_select on public.character_summaries;
create policy summaries_select on public.character_summaries for select using (public.is_member(campaign_id));

create or replace function public.sync_character_summary() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into character_summaries (id, campaign_id, owner_id, name, summary, updated_at)
    values (new.id, new.campaign_id, new.owner_id, new.name, new.public_summary, new.updated_at)
    on conflict (id) do update set campaign_id = excluded.campaign_id, owner_id = excluded.owner_id,
      name = excluded.name, summary = excluded.summary, updated_at = excluded.updated_at;
  return new;
end $$;
revoke all on function public.sync_character_summary() from public;
drop trigger if exists sync_character_summary on public.characters;
create trigger sync_character_summary after insert or update on public.characters
  for each row execute function public.sync_character_summary();

insert into public.character_summaries (id, campaign_id, owner_id, name, summary, updated_at)
  select id, campaign_id, owner_id, name, public_summary, updated_at from public.characters on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'character_summaries') then
    alter publication supabase_realtime add table public.character_summaries;
  end if;
end $$;

drop policy if exists characters_select on public.characters;
create policy characters_select on public.characters for select using (
  owner_id = auth.uid() or public.is_dm(campaign_id)
);

drop policy if exists characters_update on public.characters;
create policy characters_update on public.characters for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.is_member(campaign_id));

-- Campaign settings can contain private quests and GM notes. Players receive the allowlisted public fields.
drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns for select using (dm_id = auth.uid());

create or replace function public.campaign_for_member(p_campaign uuid) returns public.campaigns
language plpgsql stable security definer set search_path = public as $$
declare c campaigns;
begin
  if not is_member(p_campaign) then return null; end if;
  select * into c from campaigns where id = p_campaign;
  if c.dm_id <> auth.uid() then
    c.settings := jsonb_build_object(
      'sources', c.settings->'sources',
      'startLevel', c.settings->'startLevel',
      'rules', c.settings->'rules',
      'abilities', c.settings->'abilities',
      'session', c.settings->'session',
      'calendar', c.settings->'calendar',
      'quests', coalesce((
        select jsonb_agg(q.value order by q.ordinality)
          from jsonb_array_elements(
            case when jsonb_typeof(c.settings->'quests') = 'array' then c.settings->'quests' else '[]'::jsonb end
          ) with ordinality q(value, ordinality)
          where q.value->'shared' = 'true'::jsonb
      ), '[]'::jsonb)
    );
  end if;
  return c;
end $$;

create or replace function public.join_campaign(p_code text, p_display text)
returns public.campaigns language plpgsql security definer set search_path = public as $$
declare c campaigns;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  select * into c from campaigns where code = upper(trim(p_code));
  if not found then raise exception 'No existe una mesa con ese código.'; end if;
  insert into members (campaign_id, user_id, role, display_name)
  values (c.id, auth.uid(), 'player', coalesce(trim(p_display), ''))
  on conflict (campaign_id, user_id) do update set display_name = excluded.display_name;
  -- Use a separate SQL statement in this non-stable function so the new membership is visible.
  return campaign_for_member(c.id);
end $$;

create or replace function public.member_campaigns()
returns table (id uuid, name text, code text, role text)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.code, m.role
  from campaigns c join members m on m.campaign_id = c.id where m.user_id = auth.uid()
$$;

revoke all on function public.campaign_for_member(uuid), public.member_campaigns() from public;
grant execute on function public.campaign_for_member(uuid), public.member_campaigns() to authenticated;
notify pgrst, 'reload schema';
commit;
