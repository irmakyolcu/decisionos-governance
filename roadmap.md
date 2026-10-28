# Product architecture audit
- [ ] Audit current modules, workflows, live schema and permissions without changing application data.
- [ ] Deliver feature status, gaps, additive relationship design, priorities, risks and integration prerequisites for approval.

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
