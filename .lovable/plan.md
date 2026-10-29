# Integration Hub & Workflow Automation

Builds on what already exists: Data Sources, Integrations catalog, API keys, `public-api` import/export, Slack/meeting sync, and the workflow engine. Nothing working is removed; simulated catalog entries stay labeled as simulated.

## What the user will get

1. **Integration Hub (admins only)** — one page listing every integration with real status (Not configured / Connected / Error / Disabled), last sync, last error. Actions: configure, enable/disable, test connection (real call, never faked), view logs, retry failed runs. Credentials are entered through secure backend forms and never shown again in the browser.
2. **Inbound data** — authenticated inbound endpoint (API key or signed webhook) for records, documents, meeting notes, decisions and operational events. Payloads validated; repeated deliveries with the same event ID are ignored safely; every call logged.
3. **Outbound webhooks** — admins register destination URLs and choose events: decision approved, task assigned, step completed, risk threshold exceeded, approval required. Each delivery is signed, logged, retried with backoff, and deduplicated.
4. **Slack** — admins choose an explicit allowlist of Slack channels per workspace; only those are read (no DMs / private channels unless explicitly allowed). AI proposes possible decisions, actions, owners and deadlines into a **review inbox**; nothing is created until a person accepts each item.
5. **Automation rules** — admins define "when event X (with conditions) then: create task / notify / escalate / block next step". Ships with the quality-failure template. Rules run through the existing workflow commands, so completion gates and permissions still apply.

## Required from you later
- Slack: each user connects their own Slack (already supported); admin then picks channels. No new key needed.
- Any other live provider (CRM, ERP, etc.): a key per provider, requested only when you choose one.

## Technical details
- New tables (workspace-scoped, RLS, admin-write, auditor read): `integration_configs`, `integration_runs` (logs/retries), `inbound_events` (unique `(workspace, source, external_id)`), `webhook_endpoints` (secret stored server-side only, hashed reference in client), `webhook_deliveries` (unique `(endpoint, event_key)`, attempts, next_retry_at), `slack_channel_allowlist`, `extraction_suggestions` (pending/accepted/rejected), `automation_rules`, `automation_runs`.
- Event source: DB triggers on decisions/workflow_tasks/workflow_steps/risks/workflow_approvals append to an `outbound_events` outbox; `pg_cron` + `webhook-dispatch` function delivers with HMAC signature (Standard Webhooks format), exponential retry, max attempts, then "failed" visible in hub with manual retry.
- `integration-inbound` edge function: API-key or HMAC auth, zod validation, idempotent insert, routes to existing ingestion (`ingest-document`, meeting records, decisions as Draft only).
- `integration-test` edge function performs a real probe; missing credentials return "not configured", never success.
- `meeting-sync` restricted to allowlisted channels; extraction writes `extraction_suggestions`; acceptance RPC creates records as the accepting user (RLS applies).
- `automation_evaluate` SECURITY DEFINER function invoked from the outbox, executes actions via `workflow_apply`; loop guard (max depth) and per-event dedupe.
- All admin actions audited in `audit_events`; TR/EN translations; Vitest tests for signature, idempotency, rule matching, role gates; Playwright check of hub, webhook delivery log, Slack review inbox.
