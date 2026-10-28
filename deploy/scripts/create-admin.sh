#!/usr/bin/env bash
# Creates a local login only; membership needs administrator approval.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source ./.env; set +a
EMAIL="${1:?usage: create-admin.sh <email>}"
read -r -s -p 'Login password: ' PASSWORD; echo
export EMAIL PASSWORD
payload=$(python3 -c 'import json,os; print(json.dumps({"email":os.environ["EMAIL"],"password":os.environ["PASSWORD"],"email_confirm":True}))')
unset PASSWORD
printf '%s' "$payload" | curl --fail --silent --show-error -X POST "http://localhost:${KONG_HTTP_PORT}/auth/v1/admin/users" \
 -H "apikey: ${SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" -H 'Content-Type: application/json' --data-binary @- >/dev/null
unset payload
echo 'Login created. Workspace access still requires approved membership; no admin role was assigned.'
