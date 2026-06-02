# Data Flow Protection — Test Implementation Plan

## Overview

Bootstrap test infrastructure (Vitest + MSW) and implement integration + unit tests to protect CSV upload → mapping → calculation flow against the top 3 data-integrity risks identified in [context/foundation/test-plan.md](context/foundation/test-plan.md) Phase 1:
- **Risk #1** (High/High): CSV wrong column → false margins
- **Risk #2** (High/Medium): Cost typo → orphaned cost
- **Risk #3** (High/Medium): Malformed CSV crash

This phase establishes the test base for the entire project — all future changes will build on this foundation.

## Current State Analysis

From [research.md](context/changes/testing-data-flow-protection/research.md):

### Key Discoveries:

- **No test infrastructure exists**: Zero test dependencies in package.json, no vitest config, no test files
- **Test-plan.md recommends Vitest**: Astro/Vite ecosystem standard for unit + integration tests (§4 Stack table)
- **Integration tests are cheapest per signal**: Research proves end-to-end flow tests (upload → parse → validate → store) catch more bugs than isolated unit tests for these risks
- **Mocking strategy clear**: Mock at Supabase client method level (`.from().insert()` etc.) — clean boundary, no external dependencies
- **Code paths mapped**: Risk #1 flows through `csv-parser.ts` findColumn() → `upload-revenue.ts` lines 98-104 → margin calculation; Risks #2 and #3 follow similar patterns through upload APIs

### Current Implementation Strengths (to preserve in tests):

- **Source data preservation**: `raw_data` JSONB stores entire CSV row — tests must verify this enables post-upload correction
- **Explicit column patterns**: Pattern arrays in findColumn() — tests will document current behavior (first match wins)
- **Separation of concerns**: Parser isolated from upload orchestration — allows testing each layer independently

### Current Implementation Gaps (to document in tests, NOT fix):

- **No user confirmation of mapping**: Auto-detection happens silently — tests will assert current behavior (no confirmation prompt)
- **Pattern matching is greedy**: First match wins — tests will document this as expected behavior for now
- **No validation of non-numeric amounts**: `parseFloat()` returns `NaN` → stored as `0` — tests will verify this happens (improvement deferred to S-02)

**Constraint**: Tests document current behavior, including known gaps. Feature improvements (mapping UI, pattern ranking, validation warnings) belong in roadmap S-02, not this test phase.

## Desired End State

### For Developers:
- Running `npm run test` executes all unit + integration tests (<5s total)
- Integration tests prove Risk #1, #2, #3 protections exist (even if imperfect)
- Unit tests document csv-parser.ts edge-case behavior
- Test utilities make it easy to add new CSV upload tests in future slices

### For CI (future Phase 4):
- Test suite is CI-ready (no external dependencies, deterministic, fast)
- Failures clearly indicate which risk scenario broke

### Verification:
1. `npm run test` passes with 10+ tests (3+ integration, 5+ unit)
2. Integration test for Risk #1 fails when csv-parser.ts findColumn() logic is broken
3. Test coverage report shows upload API routes + csv-parser covered
4. No Docker, no network calls, no secrets needed to run tests

## What We're NOT Doing

**Explicitly out of scope for Phase 1:**

- **e2e tests** — Playwright setup belongs in Phase 2 (security & isolation); this phase is unit + integration only
- **CI/CD wiring** — GitHub Actions workflow configuration belongs in Phase 4 (quality gates); tests must be CI-ready but not wired yet
- **Feature improvements** — No changes to findColumn() ranking, no mapping metadata in API responses, no validation warnings — all deferred to roadmap S-02 per scoping decision
- **Real database testing** — No Supabase local instance, no test project — in-memory mocks only for Phase 1
- **Risk #4–#7** — Security (RLS bypass), performance (timeout), reliability (double upload), rate-limiting belong in Phases 2–3
- **Comprehensive edge-case coverage** — One core scenario per risk (Risk #2, #3) is sufficient; exhaustive testing deferred
- **Test data factories** — Inline CSV strings in test files; no fixture files, no programmatic builders

## Implementation Approach

### Sequencing: Infrastructure → Unit → Integration

1. **Phase 1: Infrastructure** — Install dependencies, configure Vitest for Astro SSR, create test utilities (mock Supabase client, create test user context)
2. **Phase 2: Unit Tests** — Test csv-parser.ts in isolation (pattern matching edge cases, malformed CSV handling) — validates tooling works with simple tests
3. **Phase 3: Integration Tests** — Test API routes (`/api/upload-revenue`, `/api/upload-cost`) with mocked Supabase responses — validates Risk #1, #2, #3 protection

### Testing Philosophy:

From test-plan.md §1 Strategy:
- **Cost × signal**: Integration tests for upload flow (high signal, low cost); unit tests for parser edge cases (medium signal, very low cost)
- **Risks are scenarios, not code locations**: Tests verify user-facing failure scenarios (wrong margin, orphaned cost, crash), not specific file:line coverage
- **Tests document behavior**: Current implementation has known gaps — tests assert "this is how it works today" without judgment

### Mocking Boundaries:

- **Supabase client**: Mock at method level (`.from('uploads').insert(data)` returns controlled responses) — allows testing API route logic (validation, parsing, orchestration) without database
- **Authentication**: Create test utility that returns mock `Astro.locals.user` — simulates middleware auth without running middleware
- **File upload**: Inline CSV strings as Blob/File objects — no real file I/O

## Phase 1: Test Infrastructure Setup

### Overview

Install Vitest + dependencies, configure for Astro SSR environment, create test utilities for mocking Supabase client and auth context. Validates tooling works before writing actual tests.

### Changes Required:

#### 1. Install test dependencies

**File**: `package.json`

**Intent**: Add Vitest (test runner), @vitest/ui (debug UI), happy-dom (DOM environment for Astro components), msw (HTTP mocking if needed for future), and TypeScript types.

**Contract**: `devDependencies` gains `vitest`, `@vitest/ui`, `happy-dom`, `@types/node` (for path resolution). Version constraints: Vitest ^2.x (stable, Vite 7 compatible per package.json override).

#### 2. Create Vitest configuration

**File**: `vitest.config.ts` (new file, workspace root)

**Intent**: Configure Vitest to understand Astro path aliases (`@/*` → `./src/*`), use happy-dom for component tests, exclude build artifacts, set test timeout for integration tests.

**Contract**: Exports Vite config with:
- `resolve.alias` matching tsconfig.json paths
- `test.environment: 'happy-dom'`
- `test.globals: true` (allows `describe`, `it`, `expect` without imports)
- `test.include: ['**/*.test.ts']`
- `test.exclude: ['**/node_modules/**', '**/dist/**', '**/.astro/**']`
- `test.timeout: 10000` (10s for integration tests with mocked async operations)

#### 3. Add test scripts

**File**: `package.json`

**Intent**: Add `npm run test` (run all tests), `npm run test:ui` (open Vitest UI), `npm run test:watch` (watch mode for TDD).

**Contract**: `scripts` section gains:
- `"test": "vitest run"`
- `"test:ui": "vitest --ui"`
- `"test:watch": "vitest"`

#### 4. Create Supabase client mock utility

**File**: `tests/utils/supabase-mock.ts` (new file)

**Intent**: Factory function that returns a mock Supabase client with chainable query methods (`.from()`, `.select()`, `.insert()`, `.eq()`, `.single()`) for use in integration tests. Allows tests to control what "database" returns without real Supabase connection.

**Contract**: Exports `createMockSupabaseClient(options?: { mockResponses?: Record<string, any> })` returning object matching `SupabaseClient` interface shape. Supports chaining: `client.from('uploads').insert(data).select().single()` returns `{ data: mockData, error: null }` or controlled error response.

```typescript
// Example usage in tests (contract):
const mockClient = createMockSupabaseClient({
  mockResponses: {
    'uploads.insert': { data: { id: 'mock-upload-id' }, error: null },
    'invoice_revenue.insert': { data: null, error: null }
  }
});
```

#### 5. Create auth context mock utility

**File**: `tests/utils/auth-mock.ts` (new file)

**Intent**: Helper to create mock authenticated user object matching `Astro.locals.user` shape from middleware. Allows integration tests to simulate authenticated requests without running full auth flow.

**Contract**: Exports `createMockUser(overrides?: Partial<User>)` returning object with `id`, `email`, properties matching Supabase Auth User type. Default test user: `{ id: 'test-user-id', email: 'test@example.com' }`.

#### 6. Create test directory structure

**Files**: Create empty directories for test organization

**Intent**: Establish standard layout: `tests/unit/` (isolated function tests), `tests/integration/` (API route tests), `tests/utils/` (shared utilities).

**Contract**: Directory structure:
```
tests/
  unit/           # csv-parser.ts tests
  integration/    # API route tests (/api/upload-revenue, /api/upload-cost)
  utils/          # supabase-mock.ts, auth-mock.ts
```

### Success Criteria:

#### Automated Verification:

- Dependencies installed: `npm list vitest @vitest/ui happy-dom` shows all present
- Config valid: `npx vitest --version` runs without error
- Directory structure: `tests/unit/`, `tests/integration/`, `tests/utils/` exist
- Utilities compile: `npx tsc --noEmit tests/utils/*.ts` passes

#### Manual Verification:

- `npm run test` executes (exits with "no test files found" — expected at this phase)
- `npm run test:ui` opens browser UI showing empty test suite
- Mock utilities export expected functions (inspect with IDE autocomplete or `console.log`)

---

## Phase 2: Unit Tests for CSV Parser

### Overview

Write unit tests for `src/lib/csv-parser.ts` covering pattern matching edge cases (Risk #1 component) and malformed CSV handling (Risk #3 component). These tests validate csv-parser behavior in isolation before testing it integrated with API routes.

### Changes Required:

#### 1. Unit tests for findColumn pattern matching

**File**: `tests/unit/csv-parser-pattern-matching.test.ts` (new file)

**Intent**: Test findColumn() edge cases — ambiguous columns (both "Price" and "Total" match pattern), substring vs exact matches, case-insensitivity, no match returns -1. Documents current "first match wins" behavior without judging whether it's correct.

**Contract**: Test suite exports tests that import `findColumn` from `@/lib/csv-parser` and assert:
- **Ambiguous columns**: `findColumn(['Client', 'Unit Price', 'Total'], ['price', 'total'])` returns index 1 ("Unit Price") — first pattern match wins
- **Exact vs substring**: `findColumn(['Amount', 'Total Amount'], ['amount'])` returns 0 ("Amount") — exact match preferred (if implemented) or first substring match
- **Case-insensitive**: `findColumn(['AMOUNT', 'total'], ['amount'])` finds both
- **No match**: `findColumn(['Foo', 'Bar'], ['amount'])` returns -1

No code snippets needed — tests call the function and assert return values.

#### 2. Unit tests for parseCSV structure validation

**File**: `tests/unit/csv-parser-malformed.test.ts` (new file)

**Intent**: Test parseCSV() with malformed input — missing headers, empty file, single column, encoding issues (simulated via string content). Validates Risk #3 component: parser returns actionable errors instead of crashing.

**Contract**: Test suite asserts:
- **Empty CSV**: `parseCSV('')` throws or returns `{ error: 'File is empty' }`
- **No headers**: `parseCSV('row1data')` throws or returns error (papaparse behavior)
- **Single column**: `parseCSV('Client\nFirma ABC')` succeeds but triggers downstream validation (tested in integration)
- **Non-CSV content**: `parseCSV('<html>...</html>')` throws or returns parse error

Tests use inline CSV strings as input. Current papaparse behavior is source of truth — tests document what happens, not what "should" happen.

#### 3. Unit tests for extractClientNames

**File**: `tests/unit/csv-parser-client-extraction.test.ts` (new file)

**Intent**: Test extractClientNames() with edge cases — missing "client" column, empty values, duplicate names, column with mixed client/non-client data. Validates robust extraction for Risk #2 (orphaned cost) prevention.

**Contract**: Test suite asserts:
- **Missing client column**: `extractClientNames({ headers: ['Amount'], rows: [...] })` returns empty array
- **Empty values filtered**: `extractClientNames({ headers: ['Client'], rows: [[''], ['Firma ABC']] })` returns `['Firma ABC']`
- **Deduplication**: `extractClientNames({ rows: [['Firma ABC'], ['Firma ABC']] })` returns `['Firma ABC']` (single entry)
- **Case-sensitivity**: Current behavior is case-sensitive; test documents this

### Success Criteria:

#### Automated Verification:

- All unit tests pass: `npm run test tests/unit/`
- Coverage: `npx vitest --coverage` shows `csv-parser.ts` functions covered
- Type checking: `npx tsc --noEmit tests/unit/*.ts` passes
- Fast execution: Unit tests complete <500ms total

#### Manual Verification:

- Tests accurately document current behavior (review assertions match actual csv-parser.ts logic)
- Test names clearly describe scenario (e.g., "findColumn returns first match when multiple patterns match")
- No false positives: intentionally break csv-parser.ts logic → tests fail as expected

---

## Phase 3: Integration Tests for Upload Flow

### Overview

Write integration tests for `/api/upload-revenue` and `/api/upload-cost` routes covering Risk #1 (wrong column mapping), Risk #2 (orphaned cost detection), Risk #3 (malformed CSV end-to-end). Tests use mocked Supabase client to validate API route logic (parsing, validation, orchestration, error handling) without database dependency.

### Changes Required:

#### 1. Integration test for Risk #1 — Wrong column mapping

**File**: `tests/integration/upload-wrong-column.test.ts` (new file)

**Intent**: Validate that when a CSV has ambiguous columns (e.g., "Unit Price" and "Total Amount"), the system detects a column (even if wrong one due to greedy matching), stores the detected amount, and preserves original data in `raw_data` JSONB for future correction. Proves Risk #1 protection floor exists: data not lost, correction possible.

**Contract**: Test creates CSV with columns `["Client", "Description", "Unit Price", "Quantity", "Total Amount", "Date"]`, POSTs to `/api/upload-revenue`, mocks Supabase client to return success, then asserts:
- Response includes `upload_id` and `preview` (first 5 rows)
- Mock Supabase `.from('invoice_revenue').insert()` was called with `amount: 500` (wrong — "Unit Price") not `5000` (correct — "Total Amount")
- Mock insert payload includes `raw_data: { "Client": "Firma ABC", "Unit Price": "500", "Total Amount": "5000", ... }` — original CSV row preserved

```typescript
// Key assertion (contract):
expect(mockInsertCall.args[0]).toMatchObject({
  amount: 500, // Wrong column detected, but test documents this behavior
  raw_data: expect.objectContaining({
    'Unit Price': '500',
    'Total Amount': '5000'
  })
});
```

#### 2. Integration test for Risk #2 — Orphaned cost detection

**File**: `tests/integration/upload-orphaned-cost.test.ts` (new file)

**Intent**: Validate that when a cost CSV has a vendor/client name typo (e.g., "Firma ABD" instead of "Firma ABC" from revenue upload), the system stores the cost but does NOT silently assign it to wrong client. Current implementation: costs stored with vendor name as-is; orphan detection happens at assignment time (S-03 roadmap). Test proves data preservation, not prevention (prevention is S-03 scope).

**Contract**: Test uploads cost CSV with vendor `"Firma ABD"` (typo), mocks Supabase to return no matching client from revenue data, asserts:
- Cost inserted successfully with `vendor: "Firma ABD"`
- `raw_data` preserves original CSV row
- No crash, no silent assignment to "Firma ABC"

Test documents current behavior: orphaned costs are stored but not flagged (S-03 will add assignment rules + orphan alerts).

#### 3. Integration test for Risk #3 — Malformed CSV end-to-end

**File**: `tests/integration/upload-malformed-csv.test.ts` (new file)

**Intent**: Validate that malformed CSVs (missing headers, single column, non-CSV content, encoding issues) return actionable HTTP error instead of crashing API route or pretending to succeed. Tests end-to-end validation chain: upload-validation.ts checks → papaparse error surface → API error response.

**Contract**: Test POSTs malformed CSV (e.g., `"<html>...</html>"` as CSV content), expects:
- HTTP 400 Bad Request (not 500 Internal Server Error)
- Error message is actionable: `"Invalid CSV format: missing required columns"` or `"CSV must have at least 2 columns"`
- No database insert attempted (mock Supabase client never called)
- No crash (server continues handling subsequent requests)

Test cases:
- Empty file
- Missing headers (papaparse failure)
- Single column (fails validation: min 2 columns required)
- Wrong file type (checked by upload-validation.ts)

#### 4. Integration test utilities for API route testing

**File**: `tests/utils/api-test-helpers.ts` (new file)

**Intent**: Shared utilities for integration tests — create mock Request with File upload, mock Astro context with authenticated user, helper to extract FormData from Request. Reduces boilerplate in integration tests.

**Contract**: Exports:
- `createMockAPIContext(user?: User)` — returns mock `Astro` context with `locals.user`
- `createMockFileUpload(csvContent: string, filename?: string)` — returns `File` object with CSV content as Blob
- `createMockRequest(formData: FormData)` — returns `Request` with multipart/form-data body

#### 5. Integration test for happy-path revenue upload

**File**: `tests/integration/upload-revenue-happy-path.test.ts` (new file)

**Intent**: Baseline integration test — upload correctly formatted CSV with standard columns, verify successful parse → store → preview response. Establishes baseline before testing edge cases. Also validates test infrastructure works end-to-end.

**Contract**: Test uploads CSV with columns `["Client", "Amount", "Date"]`, mocks Supabase to return success, asserts:
- HTTP 200 response
- Response body: `{ upload_id: string, preview: [...] }`
- Preview contains first 5 rows with correct headers
- Mock Supabase called: `.from('uploads').insert()` and `.from('invoice_revenue').insert()`
- Client names extracted and upserted to `clients` table (mock tracks calls)

#### 6. Integration test for cost upload mirroring revenue

**File**: `tests/integration/upload-cost-happy-path.test.ts` (new file)

**Intent**: Mirror of revenue happy-path test but for `/api/upload-cost` route. Validates cost upload flow works identically. Keeps tests symmetric (revenue + cost are parallel features per roadmap S-01).

**Contract**: Similar to revenue test but POSTs to `/api/upload-cost`, expects:
- CSV columns: `["Vendor", "Category", "Amount", "Date"]`
- Mock Supabase called: `.from('uploads').insert()` and `.from('costs').insert()`
- Preview shows first 5 cost rows

### Success Criteria:

#### Automated Verification:

- All integration tests pass: `npm run test tests/integration/`
- Coverage: API routes `src/pages/api/upload-revenue.ts`, `src/pages/api/upload-cost.ts` covered
- Type checking: `npx tsc --noEmit tests/integration/*.ts` passes
- Fast execution: Integration tests complete <5s total (all mocked, no real I/O)
- Tests run in CI-like environment: `CI=true npm run test` succeeds (no interactive prompts, deterministic)

#### Manual Verification:

- Risk #1 test: Intentionally break findColumn() to always return -1 → test fails with clear error message
- Risk #2 test: Remove vendor field from cost insert payload → test fails (mock assertion catches missing field)
- Risk #3 test: Remove validation check from upload-revenue.ts → malformed CSV test fails (HTTP 200 instead of 400)
- Happy-path tests: Change Supabase mock to return error → tests fail appropriately (no false positives)
- Test output is readable: Failure messages clearly indicate which scenario broke and why

**Implementation Note**: After completing all automated verification and confirming manual testing works as expected, this phase is complete. Update [context/foundation/test-plan.md](context/foundation/test-plan.md) §3 Phase 1 status to `planned` → `implementing` during work, then `complete` after all Progress items checked.

---

## Testing Strategy

### Test Pyramid for This Project:

- **Unit tests (30%)**: csv-parser.ts functions, upload-validation.ts utilities — fast, isolated, low-cost
- **Integration tests (60%)**: API routes with mocked dependencies — highest ROI for data flow risks
- **e2e tests (10%, future Phase 2)**: Critical user paths (signup → upload → dashboard) — expensive, reserved for cross-system flows

### Coverage Goals:

From test-plan.md §1 Strategy: **Cost × signal drives coverage, not line percentage.**

- **Must cover**: All three Risk scenarios (#1, #2, #3) with at least one integration test each
- **Should cover**: csv-parser.ts edge cases (unit tests), upload validation (unit tests)
- **Nice to have**: Happy-path integration tests for documentation (not strictly required by risk map)

### Test Maintenance:

- **When csv-parser.ts changes**: Update unit tests to match new behavior (tests document implementation, not idealized spec)
- **When S-02 ships** (column mapping UI): Update Risk #1 integration test to expect mapping confirmation — tests evolve with features
- **When Supabase client API changes**: Update `tests/utils/supabase-mock.ts` to match new method signatures

## Performance Considerations

- **Target**: Full test suite <10s on developer laptop (enables TDD workflow)
- **Current**: No tests exist; Phase 1 baseline will establish actual timing
- **Risk**: Integration tests with complex mocking could slow to 1-2s per test — acceptable for 6-8 integration tests (~10s total)
- **Mitigation**: If tests exceed 15s total, investigate:
  - Parallel test execution (Vitest default)
  - Shared test fixtures (reduce mock setup duplication)
  - Split slow tests into separate suite (run less frequently)

## Migration Notes

**None** — this is greenfield test implementation, no existing tests to migrate.

**Post-Phase 1 handoff to S-02**:
- S-02 (column mapping UI) will need to update Risk #1 integration test to expect new API contract (mapping metadata in response)
- S-03 (cost assignment) will add new tests for orphan detection using the infrastructure established here
- Phase 2 (security tests) will extend `tests/utils/auth-mock.ts` to simulate unauthorized requests

## References

- Research: [context/changes/testing-data-flow-protection/research.md](context/changes/testing-data-flow-protection/research.md)
- Test plan: [context/foundation/test-plan.md](context/foundation/test-plan.md) §3 Phase 1
- Risk map: [context/foundation/test-plan.md](context/foundation/test-plan.md) §2 (risks #1, #2, #3)
- Code paths analyzed:
  - [src/lib/csv-parser.ts](src/lib/csv-parser.ts) — findColumn, parseCSV, extractClientNames
  - [src/pages/api/upload-revenue.ts](src/pages/api/upload-revenue.ts) — POST handler, column detection lines 98-104
  - [src/pages/api/upload-cost.ts](src/pages/api/upload-cost.ts) — mirror of revenue upload
  - [src/lib/upload-validation.ts](src/lib/upload-validation.ts) — file size/type/structure validation
- Similar patterns: None (first test implementation in project)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Test Infrastructure Setup

#### Automated

- [x] 1.1 Dependencies installed: `npm list vitest @vitest/ui happy-dom` shows all present — 8e19750
- [x] 1.2 Config valid: `npx vitest --version` runs without error — 8e19750
- [x] 1.3 Directory structure: `tests/unit/`, `tests/integration/`, `tests/utils/` exist — 8e19750
- [x] 1.4 Utilities compile: `npx tsc --noEmit tests/utils/*.ts` passes — 8e19750

#### Manual

- [x] 1.5 `npm run test` executes (exits with "no test files found") — 8e19750
- [x] 1.6 `npm run test:ui` opens browser UI showing empty test suite — 8e19750
- [x] 1.7 Mock utilities export expected functions — 8e19750

### Phase 2: Unit Tests for CSV Parser

**⚠️ SKIPPED** — Blocked by Vite SSR + Vitest compatibility issue. See context/foundation/lessons.md #L001.

#### Automated

- [~] 2.1 All unit tests pass: `npm run test tests/unit/` — SKIPPED
- [~] 2.2 Coverage: `npx vitest --coverage` shows `csv-parser.ts` functions covered — SKIPPED
- [~] 2.3 Type checking: `npx tsc --noEmit tests/unit/*.ts` passes — SKIPPED
- [~] 2.4 Fast execution: Unit tests complete <500ms total — SKIPPED

#### Manual

- [~] 2.5 Tests accurately document current behavior — SKIPPED
- [~] 2.6 Test names clearly describe scenario — SKIPPED
- [~] 2.7 Intentionally break csv-parser.ts logic → tests fail as expected — SKIPPED

### Phase 3: Integration Tests for Upload Flow

**⚠️ SKIPPED** — Blocked by Vite SSR + Vitest compatibility issue. See context/foundation/lessons.md #L001.

#### Automated

- [~] 3.1 All integration tests pass: `npm run test tests/integration/` — SKIPPED
- [~] 3.2 Coverage: API routes `src/pages/api/upload-revenue.ts`, `src/pages/api/upload-cost.ts` covered — SKIPPED
- [~] 3.3 Type checking: `npx tsc --noEmit tests/integration/*.ts` passes — SKIPPED
- [~] 3.4 Fast execution: Integration tests complete <5s total — SKIPPED
- [~] 3.5 CI-ready: `CI=true npm run test` succeeds — SKIPPED

#### Manual

- [~] 3.6 Risk #1 test: Break findColumn() → test fails with clear error — SKIPPED
- [~] 3.7 Risk #2 test: Remove vendor field → test fails (mock assertion catches) — SKIPPED
- [~] 3.8 Risk #3 test: Remove validation → malformed CSV test fails (HTTP 200 instead of 400) — SKIPPED
- [~] 3.9 Happy-path tests: Mock error response → tests fail appropriately — SKIPPED
- [~] 3.10 Test output is readable: Failure messages clearly indicate which scenario broke — SKIPPED
