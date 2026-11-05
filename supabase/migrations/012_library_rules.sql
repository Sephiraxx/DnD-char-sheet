-- Biblioteca: también rasgos de clase y subclase, opciones de clase y dotes leídos de tus libros.
-- Se comparten con la mesa igual que los conjuros y objetos (las criaturas siguen siendo solo del DM).
alter table public.library_entries drop constraint if exists library_entries_kind_check;
alter table public.library_entries
  add constraint library_entries_kind_check check (kind in ('monster', 'spell', 'item', 'feature', 'feat'));

notify pgrst, 'reload schema';
