# DecisionOS — Architecture Instructions

Executive decision intelligence and governed AI execution platform.
Principle: **AI prepares the decision; humans remain accountable.** Strategic decisions and executable actions are approved in separate workflows.

## 1. Stack
- Frontend: React 18, Vite 5, TypeScript, Tailwind CSS v3, shadcn/ui
- Backend: Lovable Cloud (PostgreSQL, Auth, Storage, Edge Functions on Deno)
- AI: `supabase/functions/_shared/aiClient.ts` — Lovable AI Gateway or self-hosted Ollama/vLLM
- i18n: `src/contexts/LanguageContext.tsx` + `src/lib/i18n/*` (TR/EN)
- Self-hosted package: `deploy/` (Docker stack, migrations, offline Ed25519 license)

## 2. Core Rules
1. **Dual approval:** `decisions` → `decision_approvals` (strategy); `action_proposals` → `action_approvals` (execution).
2. **Authority levels 0–3:** 0 notify, 1 owner, 2 manager, 3 CEO/board. Higher levels always need a human.
3. **Immutable audit:** `audit_events` / `audit_logs` block UPDATE/DELETE via triggers; approved decisions are locked (`enforce_decision_lock`).
4. **Evidence-backed AI:** AI rates criteria; risk score is computed deterministically in code. Uncited facts are downgraded to inference; numeric probabilities need ≥5 similar recorded outcomes.
5. **Workspace isolation:** every business table has `workspace_id` + RLS; storage paths are workspace-scoped.
6. **Roles:** admin, executive, manager, owner, member, auditor (read-only, restrictive write policies), viewer. Signup never grants admin; membership requires admin approval or invite.

## 3. Navigation (src/components/AppSidebar.tsx)
| Group | Routes |
|---|---|
| Company Brain | `/`, `/ask`, `/brain` |
| Corporate Memory | `/memory`, `/memory/structured`, `/memory/decisions`, `/memory/retrospective`, `/memory/decision-timeline`, `/memory/lessons`, `/memory/links`, `/memory/link-audit`, `/memory/timeline`, `/memory/notes`, `/memory/glossary` |
| Intelligence | `/decisions`, `/decisions/:id`, `/decisions/list/:id`, `/decision-intake`, `/clients`, `/projects`, `/processes`, `/skills`, `/risks`, `/external-context` |
| Approvals & Execution | `/approvals-center`, `/proposals`, `/approvals`, `/execution`, `/policies`, `/delegation-engine`, `/strategic-alignment`, `/authority` |
| CEO Twin & Voice | `/ceo-profile`, `/decision-twin`, `/twin-onboarding`, `/voice-assistant`, `/training-data` |
| Audit | `/audit/internal`, `/audit/external`, `/audit/ledger`, `/compliance`, `/security-audit`, `/agent-performance`, `/anomalies`, `/reviews` |
| Admin | `/data-sources`, `/integration-hub`, `/integrations`, `/meeting-sources`, `/reports`, `/team`, `/admin`, `/api-keys`, `/settings`, `/profile` |
| Public | `/landing`, `/book-demo`, `/auth`, `/invite`, `/trust` |

Back navigation is centralized in `AppLayout` (`PageBackButton`, `getBackFallback`).

## 4. Frontend Layers
- Contexts: `AuthContext`, `WorkspaceContext` (active workspace, role), `LanguageContext`
- Hooks: `useDecisions`, `useGovernance`, `useWorkflow`, `useLessons`, `useMeetings`, `useNotifications`, `useProposals`, `useRecordCatalog`, `useLinkAudit`, `useLicense`, `useVoiceRecorder`
- Lib: `permissions.ts`, `roleHierarchy.ts`, `workflow.ts`, `stepAudit.ts`, `records.ts`, `documentUpload.ts`, `intelligenceReport.ts`, `pdf/`

## 5. Edge Functions
| Function | Purpose |
|---|---|
| `public-api` | External REST API (API key + scopes) |
| `decision-analyze` | Alternatives, pros/cons, assumptions, scenarios |
| `decision-intelligence` | Claim classification, deterministic risk, append-only runs |
| `decision-risk-assess` / `decision-macro-assess` | Operational and macro risk |
| `evaluate-decision` | AI evaluation metrics |
| `ceo-recommend` | CEO Digital Twin recommendation |
| `ask-decisionos` | RAG answers with citations |
| `lessons-insights` | Executive summary, gaps, action/price strategy |
| `ingest-document` | Local Office extraction, consent-gated external AI |
| `integration-inbound` | Idempotent inbound events |
| `webhook-dispatch` | HMAC-signed outbound webhooks + retry |
| `gmail-sync`, `gmail-sync-scheduler` | Gmail evidence sync |
| `meeting-sync` | Slack/meeting transcripts → review inbox |
| `fetch-api-source` | SSRF-guarded external API pull |
| `generate-report` | Scheduled executive reports |
| `voice-transcribe`, `voice-tts`, `voice-chat` | Voice assistant |
| `license-status` | Offline license check |
| `app-user-connect` | Per-user OAuth connections |

All user-facing functions validate JWT and workspace membership.

## 6. Public API (`/functions/v1/public-api`)
```
GET  /v1/decisions[/:id]   decisions:read
POST /v1/decisions         decisions:write
GET/POST /v1/lessons       lessons:read|write
GET/POST /v1/knowledge     knowledge:read|write
GET  /v1/notifications     notifications:read
GET  /v1/audit             audit:read
GET  /v1/processes         processes:read
GET/POST /v1/process-links processes:read|write
GET  /v1/export?entities=...&format=json|csv&event_type=&flow=
POST /v1/import {entity, records[], dry_run?}
```
Keys stored as SHA-256 hashes. Restricted data needs explicit confidential scope + admin key.

## 7. Data Model (main groups)
- Tenancy: `workspaces`, `workspace_members`, `workspace_invites`, `profiles`
- Decisions: `decisions`, `decision_alternatives|evidence|assumptions|unknowns|scenarios|pros_cons|comments|history|outcomes|reviews|approvals|risk_assessments|macro_assessments|context_snapshots|recommendations|roles`, `ai_evaluations`
- Execution: `action_proposals`, `action_approvals`, `execution_records`, `proposals`, `agent_runs`
- Workflow: `projects`, `processes`, `process_links`, workflow runs/steps/tasks registry (JSON step UUIDs preserved), `company_skills`
- Memory: `knowledge_items`, `memory_entries`, `record_links`, `company_notes`, `note_attachments`, `uploaded_documents`
- Governance: `policies`, `policy_versions`, `policy_evaluations`, `risks`, `risk_criteria`, `anomalies`, `compliance_reports`
- External: `external_sources`, `external_observations`, `decision_intelligence_runs`
- Audit: `audit_events`, `audit_logs`
- Integrations: `api_keys`, `data_sources`, `integrations`, `app_user_connections`, `outbound_events`, webhook deliveries, automation rules, `gmail_sync_schedules`, `meetings`, `meeting_recordings`
- Twin: `twin_profiles`, `twin_preferences`, `twin_corrections`
- `notifications` (DB-trigger generated, `mark_notifications_read` RPC)

## 8. Key Flows
1. **Decision lifecycle:** Intake (draft) → AI analysis + intelligence + twin → strategic approval → lock → action proposals (authority 0–3) → execution records → post-decision review → lessons in memory.
2. **Memory loop:** outcomes → `knowledge_items` → `record_links` → `search_memory()` (runs as caller, RLS authoritative) → reused as precedent.
3. **Workflow:** server-authorized `workflow_apply` commands enforce dependencies, required tasks, quality and approval gates; deduplicated notifications; corrective tasks on failure.
4. **Integrations:** DB triggers → `outbound_events` → `webhook-dispatch`; inbound deduplicated by idempotency key; Slack reads only allowlisted channels into a human review inbox.
5. **Invites:** admin invites → `get_invite_by_token` → atomic `accept_workspace_invite` validated against confirmed email.

## 9. Change Guidelines
- Never bypass RLS from the client; privileged transitions go through RPCs/Edge Functions.
- Use semantic design tokens (Midnight Indigo); no hardcoded colors.
- Localize all UI text through LanguageContext; never translate stored codes.
- Turkish copy uses plain "a" (no circumflex).
- Preserve existing data and working flows; AI never approves or executes on its own.
