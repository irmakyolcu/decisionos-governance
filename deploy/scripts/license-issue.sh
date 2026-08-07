#!/usr/bin/env bash
# ---------------------------------------------------------------
# VENDOR SIDE ONLY. Issues an offline license key bound to one
# deployment. The customer pastes the output into their .env.
#
#   ./license-issue.sh --customer "Acme A.S." \
#                      --deployment <DEPLOYMENT_ID from customer> \
#                      --seats 250 --expires 2027-12-31 \
#                      --features core,ai,api,connectors
# ---------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

CUSTOMER=""; DEPLOYMENT=""; SEATS=50; EXPIRES=""; FEATURES="core,ai"
while [ $# -gt 0 ]; do
  case "$1" in
    --customer)   CUSTOMER="$2"; shift 2;;
    --deployment) DEPLOYMENT="$2"; shift 2;;
    --seats)      SEATS="$2"; shift 2;;
    --expires)    EXPIRES="$2"; shift 2;;
    --features)   FEATURES="$2"; shift 2;;
    *) echo "Unknown flag: $1"; exit 1;;
  esac
done
: "${CUSTOMER:?--customer required}" "${DEPLOYMENT:?--deployment required}" "${EXPIRES:?--expires required}"

node -e '
  const crypto=require("crypto"), fs=require("fs");
  const [customer,deployment,seats,expires,features]=process.argv.slice(1);
  const payload={
    v:1, customer, deployment_id:deployment,
    seats:Number(seats),
    features:features.split(",").map(s=>s.trim()).filter(Boolean),
    issued_at:new Date().toISOString(),
    expires_at:new Date(expires+"T23:59:59Z").toISOString(),
  };
  const body=Buffer.from(JSON.stringify(payload)).toString("base64url");
  const key=crypto.createPrivateKey(fs.readFileSync("license-signing-private.pem"));
  const sig=crypto.sign(null,Buffer.from(body),key).toString("base64url");
  console.log("\nLicense key (single line, give to the customer):\n");
  console.log("DECISIONOS_LICENSE="+body+"."+sig+"\n");
  console.log("Payload:", JSON.stringify(payload,null,2));
' "$CUSTOMER" "$DEPLOYMENT" "$SEATS" "$EXPIRES" "$FEATURES"
