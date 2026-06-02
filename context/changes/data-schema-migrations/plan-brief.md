# Plan Brief: Data schema + migrations

**Goal:** Create atomic PostgreSQL migration with 8 tables + RLS for ProfitLeak's core data flow.

**Strategy:** Single migration file, 3 implementation phases (core → config → calculated), table-level RLS on all entities.

## Phases

**Phase 1:** Core data tables + RLS
- Create `uploads`, `clients`, `transactions`, `costs` tables
- Add user_id FK to auth.users on all tables
- Enable RLS + create 16 policies (4 per table using auth.uid())
- Verify 4 tables exist with RLS enabled

**Phase 2:** Mapping & assignment rules + RLS
- Create `column_mappings` (CSV → system field), `cost_assignments` (cost → client allocation)
- Same RLS pattern (user_id FK + 4 policies per table)
- Verify 6 tables total, 24 policies total

**Phase 3:** Calculated results + alerts + RLS
- Create `margins` (materialized revenue/cost/margin% per client), `alerts` (persistent threshold detections)
- Same RLS pattern
- Verify all 8 tables, 32 policies total
- Manual RLS isolation test (user A can't see user B's data)

## File Contracts

- CREATE `supabase/migrations/20260601_create_profitleak_schema.sql` (Phase 1)
- EDIT same file (append Phase 2 tables)
- EDIT same file (append Phase 3 tables)

## Key Decisions

- **No raw CSV storage** — only metadata + parsed rows
- **Auto-extract clients** during parse (unique constraint on user_id + name)
- **Materialized margins** — calculated values stored, not computed on-demand
- **Basic constraints only** — NOT NULL, FK, unique; no CHECK on business rules
- **32 RLS policies** — every table gets SELECT/INSERT/UPDATE/DELETE using auth.uid()

## Success Criteria

- Migration applies cleanly via `npx supabase migration up`
- All 8 tables exist with `rowsecurity = true`
- 32 policies created (verify via `SELECT COUNT(*) FROM pg_policies`)
- RLS test: user A inserts row, user B SELECT returns 0 rows

## Next Step

Run `/10x-implement data-schema-migrations phase 1` to create migration file with core tables.
