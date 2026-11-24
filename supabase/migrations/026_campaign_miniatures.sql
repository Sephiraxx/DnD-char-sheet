-- Ejecutar después de 025_creature_miniatures.sql.
begin;
-- 025 creó una restricción sin nombre explícito. PostgreSQL deriva el nombre de las columnas.
do $$
declare old_check record;
begin
  for old_check in
    select c.conname from pg_constraint c
    where c.conrelid = 'public.map_tokens'::regclass and c.contype = 'c'
      and c.conkey @> array[(select attnum from pg_attribute
        where attrelid = c.conrelid and attname = 'creature_model')]
      and position('dragon-silver' in pg_get_constraintdef(c.oid)) > 0
  loop
    execute format('alter table public.map_tokens drop constraint %I', old_check.conname);
  end loop;
end $$;
alter table public.map_tokens add constraint map_tokens_creature_model_allowed check (creature_model is null or (kind in ('npc','monster') and creature_model in (
    'sigil','goblin','skeleton','bull-skeleton','horse-skeleton','dragon-red','dragon-blue',
    'dragon-green','dragon-black','dragon-white','dragon-brass','dragon-bronze','dragon-copper','dragon-gold',
    'dragon-silver','bandit','scout','guard','cultist','druid','mage',
    'priest','berserker','orc','hobgoblin','kobold','winged-kobold','gnoll',
    'bugbear','ogre','troll','cyclops','lizardfolk','sahuagin','zombie',
    'ogre-zombie','ghoul','wight','mummy','vampire','ghost','wraith',
    'wisp','wolf','hyena','bear','boar','rat','cat',
    'elk','goat','owlbear','lizard','crocodile','toad','snake',
    'spider','phase-spider','scorpion','centipede','rust-monster','bat','hawk',
    'owl','stirge','wasp','rat-swarm','bat-swarm','raven-swarm','insect-swarm',
    'mimic','cube','ooze','flying-sword','armor','grick','nothic',
    'grell','claw','minotaur','hill-giant','ettin','griffon','hippogriff',
    'manticore','beholder','mind-flayer','lich'
  )));
notify pgrst, 'reload schema';
commit;
