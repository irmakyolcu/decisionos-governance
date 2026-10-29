# Project, process, step and task engine
- [x] Plan connected persistent projects, phases, processes, steps, tasks, dependencies, approvals and notifications while preserving existing records.
- [x] Implement project/process execution views, phases/participants/dates, preserved step registry, assignment, blocked-state enforcement, handoffs, corrective tasks and deduplicated notification rules; hourly reminder job ran successfully.
- [x] Verify authenticated TEST project creation through completion in the UI, persistent task readback, approval/dependency blocks, corrective verification, handoff and deduplication, direct-write denial, Turkish/English and mobile display; 54 regression tests plus 8 live integration tests passed.
- [ ] Full viewer/auditor/second-company end-to-end checks and offline installer validation: blocked by missing disposable multi-role and installation environment. External email/Slack delivery is not enabled; current delivery tracking covers in-app persistence and read acknowledgement only.

# Knowledge, evidence and decision memory
- [x] Inspect and plan additive document management, persistent lessons, bidirectional links, authorized search and immutable referenced audit history.
- [x] Implement persistent lessons/decision memory, context fields, private uploads/local Office extraction, retries/consent, typed bidirectional links, caller search and trusted audit references.
- [x] Verify manual decision/lesson creation and reload, bidirectional links, TXT/DOCX/XLSX extraction/download/search, retry deduplication, malformed-file failure, PDF consent, process-step links and immutable audit history with persistent TEST records; 45 regression tests passed.
- [ ] Complete isolated viewer/auditor and second-company negative end-to-end checks, approved external PDF/image extraction and air-gapped dependency/installer verification: requires disposable multi-role environment and explicit external-processing authorization.

# Product architecture audit
- [x] Audit current modules, workflows, live schema and permissions without changing application data.
- [x] Deliver feature status, gaps, additive relationship design, priorities, risks and integration prerequisites for approval.
- [x] Phase 1: fix index, process member lookup and execution ordering; label examples and disable simulated external execution.
- [x] Phase 1: caller-scoped reporting/ingestion, writer analysis checks, machine confidentiality, approval-role and process-link integrity guards.
- [x] Phase 1: append snapshot-linked analysis without deleting human evidence; reject generated evidence/probabilities and unknown financial estimates.
- [x] Phase 1: clear stale workspace/table reads; include both migration sets and stop before unreviewed destructive cleanup.
- [ ] Verify full role/AI/installer flows in an isolated environment: requires disposable backend and authorized external-AI fixture; production user data must not be mutated for this test.
- [ ] Initial on-premise administrator provisioning: requires isolated installer environment; current helper intentionally creates login only, never self-grants admin.

# Website optimization
- [x] Rework the public homepage into the requested seven-section enterprise narrative while keeping the demo video, sign-in, language switching and existing routes.
- [x] Make demo and pilot buttons reach valid demo-request destinations, with accurate available/planned capability and trust wording.
- [x] Update homepage metadata and verify links, form route, Turkish/English copy and mobile layout. Existing video file is valid H.264/30s; playback could not be verified in sandbox Chromium.
- [ ] Enable reliable demo/pilot delivery: blocked by the missing approved booking calendar and lead-receiving destination; existing calendar returns 404 and demo_requests table is absent. The form now reports failure honestly instead of false success.

# Back navigation
- [x] Add localized back navigation to application pages without duplicating existing detail-page controls.
- [x] Verify previous-page navigation, direct-entry fallback, and mobile layout.

# System notifications
- [x] Generate workspace-scoped notifications for decisions, risks, meetings, document processing and action approvals/results.
- [x] Fix live delivery, unread counts, read actions and Turkish/English display.
- [x] Verify a real risk event appears, can be marked read, and stays read after reload.

# Signup permissions
- [x] Add admin, viewer and read-only auditor permissions to invitations, team management and audit access.
- [x] Fix automatic administrator assignment during registration; membership requires administrator approval.
- [x] Verify registration permissions and preserve existing workspace access with permission tests and the authenticated administrator screen.

# Translation corrections
- [x] Audit all application pages, shared controls, messages and locale formatting.
- [x] Localize remaining interface copy without changing user data or stored business values.
- [x] Verify all navigable pages in Turkish and English and run language regression tests.
- [x] Test every Decision Intake heading, description, form field and selection in both languages.
- [x] Translate all remaining Decision Intake copy, including the recommendation panel and feedback messages.
- [x] Verify the “Submit a request. The Judgment Layer…” description updates correctly in both languages.
- [x] Connect navigation, search, dashboard and shared labels to TR/EN selection.
- [x] Translate sign-in and demo booking, including validation messages.
- [x] Verify language persistence and page-to-page switching, including the authenticated dashboard.
