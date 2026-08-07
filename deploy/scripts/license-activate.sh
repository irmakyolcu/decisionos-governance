#!/usr/bin/env bash
# ---------------------------------------------------------------
# CUSTOMER SIDE. Activates or inspects the offline license.
# No internet, no phone-home: the key is verified locally against
# the vendor's public key.
#
#   ./license-activate.sh <license-key>
#   ./license-activate.sh --status
# ---------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source ./.env; set +a

if [ "${1:-}" != "--status" ] && [ -n "${1:-}" ]; then
  KEY="$1"
  if grep -q '^DECISIONOS_LICENSE=' ./.env; then
    node -e '
      const fs=require("fs");const[f,v]=process.argv.slice(1);
      fs.writeFileSync(f,fs.readFileSync(f,"utf8")
        .replace(/^DECISIONOS_LICENSE=.*$/m,"DECISIONOS_LICENSE="+v));
    ' ./.env "$KEY"
  else
    echo "DECISIONOS_LICENSE=$KEY" >> ./.env
  fi
  echo "License stored. Restarting services that read it..."
  docker compose --env-file ./.env up -d functions
  sleep 3
fi

echo "Current license status:"
curl -sS "http://localhost:${KONG_HTTP_PORT}/functions/v1/license-status" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "apikey: ${SERVICE_ROLE_KEY}" | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      try{console.log(JSON.stringify(JSON.parse(s),null,2));}catch{console.log(s);}
    });'
