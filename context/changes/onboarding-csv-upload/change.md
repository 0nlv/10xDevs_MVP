---
change_id: onboarding-csv-upload
title: Onboarding + CSV upload with preview
type: feature
status: implemented
created: 2026-06-02
updated: 2026-06-02
roadmap_id: S-01
---

# Onboarding + CSV Upload with Preview

Implements the first vertical slice (S-01) of the ProfitLeak MVP: 3-step onboarding wizard allowing users to upload revenue and cost CSV files with immediate preview before processing.

## Links

- Roadmap: `context/foundation/roadmap.md` (S-01)
- PRD: `context/foundation/prd.md` (US-03, US-04, FR-003, FR-004, FR-005, FR-006)
- Prerequisites: F-01 (data-schema-migrations) — ✅ complete
- Unlocks: S-02 (column-mapping)

## Planning Decisions

Key decisions made during planning:

- **Multi-step wizard**: 3 separate Astro pages (`/onboarding/step-1`, `/step-2`, `/step-3`) with database-backed state in `uploads` table
- **Upload UX**: File picker button only (no drag-drop for MVP)
- **CSV parsing**: Server-side with papaparse (handles large files, keeps raw CSV secure)
- **Preview scope**: First 5 rows + column headers (minimal but sufficient per NFR <2s preview)
- **Validation**: File size (10MB), file type (.csv), structure check (min 2 columns, 1 data row)
- **Error handling**: Inline errors with retry (matches auth pattern)
- **Storage**: Metadata in `uploads` table + parsed rows in `transactions`/`costs` tables (no raw file bytes)
- **File limit**: 10MB max (~50k-100k rows)
- **Success flow**: Show preview → Continue button → next step

## Status

- [x] Planning complete
- [ ] Implementation (phase 1)
- [ ] Implementation (phase 2)
- [ ] Implementation (phase 3)
- [ ] Review
- [ ] Deployed
