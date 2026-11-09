-- Homebrew: clases, subclases, conjuros y criaturas propias, en colecciones de la biblioteca.
-- Una colección es un libro de la biblioteca marcado como homebrew. Se comparte con una mesa igual que
-- un libro: sus miembros ven las clases, subclases y conjuros (las criaturas quedan solo para su autor).
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.

alter table public.library_books add column if not exists homebrew boolean not null default false;

alter table public.library_entries drop constraint if exists library_entries_kind_check;
alter table public.library_entries
  add constraint library_entries_kind_check
  check (kind in ('monster', 'spell', 'item', 'feature', 'feat', 'class', 'subclass'));

notify pgrst, 'reload schema';
