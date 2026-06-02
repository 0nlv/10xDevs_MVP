# Onboarding + CSV Upload — Plan Brief

> Full plan: `context/changes/onboarding-csv-upload/plan.md`
> Roadmap: `context/foundation/roadmap.md` (S-01)
> PRD: `context/foundation/prd.md` (US-03, US-04, FR-003, FR-004, FR-005, FR-006)

## What & Why

Build a 3-step onboarding wizard that allows new users to upload revenue and cost CSV files with immediate preview before processing. This is the first vertical slice (S-01) that delivers the "aha moment" promise: user sees their data transformed into insights. Without this flow, the product has no inputs — no CSV uploads means no margins calculation, no alerts, no dashboard value.

## Starting Point

Database schema is ready (F-01 complete): `uploads`, `clients`, `transactions`, `costs` tables with RLS policies exist. Auth middleware provides user context via `Astro.locals.user`. Form patterns established (native React forms with FormData submission, inline error display). UI foundation exists (Button component, glass-morphism cards, `cn()` utility). 

**Gaps**: Zero file upload functionality, no CSV parsing libraries, missing shadcn/ui components (Card, Input, Label, Table), no validation library despite docs mentioning zod.

## Desired End State

Authenticated user completes 3-step wizard:
1. `/onboarding/step-1`: Upload revenue CSV → see preview of first 5 rows → click Continue
2. `/onboarding/step-2`: Upload cost CSV → see preview → click Continue  
3. `/onboarding/step-3`: Confirmation screen → CTA to Dashboard or Mapping (S-02)

Database contains: 2 uploads rows (revenue + cost), auto-extracted client names in clients table, parsed revenue rows in transactions table, parsed cost rows in costs table. All RLS-protected (user sees only their own data).

## Key Decisions Made

| Decision                       | Choice                                    | Why (1 sentence)                                                                                      | Source |
| ------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ |
| Flow structure                 | Multi-step wizard (3 separate pages)      | Matches existing auth page pattern (separate routes, SSR-first), progressive disclosure reduces cognitive load | Plan   |
| State persistence              | Database (`uploads` table)                | RLS-protected, works across sessions, schema already designed for this                                | Plan   |
| Upload UX                      | File picker button (no drag-drop)         | Universally understood, zero implementation risk, drag-drop deferred to v2                            | Plan   |
| CSV parsing location           | Server-side with papaparse                | Handles large files, keeps raw CSV secure, matches SSR-first architecture                             | Plan   |
| Preview scope                  | First 5 rows + column headers             | Minimal but sufficient per NFR (<2s preview), builds user confidence without overwhelming             | Plan   |
| Validation rules               | File size (10MB), type (.csv), structure  | Prevents server overload + confusing errors, ~50k-100k rows typical for small business               | Plan   |
| Error handling                 | Inline with retry                         | Matches auth error pattern (ServerError component), user stays on page and can fix immediately        | Plan   |
| Storage strategy               | Metadata + parsed rows only               | Aligns with schema design (`uploads.row_count` + `transactions.raw_data` jsonb), no raw file bloat   | Plan   |
| Success transition             | Preview → Continue button → next step     | User confirms data looks right (builds trust), matches multi-step wizard flow                         | Plan   |

## Scope

**In scope:**
- 3-step wizard pages (`/onboarding/step-1`, `/step-2`, `/step-3`)
- Revenue CSV upload with preview
- Cost CSV upload with preview
- Auto-extraction of client names from revenue CSV
- Bulk insert parsed rows into database
- Prerequisite checks (can't skip steps)
- File validation (size, type, structure)
- Inline error handling with retry
- RLS-enforced data isolation
- New signup redirect to onboarding

**Out of scope:**
- Drag-and-drop upload (file picker only)
- Auto-column detection (S-02 handles mapping)
- Schema validation beyond structure
- Client-side parsing
- Raw file storage (Supabase Storage)
- Multi-file batch upload
- Edit/delete uploaded files UI
- Progress bars for large files
- CSV export/download
- OAuth file picker integrations

## Architecture / Approach

**Pattern**: Separate Astro pages for each step, state persisted in database (`uploads` table), React islands for file input interactivity.

**Data Flow**:
```
Step 1: User uploads revenue.csv 
  ↓ POST /api/upload-revenue
  ↓ Parse with papaparse
  ↓ INSERT uploads (file_type='revenue')
  ↓ UPSERT clients (auto-extract unique names)
  ↓ INSERT transactions (bulk)
  ↓ Redirect /onboarding/step-2?upload_id={uuid}

Step 2: User uploads costs.csv
  ↓ Validate step-1 complete (check upload_id)
  ↓ POST /api/upload-cost
  ↓ Parse with papaparse
  ↓ INSERT uploads (file_type='cost')
  ↓ INSERT costs (bulk)
  ↓ Redirect /onboarding/step-3?revenue_id={uuid1}&cost_id={uuid2}

Step 3: Confirmation
  ↓ Fetch both uploads from database
  ↓ Display summary (filenames, row counts)
  ↓ CTA to Dashboard or Mapping
```

**Validation Layers**:
- Client-side: file type, size — fast feedback before upload
- Server-side: same checks + structure validation (min 2 columns, 1 data row) — authoritative

## Phases at a Glance

| Phase     | What it delivers                                                                             | Key risk                                           |
| --------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1. Foundation | Install papaparse + zod, add shadcn/ui components, create shared upload utilities & components | New dependencies; must verify compatibility         |
| 2. Step 1 | Value prop page + revenue upload + preview + database insert                                  | CSV parsing edge cases (encoding, malformed files) |
| 3. Step 2 | Cost upload page with prerequisite validation                                                 | Prerequisite check logic; URL param tampering      |
| 4. Step 3 | Confirmation page + signup flow redirect                                                      | Database fetch performance with large datasets     |

**Prerequisites:** F-01 (data-schema-migrations) ✅ complete, authenticated user session  
**Estimated effort:** ~3-4 sessions across 4 phases (1 session = planning + implementation + testing)

## Open Risks & Assumptions

**Risks**:
- CSV encoding issues (UTF-8 vs Windows-1252) — papaparse handles most, but user may need to export correctly
- Large file uploads (9MB+) may timeout on slow connections — within NFR but edge case
- Cloudflare Workers 10MB request limit — hard ceiling, user must split larger files
- Parsing very wide CSVs (100+ columns) may be slow — acceptable for MVP, profile if users complain

**Assumptions**:
- Users have CSV files ready (export from accounting software, spreadsheets)
- Revenue CSV contains client/customer identifier column (name, ID, etc.)
- Cost CSV structure is flexible (vendor/category columns optional)
- Small business dataset size: typically <10k rows per file, <100 unique clients
- Users understand difference between "revenue" and "cost" CSVs (onboarding copy must clarify)

## Success Criteria (Summary)

**From user perspective:**
- User completes signup → lands on onboarding → uploads 2 CSVs → sees confirmation → proceeds to dashboard/mapping
- Preview loads <2s after file selected (NFR)
- Upload + parse + database insert completes <30-60s total (NFR)

**From system perspective:**
- Database contains user's uploads with RLS protection (other users can't see their data)
- Clients auto-extracted from revenue CSV and stored in clients table
- Transactions and costs parsed and stored with proper foreign keys (user_id, upload_id)
- Prerequisite checks prevent skipping steps or URL tampering
- Error scenarios handled gracefully with clear messages and retry options
