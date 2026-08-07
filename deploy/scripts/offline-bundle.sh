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
cp -r ./docker-compose.yml ./kong.yml ./nginx.conf ./Dockerfile ./init ./scripts ./.env.example ./INSTALL.md "$OUT/"
cp -r ../supabase "$OUT/supabase"

tar czf "${OUT}.tar.gz" "$OUT"
rm -rf "$OUT"
echo "Bundle ready: ${OUT}.tar.gz"
