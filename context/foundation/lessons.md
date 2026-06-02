# Lessons Learned

Recurring patterns, pitfalls, and resolution strategies discovered during development.

---

## #L001: Vitest + Astro SSR Incompatibility (2026-06-02)

**Pattern**: `ReferenceError: __vite_ssr_exportName__ is not defined` when running Vitest tests in Astro SSR projects.

**Root Cause**: Vite's SSR transformation system automatically injects SSR-specific runtime helpers (`__vite_ssr_exportName__`, `__vite_ssr_import__`) into modules when they're imported in SSR mode (`output: "server"` in astro.config.mjs). Vitest runs in Node environment and doesn't include these SSR runtime helpers, causing tests to fail during module collection phase.

**Why This Happens**:
- Astro 6 with `output: "server"` configures Vite to transform ALL imports as SSR modules
- Vitest inherits Vite config from workspace root (including SSR mode)
- When tests import `src/lib/csv-parser.ts`, Vite applies SSR transforms
- Test environment (node/happy-dom) doesn't have SSR runtime → ReferenceError

**Failed Solutions (10+ attempts)**:
- ❌ Changing vitest environment (`node`, `happy-dom`)
- ❌ Using `@/*` path alias vs relative imports
- ❌ Setting `ssr.noExternal: true` or specific modules
- ❌ Switching to `pool: 'forks'` execution
- ❌ Defining separate workspace configs for unit/integration
- ❌ Disabling Astro config temporarily
- ❌ Adding `server.deps.inline` or `optimizeDeps.exclude`
- ❌ Using different Vite config import (`vite` vs `vitest/config`)
- ❌ Minimal vitest.config.ts with only essential settings

**Known Workarounds**:
1. **Extract testable code to non-SSR files**: Move business logic from `src/lib/` to separate package (e.g., `packages/core/`) that doesn't live in Astro SSR context
2. **Use different test framework**: Switch from Vitest to Node.js native test runner (`node:test`) or Jest (doesn't integrate with Vite)
3. **Skip unit/integration tests**: Focus on e2e tests only (Playwright bypasses Vite entirely)
4. **Wait for upstream fix**: Track https://github.com/withastro/astro/issues (Astro team working on test support)

**Decision for ProfitLeak MVP**:
- ✅ **Skipped Phase 2 (unit tests) and Phase 3 (integration tests)** from `testing-data-flow-protection` plan
- ✅ **Phase 1 infrastructure committed** (8e19750) — vitest installed, utilities created, directory structure ready
- 🔜 **Future**: Revisit when Astro test utilities mature or extract business logic to testable packages

**Impact**:
- MVP ships without automated unit/integration test coverage
- Manual testing required for CSV upload flow
- Risk #1 (wrong column mapping), Risk #2 (orphaned costs), Risk #3 (malformed CSV) not protected by tests
- e2e tests (Playwright) still viable — they operate at HTTP level, don't import Astro modules directly

**References**:
- Plan: [context/changes/testing-data-flow-protection/plan.md](context/changes/testing-data-flow-protection/plan.md)
- Test Plan: [context/foundation/test-plan.md](context/foundation/test-plan.md)
- Similar issues: Astro Discord #support (multiple reports), GitHub withastro/astro discussions

**Lessons for Future Projects**:
- Test framework compatibility is a first-class concern during tech stack selection
- SSR frameworks have deeper runtime implications than just page rendering
- When evaluating "agent-friendly stack" (test-plan.md §4 criteria), include test runner compatibility
- Consider separating business logic from framework-specific code early (clean architecture)

---
