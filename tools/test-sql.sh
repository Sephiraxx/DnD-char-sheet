#!/bin/sh
# Usa una base temporal independiente para probar el esquema y los permisos.
set -eu
cd "$(dirname "$0")/.."
db="dnd_schema_test_$$"
createdb "$db"
trap 'dropdb --if-exists "$db"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$db" -f supabase/tests/supabase-stub.sql
psql -q -v ON_ERROR_STOP=1 -d "$db" -f supabase/schema.sql
for file in supabase/migrations/*.sql supabase/tests/*-rls.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$file"
done
