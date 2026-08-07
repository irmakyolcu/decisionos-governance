#!/usr/bin/env bash
# ---------------------------------------------------------------
# VENDOR SIDE ONLY. Creates the Ed25519 signing key pair used to
# issue offline license keys. Run once, ever. Guard the private key.
# ---------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

openssl genpkey -algorithm ED25519 -out license-signing-private.pem
openssl pkey -in license-signing-private.pem -pubout -out license-signing-public.pem

PUB=$(node -e '
  const {createPublicKey}=require("crypto"),fs=require("fs");
  const raw=createPublicKey(fs.readFileSync("license-signing-public.pem"))
    .export({format:"jwk"});
  process.stdout.write(raw.x);
')

echo "Private key: deploy/license-signing-private.pem  (NEVER ship this)"
echo
echo "Put this in every customer .env as DECISIONOS_LICENSE_PUBLIC_KEY:"
echo "  $PUB"
