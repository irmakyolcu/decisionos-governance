# AI Decision Intelligence & Executive Risk

Builds on existing decision analysis, risk/macro assessments, executive dashboard, reports and workflow engine. Nothing working is removed.

## A. Evidence-grounded decision analysis
- New server step gathers only data the user can see: past decisions with recorded outcomes, linked projects/processes/tasks/lessons, client/company notes, documents, meetings, evidence, and stored external context.
- Model output is split into four labelled groups: **Documented fact** (must cite a supplied record ID), **AI inference**, **Assumption**, **Missing information**. Facts without a valid citation are downgraded to inference automatically.
- "Similar past decisions" panel: similarities, differences, and the recorded outcome — or "No recorded outcome" when none exists.

## B. Explainable risk assessment
- Configurable criteria per workspace (probability, impact, evidence quality, historical outcomes, external conditions, uncertainty/conflicts) with weights editable by admins.
- Score computed deterministically from criterion ratings (not by the model); model supplies ratings + rationale + evidence IDs.
- Display: level, score, rationale, contributing factors, cited evidence, data timestamps, mitigations.
- Numeric probability shown only when computed from at least a minimum number of recorded outcomes of similar decisions; otherwise a labelled qualitative level.

## C. External context sources
- Source registry: type (macro / industry / geopolitical / other), provider, URL, configured flag.
- Stored observations: value/summary, source reference, publication date, retrieval time, freshness window; stale items labelled "Outdated".
- When nothing is configured, a clear "External sources not configured — internal data only" notice; no invented figures.

## D. CEO Executive Intelligence
- Extend Executive Dashboard: high-priority risks, decisions awaiting approval, critical issues, blocked/overdue workflow steps and tasks, department risk + open tasks, historical outcomes and lessons.
- Each alert card: why it matters, evidence, affected process, accountable owner, recommended next action, and a drill-down link to the decision / evidence / project / process / task.

## E. PDF reporting
- "Decision intelligence report" PDF (reuses existing jsPDF + Turkish fonts): reporting period, data freshness, charts (risk distribution, outcomes), risk assessments, source references, decision summaries, recommended actions. Built only from the caller's authorized data.

## F. Governance
- AI output never changes decision status or executes actions; consequential recommendations create a draft that goes through the existing approval workflow.

## Technical details
- Tables: `risk_criteria`, `external_sources`, `external_observations`, `decision_intelligence_runs` (append-only, snapshot-linked), all workspace-scoped with GRANTs + RLS (writers create, members read, auditors read-only).
- Edge function `decision-intelligence` (user-scoped client, admin/approver only, default gateway model, strict JSON schema, citation validation). `decision-risk-assess` reuses the deterministic scorer.
- Shared `riskScoring.ts` + `evidenceGrounding.ts` with Vitest tests: weighted score, probability gate, fact downgrade, staleness.
- TR/EN translations; Playwright check of analysis, dashboard drill-down and PDF download.

## Not possible without you
- Real live economic/industry feeds need a chosen provider and API key; until then only manually entered, dated observations are used.
