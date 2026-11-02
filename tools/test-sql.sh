#!/bin/sh
# Prueba el esquema de Supabase y los permisos del tablero en un Postgres local (no toca la mesa real).
# Uso: PGHOST=… PGPORT=… PGUSER=… tools/test-sql.sh   (necesita psql y un usuario que pueda crear bases)
set -e
cd "$(dirname "$0")/.."
DB=dnd_schema_test
psql -q -c "drop database if exists $DB" -c "create database $DB"
P="psql -q -v ON_ERROR_STOP=1 -d $DB"
$P -f supabase/tests/supabase-stub.sql 2>/dev/null
$P -f supabase/schema.sql >/dev/null 2>&1
for f in supabase/migrations/*.sql; do $P -f "$f" >/dev/null 2>&1; done
$P -f supabase/tests/board-rls.sql 2>&1 | grep -E 'ok:|FALLA|ERROR'
psql -q -c "drop database $DB"
