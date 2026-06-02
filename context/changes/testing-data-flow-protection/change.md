# Change: testing-data-flow-protection

**Status**: partial  
**Created**: 2026-06-02  
**Updated**: 2026-06-02  
**Roadmap ref**: Test Plan Phase 1  
**Risk priority**: High (covers risks #1, #2, #3 from test-plan.md §2)  
**Notes**: Phase 1 complete (8e19750), Phase 2-3 skipped due to Vite SSR + Vitest incompatibility (see lessons.md #L001)

## Goal

Defend CSV upload → mapping → assignment → calculation flow against garbage data.
Protect margin calculations from wrong column mappings, orphaned costs, and malformed CSVs.

## Context

Phase 1 of 4-phase test rollout from `/10x-test-plan`. Covers top 3 data-integrity risks identified in risk map:
- **Risk #1**: CSV wrong column → false margins (High/High)
- **Risk #2**: Cost typo → orphaned cost (High/Medium)  
- **Risk #3**: Malformed CSV crash (High/Medium)

Implements integration + unit tests that verify:
- Wrong column mapping is rejected or preview warns user
- Orphaned costs surface as alerts
- Malformed CSVs return actionable errors without crash

## Artifacts

- `research.md` — code path analysis, protection behaviors, test layer recommendations
- `plan.md` — TBD (next phase after research)

## Dependencies

- Requires: S-01 (onboarding-csv-upload) implementation
- Blocks: Phase 2 (security & isolation tests)
- Unlocks: CI quality gates for unit + integration tests
