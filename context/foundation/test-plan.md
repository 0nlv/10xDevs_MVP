# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-06-02

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "the team
   is worried about X, and the failure would surface somewhere in <area>"
   carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src/`, `supabase/migrations/` (10 commits/30d — bootstrap phase, limited signal).

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the *evidence that surfaced
this risk* — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|---|---|---|---|
| 1 | Paid user uploads revenue CSV → system parses wrong column as "Amount" → margin calculations show false profit/loss → user makes bad business decision (fires profitable client) | High | High | PRD FR-007 Socrates note (manual mapping friction), roadmap S-02 (mapping is next slice), PRD NFR (deterministic results = garbage in/out risk) |
| 2 | User assigns costs manually → typo in client name → cost orphaned → client margin falsely high → user keeps unprofitable client | High | Medium | PRD FR-010 (manual corrections guardrail ≤10min), roadmap S-03 (assignment rules = core product risk "garbage in → garbage out"), PRD US-10 (aha moment depends on correct data) |
| 3 | User uploads malformed CSV (encoding issue, missing header) → parser crashes → onboarding stuck → user abandons product before aha moment | High | Medium | PRD FR-004/005 Socrates notes (CSV too flexible, user confusion), roadmap S-01 risk (parsing errors, encoding), PRD NFR timing (preview <2s violated = frustration) |
| 4 | Logged-in user A requests `/dashboard` with user B's `upload_id` in query → sees B's financial data → privacy breach | High | Low | AGENTS.md "RLS mandatory", PRD NFR privacy (tenant isolation), baseline gap (RLS policies exist but coverage unverified), roadmap S-06 (RLS testing deferred) |
| 5 | User uploads 500 transactions → calculation engine times out (>60s NFR) → user sees loading spinner forever → abandons without results | Medium | Medium | PRD NFR timing (<60s user-perceived), roadmap S-04 risk (performance testing needed, "hundreds of transactions" unknown ceiling), PRD US-07 (processing must complete) |
| 6 | User uploads revenue CSV twice (corrects mistake) → old upload not deleted → dashboard shows doubled revenue → false "all clients profitable" | Medium | Medium | PRD FR-022 (delete/update data), roadmap S-01 (upload exists, delete/update NOT implemented yet per baseline), hot-spot `src/middleware.ts` (auth exists, data cleanup unknown) |
| 7 | API route `/api/upload-revenue` receives 100 requests/sec from script → Cloudflare Worker exhausted → legitimate user gets 5xx during onboarding → abandons | Medium | Low | PRD has payments=no but auth=yes (account creation = attack surface), baseline Cloudflare Workers (10MB request limit noted, rate-limit NOT noted), AGENTS.md (no mention of rate-limiting) |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|---|---|---|---|---|
| #1 | Mipmapped column with wrong name is rejected before calculation, OR preview shows warning "using column X as Amount — confirm?" | "User can see the preview" does not prove they noticed the wrong mapping | CSV parsing entry point, mapping storage schema, preview component props, amount field validation rules | integration (upload → parse → map → validate flow) | Happy-path test with correct CSV — must test wrong mapping explicitly |
| #2 | Orphaned cost (no matching client) surfaces as alert before calculation, OR manual-entry UI prevents typo (autocomplete from revenue clients) | "Manual entry exists" does not prove typo protection exists | Cost assignment rule types, client name matching logic, orphaned-cost detection point, UI autocomplete availability | integration (assignment rule → orphan detection) | Mock that returns "all costs assigned" — must test orphan scenario |
| #3 | Malformed CSV (missing header, encoding issue) returns actionable error ("missing Amount column"), does NOT crash, does NOT pretend to succeed | "Try-catch exists" does not prove the error message is actionable | Papaparse error surface, upload validation entry, error translation to user message, encoding detection capability | unit (parser edge cases) + integration (upload → error surface) | Test that asserts "error thrown" without checking message clarity |
| #4 | Request with wrong user_id in query/body returns 403, AND does NOT leak the other user's data in error body | "RLS policy exists" does not prove it covers this query shape | RLS policy definitions, upload_id query param usage, Supabase client setup in middleware, error response shaping | integration (auth + query with wrong ID) | Test that only checks "200 for correct user" — must test "403 for wrong user" |
| #5 | 500 transactions completes <60s, OR progress indicator shows % (not infinite spinner), OR timeout returns partial results + "continue" option | "Works with 10 transactions" does not prove 500 works | Calculation engine entry, transaction batch size, timeout configuration, progress-reporting capability, partial-result storage | integration (large dataset) + load test (realistic volume) | Test with 10 transactions and assume it scales |
| #6 | Re-upload overwrites old data cleanly, OR dashboard has "active upload" selector, OR old upload is soft-deleted with restore option | "Upload saves to DB" does not prove old upload is handled | Upload record lifecycle, dashboard query (does it filter by "latest"?), delete/update endpoint existence, soft-delete schema support | integration (upload twice → query dashboard) | Test upload-once path only |
| #7 | 100 req/s is rate-limited (429) before Worker exhausts, OR spike queue (429 + retry-after) protects legitimate users | "Works under normal load" does not prove spike protection | Cloudflare rate-limit config availability, Worker CPU/memory limits, request deduplication capability, legitimate-user prioritization | integration (simulate spike) + Cloudflare config check | Test happy path at 1 req/s and call it done |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|---|---|---|---|---|---|
| 1 | Data flow protection | Defend CSV upload → mapping → assignment → calculation flow against garbage data | #1, #2, #3 | integration + unit | change opened | context/changes/testing-data-flow-protection/ |
| 2 | Security & isolation | Prevent auth bypass, tenant data leakage, and resource abuse | #4, #7 | integration + e2e | not started | — |
| 3 | Performance & reliability | Ensure calculation completes <60s for realistic volumes, data cleanup works | #5, #6 | integration + load | not started | — |
| 4 | Quality gates wiring | Lock the floor in CI (lint, typecheck, test suite must pass before merge) | cross-cutting | gates | not started | — |

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.
Recommendations in this section must be grounded in local manifests/configs
plus the MCP/tools actually exposed in the current session. If a useful docs
or search MCP such as Context7 or Exa.ai is not available, say that instead
of assuming access.

| Layer | Tool | Version | Notes |
|---|---|---|---|
| unit + integration | none yet — see Phase 1 | n/a | Will bootstrap Vitest (Astro/Vite ecosystem standard) in Phase 1 |
| API mocking | none yet — see Phase 1 | n/a | MSW for HTTP mocks (Supabase client stubs), in-memory KV for uploads table |
| e2e | none yet — see Phase 2 | n/a | Playwright (Astro official recommendation + MCP available) |
| accessibility | deferred to v2 | n/a | axe-core — not in 3-week MVP scope |
| AI-native | none planned | n/a | Project is greenfield (no legacy test debt to explain); classic tests sufficient |

**Stack grounding tools (current session):**
- Docs: none — no Context7 or framework docs MCP available in current session; recommendations based on package.json + Astro official docs (manual lookup); checked: 2026-06-02
- Search: none — no Exa.ai or web search MCP available in current session; checked: 2026-06-02
- Runtime/browser: none — no Playwright MCP exposed in current session (will be used via CLI in Phase 2); checked: 2026-06-02
- Provider/platform: none — no GitHub/Cloudflare/Supabase MCPs available; quality gates (Phase 4) will reference .github/workflows/ directly; checked: 2026-06-02

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required for §3 Phase N" means the gate is enforced once that rollout
phase lands; before that, the gate is `planned`.

| Gate | Where | Required? | Catches |
|---|---|---|---|
| lint + typecheck | local + CI | required | syntactic / type drift (already enforced — ESLint strict type-checked) |
| unit + integration | local + CI | required after §3 Phase 1 | logic regressions in data flow |
| e2e on critical flows | CI on PR | required after §3 Phase 2 | broken critical user paths (signup → upload → dashboard) |
| post-edit hook | local (agent loop) | not planned | Project is greenfield; no legacy code to guard |
| visual diff (deterministic) | CI on PR | not planned | No visual-heavy UI (dashboard is tables + numbers per PRD cut-edge) |
| multimodal visual review | CI on PR | not planned | No multimodal use case for financial tables |
| pre-prod smoke | between merge + prod | optional after §3 Phase 3 | Environment-specific failures (Cloudflare Worker limits, Supabase connection) |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section reads
"TBD — see §3 Phase N."

### 6.1 Adding a unit test

TBD — see §3 Phase 1.

### 6.2 Adding an integration test

TBD — see §3 Phase 1.

### 6.3 Adding an e2e test

TBD — see §3 Phase 2.

### 6.4 Adding a test for a new API endpoint

TBD — see §3 Phase 1 (API upload endpoints are the first integration tests).

### 6.5 Adding a test for CSV parsing edge cases

TBD — see §3 Phase 1 (Risk #3 coverage).

### 6.6 Per-rollout-phase notes

(After each phase lands, `/10x-implement` appends a 2-3 line note here
capturing anything surprising the rollout phase taught.)

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout discovery. Future contributors should
respect these unless the underlying assumption changes.

- **Internal admin tools** — Roadmap shows no admin surface in S-01–S-06; if one appears later, it is trusted-user-only (low blast radius). Re-evaluate if admin becomes multi-tenant. (Source: PRD scope — no mention of admin features.)
- **Marketing pages / static content** — PRD cut-edge: "ultra prosty dashboard: lista + liczby, brak rozbudowanych wykresów". No visual snapshot tests for tables. Re-evaluate if charts/graphs are added in v2. (Source: PRD §Non-Goals, roadmap Parked section.)
- **Multi-period historical analysis** — Roadmap Parked: "MVP assumes one snapshot (e.g., last quarter's invoices + costs)". No tests for YoY comparison, trend forecasting. Re-evaluate if roadmap unparks this. (Source: roadmap §Parked.)
- **CSV auto-detection heuristics** — Roadmap Parked: "manual mapping OK for MVP; auto-detect is v2 nice-to-have". No tests for column-name guessing logic (it does not exist in MVP). Re-evaluate if S-02 adds auto-suggest. (Source: PRD FR-007 Socrates note, roadmap §Parked.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-06-02
- Stack versions last verified: 2026-06-02
- AI-native tool references last verified: n/a (none planned)

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
