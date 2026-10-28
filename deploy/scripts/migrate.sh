#!/usr/bin/env bash
# ---------------------------------------------------------------
# Applies every SQL migration in supabase/migrations, in order,
# inside a transaction, and records them in public.schema_migrations
# so re-runs are safe (idempotent upgrades).
# ---------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source ./.env; set +a

# In the offline bundle the SQL lives at ./supabase; in the git repo at ../supabase.
if [ -d "./supabase/migrations" ]; then
  MIG_DIR="./supabase/migrations"
elif [ -d "../supabase/migrations" ]; then
  MIG_DIR="../supabase/migrations"
else
  echo "No supabase/migrations directory found next to the deploy folder." >&2
  exit 1
fi
if [ -d './drizzle/migrations' ]; then EXTRA_DIR='./drizzle/migrations'; else EXTRA_DIR='../drizzle/migrations'; fi
PSQL=(docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d "${POSTGRES_DB}")

echo "Waiting for database..."
ready=false
for i in $(seq 1 60); do
  docker compose exec -T db pg_isready -U postgres >/dev/null 2>&1 && { ready=true; break; }
  sleep 2
done

[ "$ready" = true ] || { echo "Database not ready" >&2; exit 1; }
"${PSQL[@]}" <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version     text PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);
SQL

applied=0
shopt -s nullglob
files=("$MIG_DIR"/*.sql "$EXTRA_DIR"/*.sql)
[ ${#files[@]} -gt 0 ] || { echo 'No packaged migrations' >&2; exit 1; }
for f in "${files[@]}"; do
  version="$(basename "$f")"
  exists=$("${PSQL[@]}" -tAc "SELECT 1 FROM public.schema_migrations WHERE version='${version}'")
  if [ "$exists" = "1" ]; then
    echo "  skip  $version"
    continue
  fi
  if grep -Eiq '^[[:space:]]*(DELETE[[:space:]]+FROM|DROP[[:space:]]+(TABLE|COLUMN)|TRUNCATE)' "$f" && [ "${DECISIONOS_ALLOW_REVIEWED_DATA_CLEANUP:-false}" != true ]; then
    echo "Stopped before potentially destructive migration $version. Back up and review affected records first." >&2; exit 1
  fi
  echo "  apply $version"
  {
    echo "BEGIN;"
    cat "$f"
    echo ";"
    echo "INSERT INTO public.schema_migrations(version) VALUES ('${version}');"
    echo "COMMIT;"
  } | "${PSQL[@]}"
  applied=$((applied+1))
done

echo "Done. $applied new migration(s) applied."
