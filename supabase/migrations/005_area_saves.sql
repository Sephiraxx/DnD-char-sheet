-- Salvaciones de área entre jugadores: quien lanza una Bola de fuego puede pedir la salvación a aliados alcanzados.
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert with check (
  author_id = auth.uid() and public.is_member(campaign_id) and (
    public.is_dm(campaign_id)
    or kind in ('roll', 'roll-response', 'note', 'heal', 'temp', 'effect', 'bonus-die', 'creature-save', 'area-save')
  )
);
