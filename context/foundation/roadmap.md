---
project: ProfitLeak
version: 1
status: draft
created: 2026-06-01
updated: 2026-06-02
prd_version: 1
main_goal: market-feedback
top_blocker: time
---

# Roadmap: ProfitLeak

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

Właściciele mikro i małych firm (2–20 osób) wiedzą że „coś jest nie tak" z rentownością — przychody rosną, ale gotówka nie — ale nie mają narzędzia które jasno wskaże konkretny problem. ProfitLeak zamienia dane finansowe (faktury sprzedaży + koszty) w konkretne decyzje: który klient jest nierentowny, gdzie firma traci pieniądze. Aplikacja wypełnia lukę między raportowaniem historycznym (ERP, księgowość) a operacyjnymi decyzjami biznesowymi.

## North star

**S-05: Alert detection + dashboard with insights** — najmniejszy end-to-end flow którego udane dostarczenie dowodzi core product hypothesis („dane finansowe → konkretny insight o nierentowności"). Umieszczony tak wcześnie jak pozwalają Prerequisites, bo wszystko inne ma znaczenie tylko jeśli to działa. Definicja „north star" w tym kontekście: slice który, jeśli zadziała, potwierdza że użytkownik faktycznie dostaje „aha moment" z dashboard'u pokazującego nierentownych klientów i alerty.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
|---|---|---|---|---|---|
| F-01 | data-schema-migrations | (foundation) PostgreSQL schema for CSV uploads, clients, transactions, costs, mapping/assignment rules, calculated results | — | Data layer (baseline gap) | done |
| S-01 | onboarding-csv-upload | see value prop onboarding, upload revenue/cost CSVs, see preview of parsed data | F-01 | US-03, US-04, FR-003, FR-004, FR-005, FR-006 | done |
| S-02 | column-mapping | map CSV columns to system fields (client, amount, date), preview and correct mapping | S-01 | US-05, FR-007, FR-008 | ready |
| S-03 | cost-assignment | define simple rules for assigning costs to clients, manually adjust assignments | S-02 | US-06, FR-009, FR-010 | proposed |
| S-04 | margin-calculation | see calculated revenue, costs, and margin % per client in simple table | S-03 | US-07, FR-011, FR-012, FR-013, FR-014 | proposed |
| S-05 | alerts-dashboard | see alerts for unprofitable clients + full dashboard (top/bottom clients, global margin, aha moment) | S-04 | US-08, US-09, US-10, FR-015, FR-016, FR-017, FR-018, FR-019, FR-020 | blocked |
| S-06 | user-authentication | sign up, log in, persist data across sessions, delete/update uploaded data (tenant isolation) | S-05 | US-01, US-02, FR-001, FR-002, FR-021, FR-022 | proposed |

## Baseline

What's already in place in the codebase as of 2026-06-01 (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — Astro 6 + React 19, Tailwind 4, file-based routing (src/pages/), shadcn/ui components, build tooling (ESLint, TypeScript)
- **Backend / API:** present — Astro SSR (output: server), API routes (src/pages/api/auth/*.ts), auth middleware (src/middleware.ts)
- **Data:** partial — Supabase client configured (src/lib/supabase.ts), NO migrations (supabase/migrations/ absent), NO seed data
- **Auth:** present — Supabase auth via @supabase/ssr, cookie-based sessions, route protection middleware
- **Deploy / infra:** partial — Cloudflare Pages configured (wrangler.jsonc), CI scaffolded (.github.scaffold/workflows/ci.yml, not active), no IaC
- **Observability:** absent — no logging library, no error tracking (Sentry/Datadog), no metrics

## Foundations

### F-01: Data schema + migrations

- **Outcome:** (foundation) Minimal PostgreSQL schema for CSV file metadata, parsed transactions (revenue), costs, clients, column mapping rules, cost assignment rules, calculated margins, and generated alerts. Migrations created and applied via Supabase CLI.
- **Change ID:** data-schema-migrations
- **PRD refs:** Data layer (baseline gap: no migrations), NFR (deterministic results, tenant isolation)
- **Unlocks:** S-01 (can't store uploaded files or parsed data without schema), S-02 (mapping rules), S-03 (assignment rules), S-04 (calculated results), S-05 (alerts), S-06 (user-owned data with RLS)
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Schema kept minimal (only entities needed for north star flow) to reduce migration churn during iteration; complex entities (multi-project hierarchy, advanced cost buckets) deferred to v2.
- **Status:** ready

## Slices

### S-01: Onboarding + CSV upload + preview

- **Outcome:** User can see simple value prop onboarding ("Wgraj dane, żeby zobaczyć gdzie tracisz pieniądze"), upload revenue CSV and cost CSV files, and see preview of parsed data (first rows, column detection).
- **Change ID:** onboarding-csv-upload
- **PRD refs:** US-03 (upload sprzedaż), US-04 (upload koszty), FR-003 (onboarding), FR-004, FR-005, FR-006 (upload + preview)
- **Prerequisites:** F-01 (data schema for file metadata and parsed rows)
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** CSV parsing errors (malformed files, encoding issues, unexpected formats) could frustrate users; needs graceful error messages and file validation before processing. Performance floor: preview must load < 2s per NFR.
- **Status:** proposed

### S-02: Column mapping

- **Outcome:** User can map CSV columns to system fields (client name, amount, date, optional: project/category) using select dropdowns, preview the mapped data, and correct mapping before confirming.
- **Change ID:** column-mapping
- **PRD refs:** US-05, FR-007 (map columns), FR-008 (correct mapping)
- **Prerequisites:** S-01 (uploaded CSV data exists)
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Should mapping be saved per-user (reusable template) or per-file (one-time)? Owner: user. Block: no (can start with per-file; saving templates is v2 nice-to-have).
- **Risk:** Mapping UI must be self-explanatory (NFR: no documentation required); selectboxes simpler than drag-drop but less discoverable. Known friction point per PRD Socrates counter-argument.
- **Status:** proposed

### S-03: Cost assignment rules

- **Outcome:** User can define 1-2 simple rules for assigning costs to clients/projects (e.g., "assign all costs proportionally" or "assign specific vendor to specific client"), manually adjust individual cost assignments, and confirm before calculation.
- **Change ID:** cost-assignment
- **PRD refs:** US-06, FR-009 (define rules), FR-010 (manual corrections)
- **Prerequisites:** S-02 (mapped data exists: clients from revenue CSV, vendors/categories from cost CSV)
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Which 1-2 default rules to offer? (proportional allocation, direct assignment by vendor name match, project-based if project column exists?) Owner: user. Block: no (can start with proportional + direct; user testing will refine).
- **Risk:** Poor default rules mean user spends >10 min manually adjusting (violates NFR guardrail §FR-010 Socrates note); mitigation requires user testing with real CSV samples. Core product risk: garbage in (bad cost assignment) → garbage out (misleading margins).
- **Status:** proposed

### S-04: Margin calculation engine

- **Outcome:** User can see calculated revenue per client, costs per client, margin % per client, and global margin in a simple sortable table (no charts, just numbers).
- **Change ID:** margin-calculation
- **PRD refs:** US-07 (processing), FR-011 (revenue per client), FR-012 (costs per client), FR-013 (margin % per client), FR-014 (global margin)
- **Prerequisites:** S-03 (cost assignments finalized)
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Calculation must be deterministic (same input → same output per NFR) and complete in < 60s user-perceived time (NFR timing constraint). Needs performance testing with realistic data volumes (hundreds of transactions, dozens of clients). Known limitation per PRD Business Logic: only DIRECT costs per client, not fully-loaded cost (overheads ignored or allocated proportionally).
- **Status:** proposed

### S-05: Alert detection + full dashboard

- **Outcome:** User can see full dashboard with: (1) top 5 most profitable clients, (2) bottom 5 least profitable (or unprofitable) clients, (3) 3-5 threshold-based alerts (unprofitable client, margin drop if historical data exists, cost growth if data exists), (4) global margin %, (5) aha moment: clear visual indicator of which client is the problem.
- **Change ID:** alerts-dashboard
- **PRD refs:** US-08 (alert detection), US-09 (dashboard view), US-10 (aha moment — emergent from US-09), FR-015 (threshold alert), FR-016 (margin drop alert), FR-017 (cost growth alert), FR-018 (top clients), FR-019 (bottom clients), FR-020 (alerts with descriptions)
- **Prerequisites:** S-04 (calculated margins exist)
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - **Alert threshold for "unprofitable client"**: What margin % should trigger the alert? (e.g., < 20%, < 10%, < 0%?) Owner: user. Block: **yes** (alert logic can't be coded without this decision).
  - Trend alerts (FR-016, FR-017): graceful degradation if no historical data (alert doesn't fire, per PRD Socrates note). Threshold for "significant drop/growth"? Owner: user. Block: no (can start with simple heuristic like ">20% change", refine later).
- **Risk:** Too many alerts = noise (violates NFR "max 3-5 alerts"); must prioritize only highest-impact problems. Alert explanations must be plain language (NFR: no jargon, self-explanatory). Dashboard simplicity (NFR: "ultra prosty dashboard" — lists + numbers, no interactive charts) is load-bearing for 3-week timeline.
- **Status:** blocked

### S-06: User authentication + data management

- **Outcome:** User can sign up (email + password or magic link), log in, see only their own uploaded data across sessions (tenant isolation via RLS), delete previously uploaded files, and re-upload updated data for new analysis.
- **Change ID:** user-authentication
- **PRD refs:** US-01 (signup), US-02 (login/onboarding), FR-001 (create account), FR-002 (login), FR-021 (persist data across sessions), FR-022 (delete/update data)
- **Prerequisites:** S-05 (core flow validated in demo mode first; auth added after north star proves value)
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Baseline shows Supabase auth scaffold exists (signup/signin pages, middleware), but needs Row Level Security (RLS) policies for tenant isolation (one user can't see another's CSV data). Straightforward but adds attack surface; must test RLS policies thoroughly. Sequenced AFTER north star (S-05) per main_goal (market-feedback: validate core hypothesis before adding auth friction).
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-01 | data-schema-migrations | Set up PostgreSQL schema for CSV data and margins | done | Completed 2026-06-02 |
| S-01 | onboarding-csv-upload | Onboarding + CSV upload with preview | done | Completed 2026-06-02 |
| S-02 | column-mapping | Map CSV columns to system fields | yes | Run `/10x-plan column-mapping` |
| S-03 | cost-assignment | Define cost assignment rules | no | Depends on S-02 |
| S-04 | margin-calculation | Calculate revenue, costs, margins per client | no | Depends on S-03 |
| S-05 | alerts-dashboard | Alert detection + insights dashboard | no | Blocked: resolve alert threshold question |
| S-06 | user-authentication | User signup, login, data persistence | no | Depends on S-05 (auth after core validated) |

## Open Roadmap Questions

1. **Alert threshold for "unprofitable client" (FR-015)** — At what margin % should the system flag a client as unprofitable and generate an alert? Options: < 0% (negative margin only), < 10% (very low), < 20% (below typical healthy margin). Owner: user. Block: S-05 (alert logic can't be coded until this is decided).

## Parked

- **Auto-detect CSV column mapping** — Why parked: PRD §Non-Goals implicit (manual mapping OK for MVP); FR-007 Socrates counter-argument mentions auto-detect as nice-to-have for v2. MVP uses manual selectboxes; heuristic auto-suggest deferred.
- **Multiple cost assignment templates** — Why parked: Time blocker + PRD scope ("1–2 heurystyki" per cut-edge); MVP offers 2 simple rules (proportional, direct), additional templates (project-based, activity-based costing) deferred to v2.
- **Advanced trend analysis and forecasting** — Why parked: PRD §Non-Goals ("Avoid: własny silnik AI/ML do predykcji"); FR-016/017 implement graceful degradation (basic threshold checks, no ML-based trend prediction).
- **Interactive charts and drill-down exploration** — Why parked: PRD §Non-Goals ("brak rozbudowanych wykresów"), cut-edge ("ultra prosty dashboard: lista + liczby"). MVP shows sortable tables + numbers; charts deferred to v2.
- **Historical data upload beyond single-period snapshots** — Why parked: Time blocker; MVP assumes user uploads one snapshot (e.g., last quarter's invoices + costs). Multi-period upload, trend over time, YoY comparison deferred to v2.

## Done

- **F-01 (data-schema-migrations)** — Completed 2026-06-02. PostgreSQL schema deployed (uploads, clients, transactions, costs tables with RLS policies).
- **S-01 (onboarding-csv-upload)** — Completed 2026-06-02. 3-step wizard (value prop → revenue upload → cost upload → confirmation), CSV parsing with papaparse, preview tables, deployed to Cloudflare Workers.
