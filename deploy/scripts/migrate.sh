#!/usr/bin/env bash
# ---------------------------------------------------------------
# Applies every SQL migration in supabase/migrations, in order,
# inside a transaction, and records them in public.schema_migrations
# so re-runs are safe (idempotent upgrades).
# ---------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source ./.env; set +a

MIG_DIR="../supabase/migrations"
PSQL=(docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d "${POSTGRES_DB}")

echo "Waiting for database..."
for i in $(seq 1 60); do
  docker compose exec -T db pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 2
done

"${PSQL[@]}" <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version     text PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);
SQL

applied=0
for f in $(ls "$MIG_DIR"/*.sql | sort); do
  version="$(basename "$f")"
  exists=$("${PSQL[@]}" -tAc "SELECT 1 FROM public.schema_migrations WHERE version='${version}'")
  if [ "$exists" = "1" ]; then
    echo "  skip  $version"
    continue
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
