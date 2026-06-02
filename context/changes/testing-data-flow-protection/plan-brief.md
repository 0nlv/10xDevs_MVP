# Data Flow Protection — Plan Brief

> Full plan: [context/changes/testing-data-flow-protection/plan.md](context/changes/testing-data-flow-protection/plan.md)  
> Research: [context/changes/testing-data-flow-protection/research.md](context/changes/testing-data-flow-protection/research.md)

## What & Why

Bootstrap test infrastructure (Vitest + MSW) and write integration + unit tests protecting CSV upload → mapping → calculation flow against the top 3 data-integrity risks: wrong column mapping causing false margins, orphaned costs from typos, and malformed CSV crashes. This is Phase 1 of the 4-phase test rollout from test-plan.md — establishes the test base all future changes build on.

## Starting Point

No test infrastructure exists: zero test dependencies, no vitest config, no test files. Research mapped the code paths (csv-parser.ts findColumn(), upload-revenue.ts API, margin calculation) and recommended integration tests as cheapest per signal. Current implementation has known gaps (greedy pattern matching, no mapping confirmation) but preserves source data in `raw_data` JSONB, allowing post-upload correction.

## Desired End State

Developers run `npm run test` and see 10+ passing tests (<5s total) proving Risk #1, #2, #3 protections exist. Integration tests validate upload → parse → validate → store flow with mocked Supabase client (no external dependencies). Unit tests document csv-parser.ts edge-case behavior. Test suite is CI-ready: deterministic, fast, no secrets required.

## Key Decisions Made

| Decision                       | Choice                                      | Why                                                                                                                  | Source   |
| ------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------- |
| Test database strategy         | In-memory mocks (MSW + object stubs)        | Fast (<100ms per test), no Docker/network, CI-ready — acceptable tradeoff since Phase 1 tests app logic not DB      | Plan     |
| Risk #2/#3 coverage depth      | Core scenarios only (1 test per risk)      | Validates protection exists without exhaustive edge cases — aligns with test-plan.md "cost × signal" principle       | Plan     |
| Test data fixtures             | Inline CSV strings in test files            | Self-contained tests, no external file dependencies — pattern matches research recommendation                        | Plan     |
| Scope boundary                 | Tests only (defer improvements to S-02)     | Tests document current behavior including known gaps — feature work (mapping UI, ranking) belongs in roadmap S-02    | Plan     |
| Phase sequencing               | Infrastructure → Unit → Integration         | Validates tooling early with simple unit tests before tackling complex integration mocks — standard rollout pattern  | Plan     |
| Mocking boundary               | Mock at Supabase client method level        | Clean boundary (tests call real API routes, mock only DB responses) — method-level mocks sufficient per research     | Plan     |

## Scope

**In scope:**
- Vitest setup (config, dependencies, directory structure)
- Test utilities (mock Supabase client, auth context helpers)
- Unit tests for csv-parser.ts (pattern matching, malformed CSV handling)
- Integration tests for Risk #1 (wrong column), Risk #2 (orphaned cost), Risk #3 (malformed CSV end-to-end)
- Happy-path integration tests (revenue upload, cost upload)

**Out of scope:**
- e2e tests (Playwright — Phase 2)
- CI/CD wiring (GitHub Actions — Phase 4)
- Feature improvements (findColumn ranking, mapping metadata, validation warnings — S-02)
- Real database testing (Supabase local instance)
- Comprehensive edge-case coverage (exhaustive testing deferred)
- Risks #4–#7 (security, performance, reliability — Phases 2–3)

## Architecture / Approach

**Mocking strategy:**
```
Integration Test
    ↓ calls
API Route (real code: upload-revenue.ts)
    ↓ orchestrates
csv-parser.ts (real code)
    ↓ calls
Supabase client [MOCKED] ← returns controlled responses
```

**Test layers:**
- **Unit tests** (csv-parser.ts): Isolated function tests, inline CSV strings as input
- **Integration tests** (API routes): Mock Supabase client at method level (`.from().insert()`), validate upload → parse → validate → store flow

**Data flow:**
1. Test creates CSV with edge case (ambiguous columns, malformed content, orphan vendor)
2. Test POSTs to API route with mock auth context
3. API route calls real csv-parser.ts
4. csv-parser returns parsed data OR error
5. API route calls mocked Supabase client
6. Test asserts response + mock call payloads match expectations

## Phases at a Glance

| Phase     | What it delivers                                                  | Key risk                                                                  |
| --------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1. Infrastructure | Vitest config, test utilities, directory structure        | Tooling misconfiguration blocks all tests                                 |
| 2. Unit Tests | csv-parser.ts pattern matching + malformed CSV tests       | Unit tests don't catch integration-layer bugs (mitigated by Phase 3)      |
| 3. Integration | API route tests for Risk #1, #2, #3 + happy-path baselines | Mocking strategy fails (Supabase client API shape mismatch)               |

**Prerequisites:** S-01 (onboarding-csv-upload) implementation complete, package.json + tsconfig.json in place  
**Estimated effort:** ~2-3 hours across 3 phases (infrastructure 30 min, unit 45 min, integration 60-90 min)

## Open Risks & Assumptions

- **Assumption**: Mocking at Supabase client method level is sufficient — if API routes have complex transaction logic (not currently present), may need real test DB in later phases
- **Risk**: Vitest config for Astro SSR environment may require trial-and-error — path alias resolution and component testing are common pain points (mitigated: simple config, no component tests in Phase 1)
- **Assumption**: Tests documenting "wrong" behavior (greedy pattern matching) won't confuse future maintainers — risk mitigated by clear test names and comments explaining "this is current behavior, not ideal behavior"

## Success Criteria (Summary)

- `npm run test` passes with 10+ tests covering csv-parser.ts and upload API routes
- Integration test for Risk #1 fails when csv-parser.ts findColumn() logic is intentionally broken
- Test suite runs <5s total (fast feedback for TDD workflow)
- No external dependencies: tests run without Docker, network calls, or secrets
