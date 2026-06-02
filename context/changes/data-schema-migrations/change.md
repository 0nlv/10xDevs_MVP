---
change_id: data-schema-migrations
title: Data schema + migrations
type: foundation
status: implemented
created: 2026-06-01
updated: 2026-06-02
roadmap_id: F-01
---

# Change: Data schema + migrations

Foundation task: Create PostgreSQL schema for ProfitLeak's core data flow (CSV uploads → parsed data → mapping/assignment rules → calculated margins → alerts) with mandatory Row Level Security for tenant isolation.

## Roadmap Context

From [roadmap.md](../../foundation/roadmap.md#f-01-data-schema--migrations):

> Minimal PostgreSQL schema for CSV file metadata, parsed transactions (revenue), costs, clients, column mapping rules, cost assignment rules, calculated margins, and generated alerts. Migrations created and applied via Supabase CLI.

**Unlocks:** S-01 through S-06 — all vertical slices depend on this schema existing before any application code can be written.

**Baseline gap:** `supabase/migrations/` directory does not exist; no tables, no RLS policies.

## Planning Decisions

Data model decisions from deep questioning (2026-06-01):

- **CSV storage:** Metadata + parsed rows only (no raw file bytes stored)
- **Client entity:** Auto-extract unique client names during CSV parse
- **Margins table:** Materialized (calculated values stored, not computed on-demand)
- **RLS scope:** Table-level — every table gets user_id FK + 4 policies (SELECT/INSERT/UPDATE/DELETE)
- **Migration files:** Single migration file (atomic schema creation)
- **Constraints:** Basic only (NOT NULL, FK, unique) — no CHECK constraints on business rules
- **Alerts storage:** Persistent table (audit trail, supports trend detection)

## Status

Planning phase — detailed implementation plan written, ready for `/10x-implement data-schema-migrations phase 1`.
