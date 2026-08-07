#!/usr/bin/env bash
# ---------------------------------------------------------------
# RUN ON THE CUSTOMER HOST (air-gapped). One command install.
# ---------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1/6 Loading container images"
[ -f images/decisionos-images.tar.gz ] && gunzip -c images/decisionos-images.tar.gz | docker load

echo "==> 2/6 Generating secrets"
[ -f ./.env ] || ./scripts/generate-keys.sh

echo "==> 3/6 Installing local LLM weights"
mkdir -p volumes/ollama
[ -d models ] && cp -rn models/. volumes/ollama/ || true

echo "==> 4/6 Starting the stack"
docker compose --env-file ./.env up -d

echo "==> 5/6 Applying database migrations"
./scripts/migrate.sh

echo "==> 6/6 Checking license"
./scripts/license-activate.sh --status || true

set -a; source ./.env; set +a
echo
echo "DecisionOS is up:  http://$(hostname -I | awk '{print $1}'):${APP_HTTP_PORT}"
echo "Create the first admin user with: ./scripts/create-admin.sh <email> <password>"
