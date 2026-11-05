-- Biblioteca: lo que cada uno importa de sus propios libros (criaturas, conjuros, objetos mágicos).
-- Es privado de quien lo importa. Un libro se puede compartir con una mesa: sus miembros ven los
-- conjuros y objetos (las criaturas siguen siendo solo del DM que las importó).
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.

create table if not exists public.library_books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  lang text not null default 'es' check (lang in ('es', 'en')),
  counts jsonb not null default '{}' check (pg_column_size(counts) < 2000),
  shared_with uuid references public.campaigns on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists library_books_owner on public.library_books (owner_id);
create index if not exists library_books_shared on public.library_books (shared_with) where shared_with is not null;

create table if not exists public.library_entries (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.library_books on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('monster', 'spell', 'item')),
  key text not null check (char_length(key) between 1 and 160),
  name text not null check (char_length(name) between 1 and 200),
  data jsonb not null check (pg_column_size(data) < 120000),
  created_at timestamptz not null default now(),
  unique (book_id, kind, key)
);
create index if not exists library_entries_book on public.library_entries (book_id);
create index if not exists library_entries_owner on public.library_entries (owner_id, kind);

alter table public.library_books enable row level security;
alter table public.library_entries enable row level security;
grant select, insert, update, delete on public.library_books, public.library_entries to authenticated;

-- Libros: cada uno ve los suyos y los que una de sus mesas comparte. Solo el dueño los cambia, y solo
-- puede compartirlos con una mesa de la que es miembro.
drop policy if exists library_books_select on public.library_books;
create policy library_books_select on public.library_books for select
  using (owner_id = auth.uid() or (shared_with is not null and public.is_member(shared_with)));
drop policy if exists library_books_insert on public.library_books;
create policy library_books_insert on public.library_books for insert
  with check (owner_id = auth.uid() and (shared_with is null or public.is_member(shared_with)));
drop policy if exists library_books_update on public.library_books;
create policy library_books_update on public.library_books for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and (shared_with is null or public.is_member(shared_with)));
drop policy if exists library_books_delete on public.library_books;
create policy library_books_delete on public.library_books for delete using (owner_id = auth.uid());

-- Entradas: el dueño todo; los miembros de la mesa compartida, solo conjuros y objetos.
create or replace function public.library_shared(bid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from library_books b where b.id = bid and b.shared_with is not null and public.is_member(b.shared_with));
$$;
drop policy if exists library_entries_select on public.library_entries;
create policy library_entries_select on public.library_entries for select
  using (owner_id = auth.uid() or (kind <> 'monster' and public.library_shared(book_id)));
drop policy if exists library_entries_write on public.library_entries;
create policy library_entries_write on public.library_entries for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.library_books b where b.id = book_id and b.owner_id = auth.uid()));
