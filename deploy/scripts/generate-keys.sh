#!/usr/bin/env bash
# ---------------------------------------------------------------
# Generates every secret an on-premise install needs and writes
# them into deploy/.env (created from .env.example if missing).
# Run ONCE per customer installation. Keep the resulting .env safe.
# ---------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="./.env"
[ -f "$ENV_FILE" ] || cp ./.env.example "$ENV_FILE"

need() { command -v "$1" >/dev/null || { echo "Missing required tool: $1"; exit 1; }; }
need openssl
need node

set_env() { # set_env KEY VALUE
  local k="$1" v="$2"
  if grep -q "^${k}=" "$ENV_FILE"; then
    node -e '
      const fs=require("fs");const[f,k,v]=process.argv.slice(1);
      const s=fs.readFileSync(f,"utf8").replace(new RegExp("^"+k+"=.*$","m"),k+"="+v);
      fs.writeFileSync(f,s);
    ' "$ENV_FILE" "$k" "$v"
  else
    printf '%s=%s\n' "$k" "$v" >> "$ENV_FILE"
  fi
}

JWT_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 24)
DEPLOYMENT_ID=$(openssl rand -hex 16)

# Mint the anon + service_role JWTs signed with the new JWT secret.
read -r ANON SERVICE <<<"$(node -e '
  const crypto=require("crypto");
  const secret=process.argv[1];
  const b64=(o)=>Buffer.from(JSON.stringify(o)).toString("base64url");
  const iat=Math.floor(Date.now()/1000), exp=iat+60*60*24*365*10;
  const sign=(role)=>{
    const h=b64({alg:"HS256",typ:"JWT"});
    const p=b64({role,iss:"supabase",iat,exp});
    const s=crypto.createHmac("sha256",secret).update(h+"."+p).digest("base64url");
    return h+"."+p+"."+s;
  };
  process.stdout.write(sign("anon")+" "+sign("service_role"));
' "$JWT_SECRET")"

set_env JWT_SECRET       "$JWT_SECRET"
set_env POSTGRES_PASSWORD "$DB_PASSWORD"
set_env ANON_KEY          "$ANON"
set_env SERVICE_ROLE_KEY  "$SERVICE"
set_env DEPLOYMENT_ID     "$DEPLOYMENT_ID"

echo "Secrets written to deploy/.env"
echo
echo "Deployment ID (send this to the vendor to obtain a license key):"
echo "  $DEPLOYMENT_ID"
