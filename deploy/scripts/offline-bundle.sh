#!/usr/bin/env bash
# ---------------------------------------------------------------
# RUN ON AN INTERNET-CONNECTED MACHINE.
# Produces decisionos-offline-<version>.tar.gz containing every
# container image + the local LLM weights, so the customer host
# never needs internet access.
#
#   ./offline-bundle.sh 1.0.0
# ---------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="${1:-latest}"
OUT="decisionos-offline-${VERSION}"
rm -rf "$OUT" && mkdir -p "$OUT/images" "$OUT/models"

IMAGES=(
  supabase/postgres:15.8.1.020
  supabase/gotrue:v2.170.0
  postgrest/postgrest:v12.2.3
  supabase/storage-api:v1.19.3
  supabase/postgres-meta:v0.86.1
  supabase/edge-runtime:v1.67.4
  ollama/ollama:0.5.7
  kong:2.8.1
)

echo "==> Building the DecisionOS app image"
set -a; source ./.env.example; set +a
docker compose build app
IMAGES+=("decisionos/app:${VERSION}")
docker tag "decisionos/app:latest" "decisionos/app:${VERSION}" 2>/dev/null || true

echo "==> Pulling and exporting images"
for img in "${IMAGES[@]}"; do
  docker pull "$img" 2>/dev/null || true
done
docker save "${IMAGES[@]}" | gzip > "$OUT/images/decisionos-images.tar.gz"

echo "==> Exporting local LLM weights"
docker run -d --name dos-ollama-pull -v "$PWD/$OUT/models:/root/.ollama" ollama/ollama:0.5.7 >/dev/null
sleep 8
for m in "${AI_CHAT_MODEL:-qwen2.5:14b-instruct}" "${AI_EMBEDDING_MODEL:-nomic-embed-text}"; do
  docker exec dos-ollama-pull ollama pull "$m"
done
docker rm -f dos-ollama-pull >/dev/null

echo "==> Copying deployment files"
cp -r ./docker-compose.yml ./kong.yml ./nginx.conf ./Dockerfile ./init ./scripts \
      ./.env.example ./INSTALL.md ./LICENSING.md "$OUT/"
cp -r ../supabase "$OUT/supabase"
# The customer host never runs the vendor signing scripts.
rm -f "$OUT/scripts/license-keygen.sh" "$OUT/scripts/license-issue.sh"
rm -f "$OUT/supabase/functions/_shared/aiClient_test.ts"
printf '%s\n' "$VERSION" > "$OUT/VERSION"

echo "==> Verifying bundle contents"
for req in docker-compose.yml kong.yml nginx.conf Dockerfile INSTALL.md LICENSING.md \
           init/00-roles.sql scripts/install.sh scripts/generate-keys.sh scripts/migrate.sh \
           scripts/license-activate.sh scripts/create-admin.sh .env.example \
           supabase/migrations supabase/functions/license-status/index.ts \
           supabase/functions/_shared/license.ts supabase/functions/_shared/aiClient.ts; do
  [ -e "$OUT/$req" ] || { echo "MISSING from bundle: $req" >&2; exit 1; }
done
echo "    $(ls "$OUT"/supabase/migrations/*.sql | wc -l) migration(s), $(ls "$OUT"/supabase/functions | wc -l) edge function(s)"

tar czf "${OUT}.tar.gz" "$OUT"
rm -rf "$OUT"
echo "Bundle ready: ${OUT}.tar.gz"
