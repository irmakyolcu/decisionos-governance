#!/usr/bin/env bash
# ---------------------------------------------------------------
# Creates the first admin user directly in the local auth database
# (no email delivery required in air-gapped installs).
#   ./create-admin.sh ceo@acme.local 'StrongPassw0rd!'
# ---------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source ./.env; set +a

EMAIL="${1:?usage: create-admin.sh <email> <password>}"
PASSWORD="${2:?usage: create-admin.sh <email> <password>}"

curl -sS -X POST "http://localhost:${KONG_HTTP_PORT}/auth/v1/admin/users" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"email_confirm\":true}" \
  | head -c 400
echo
echo "Admin user created. Sign in at the app URL and create your workspace."
