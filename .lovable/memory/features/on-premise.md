---
name: On-premise air-gapped deployment
description: Docker Compose self-hosted stack, local Ollama LLM, offline Ed25519 license activation
type: feature
---
DecisionOS is sold as an air-gapped on-premise install alongside the cloud version.

## Deployment
- `deploy/` holds Dockerfile (nginx SPA), docker-compose.yml (postgres, gotrue, postgrest, storage, postgres-meta, edge-runtime, kong, ollama, app), kong.yml, init SQL, scripts.
- `scripts/offline-bundle.sh` runs on a connected machine; `scripts/install.sh` on the customer host.
- `scripts/migrate.sh` applies `supabase/migrations/*.sql` idempotently via `public.schema_migrations`.
- Docs: `deploy/INSTALL.md`, `deploy/LICENSING.md`.

## AI
- On-prem uses local Ollama/vLLM through `AI_BASE_URL` (OpenAI-compatible).
- `supabase/functions/_shared/aiClient.ts` abstracts Lovable Gateway vs local. New AI code must use it, not raw gateway fetches.
- `AI_ALLOW_EXTERNAL=false` hard-blocks non-local AI hosts; `AI_ENABLED=false` disables all AI.

## Licensing
- Offline Ed25519 signed key: `base64url(payload).base64url(signature)`, no phone-home.
- Bound to `DEPLOYMENT_ID`; 14-day grace after expiry; feature flags: core, ai, api, connectors, compliance.
- `supabase/functions/_shared/license.ts` (`requireFeature`), `license-status` function, `useLicense` hook, `LicenseBanner`.
- Empty `DECISIONOS_LICENSE_PUBLIC_KEY` = cloud install, licensing disabled.
