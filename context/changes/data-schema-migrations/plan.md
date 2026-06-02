---
change_id: data-schema-migrations
title: Data schema + migrations
created: 2026-06-01
---

# Implementation Plan: Data schema + migrations

## Context

**Problem:** No database schema exists (`supabase/migrations/` absent). Application cannot store CSV uploads, parsed data, or calculated margins until PostgreSQL tables are created with Row Level Security.

**Goal:** Create single atomic migration file defining 8 tables (uploads, clients, transactions, costs, column_mappings, cost_assignments, margins, alerts) with mandatory RLS policies for tenant isolation per AGENTS.md requirement.

**Approach:** Three-phase implementation:
1. Core data tables (uploads, clients, transactions, costs)
2. Configuration tables (column_mappings, cost_assignments)
3. Calculated results tables (margins, alerts)

Each phase creates tables + indexes + user_id foreign key + 4 RLS policies (SELECT/INSERT/UPDATE/DELETE using `auth.uid()`).

**PRD alignment:**
- NFR: Deterministic results (materialized margins table ensures same input → same output)
- NFR: Tenant isolation (RLS on every table per AGENTS.md "granular per-operation" rule)
- NFR: < 60s processing (indexed queries on normalized schema)
- FR-021: Persist data across sessions (schema supports multi-session workflows)
- FR-022: Delete/update data (cascading deletes via FK constraints)

**Data flow:** uploads → transactions/costs → column_mappings → cost_assignments → margins → alerts

## Success Criteria

- [ ] Migration file `supabase/migrations/20260601_create_profitleak_schema.sql` created
- [ ] All 8 tables defined with correct column types and NOT NULL constraints
- [ ] Foreign keys enforce referential integrity (clients, uploads references)
- [ ] Every table has `user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE`
- [ ] RLS enabled on all 8 tables (`ALTER TABLE x ENABLE ROW LEVEL SECURITY`)
- [ ] 32 RLS policies created (8 tables × 4 operations) using `auth.uid() = user_id`
- [ ] Indexes on foreign keys and commonly queried columns (user_id, client_id, upload_id)
- [ ] Migration applies cleanly via `npx supabase migration up` (local test)
- [ ] `\dt` shows all 8 tables with RLS enabled
- [ ] Manual RLS test: INSERT rows as user A, SELECT as user B returns 0 rows

## Phase 1: Core data tables + RLS

**Outcome:** uploads, clients, transactions, costs tables exist with RLS isolation.

**File contracts:**
- CREATE `supabase/migrations/20260601_create_profitleak_schema.sql`

**Implementation steps:**

- Create `supabase/migrations/` directory
- Create migration file with timestamp naming `YYYYMMDDHHmmss_short_description.sql` per AGENTS.md convention
- Define `uploads` table:
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `file_type text NOT NULL CHECK (file_type IN ('revenue', 'cost'))`
  - `filename text NOT NULL`
  - `row_count integer NOT NULL`
  - `uploaded_at timestamptz NOT NULL DEFAULT now()`
  - Index on `user_id`
- Define `clients` table (auto-extracted from revenue CSV):
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `name text NOT NULL`
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - Unique constraint on `(user_id, name)` to prevent duplicate client names per user
  - Index on `user_id`
- Define `transactions` table (parsed revenue CSV rows):
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `upload_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE`
  - `client_id uuid REFERENCES clients(id) ON DELETE SET NULL` (nullable during initial parse before mapping)
  - `amount numeric(15,2) NOT NULL`
  - `transaction_date date NOT NULL`
  - `raw_data jsonb` (original CSV row for debugging/re-mapping)
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - Indexes on `user_id`, `upload_id`, `client_id`
- Define `costs` table (parsed cost CSV rows):
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `upload_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE`
  - `vendor text` (nullable, extracted from CSV)
  - `category text` (nullable, extracted from CSV)
  - `amount numeric(15,2) NOT NULL`
  - `cost_date date NOT NULL`
  - `raw_data jsonb`
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - Indexes on `user_id`, `upload_id`
- Enable RLS on all 4 tables: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`
- Create 4 policies per table (16 total) using template:
  - SELECT: `CREATE POLICY "Users can view own data" ON x FOR SELECT USING (auth.uid() = user_id);`
  - INSERT: `CREATE POLICY "Users can insert own data" ON x FOR INSERT WITH CHECK (auth.uid() = user_id);`
  - UPDATE: `CREATE POLICY "Users can update own data" ON x FOR UPDATE USING (auth.uid() = user_id);`
  - DELETE: `CREATE POLICY "Users can delete own data" ON x FOR DELETE USING (auth.uid() = user_id);`

**Verification:**

- Run `npx supabase db diff` to check for syntax errors (dry-run)
- Apply migration locally: `cmd /c "cd /d C:\Users\LB70XE\OneDrive - ING\Desktop\10xDevs_MVP && npx supabase migration up"`
- Connect to local DB: `npx supabase db reset` (if needed), then `psql` via Supabase CLI
- Verify tables exist: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('uploads', 'clients', 'transactions', 'costs');` returns 4 rows
- Verify RLS enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';` shows `rowsecurity = true` for all 4
- Verify policies count: `SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('uploads', 'clients', 'transactions', 'costs');` returns 16 rows

**Manual gate:** Agent pauses after verification, asks user to confirm Phase 1 tables are correct before proceeding to Phase 2.

## Phase 2: Mapping & assignment rules + RLS

**Outcome:** column_mappings, cost_assignments tables exist for storing user configuration.

**File contracts:**
- EDIT `supabase/migrations/20260601_create_profitleak_schema.sql` (append to same file)

**Implementation steps:**

- Define `column_mappings` table (CSV column → system field mapping):
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `upload_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE`
  - `csv_column_name text NOT NULL`
  - `system_field text NOT NULL CHECK (system_field IN ('client_name', 'amount', 'date', 'project', 'category', 'vendor'))`
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - Unique constraint on `(upload_id, csv_column_name)` to prevent duplicate mapping
  - Indexes on `user_id`, `upload_id`
- Define `cost_assignments` table (cost → client allocation rules):
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `cost_id uuid NOT NULL REFERENCES costs(id) ON DELETE CASCADE`
  - `client_id uuid REFERENCES clients(id) ON DELETE SET NULL` (nullable for proportional allocation)
  - `allocation_type text NOT NULL CHECK (allocation_type IN ('direct', 'proportional', 'manual'))`
  - `allocation_percentage numeric(5,2)` (nullable for direct assignment, required for proportional/manual)
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - Indexes on `user_id`, `cost_id`, `client_id`
- Enable RLS on both tables
- Create 4 policies per table (8 total) using same template as Phase 1

**Verification:**

- Re-run `npx supabase db diff`
- Apply migration: `npx supabase migration up`
- Verify tables exist: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('column_mappings', 'cost_assignments');` returns 2 rows
- Verify RLS enabled and policies count: `SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('column_mappings', 'cost_assignments');` returns 8

**Manual gate:** Agent pauses after verification, asks user to confirm Phase 2 tables are correct before proceeding to Phase 3.

## Phase 3: Calculated results + alerts + RLS

**Outcome:** margins, alerts tables exist for materialized calculation results.

**File contracts:**
- EDIT `supabase/migrations/20260601_create_profitleak_schema.sql` (append to same file)

**Implementation steps:**

- Define `margins` table (materialized per-client margins):
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE`
  - `revenue numeric(15,2) NOT NULL DEFAULT 0`
  - `costs numeric(15,2) NOT NULL DEFAULT 0`
  - `margin_amount numeric(15,2) NOT NULL GENERATED ALWAYS AS (revenue - costs) STORED`
  - `margin_percentage numeric(5,2) NOT NULL GENERATED ALWAYS AS (CASE WHEN revenue > 0 THEN ((revenue - costs) / revenue * 100) ELSE 0 END) STORED`
  - `calculated_at timestamptz NOT NULL DEFAULT now()`
  - Unique constraint on `(user_id, client_id)` (one margin record per client per user)
  - Indexes on `user_id`, `client_id`, `margin_percentage` (for alert threshold queries)
- Define `alerts` table (persistent threshold-based alerts):
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `client_id uuid REFERENCES clients(id) ON DELETE CASCADE` (nullable for global alerts)
  - `alert_type text NOT NULL CHECK (alert_type IN ('unprofitable_client', 'margin_drop', 'cost_growth'))`
  - `severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high'))`
  - `message text NOT NULL` (plain language explanation)
  - `threshold_value numeric(10,2)` (nullable, stores threshold that triggered alert)
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - Indexes on `user_id`, `client_id`, `severity`
- Enable RLS on both tables
- Create 4 policies per table (8 total) using same template as Phase 1

**Verification:**

- Re-run `npx supabase db diff`
- Apply migration: `npx supabase migration up`
- Verify all 8 tables exist: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;` returns uploads, clients, transactions, costs, column_mappings, cost_assignments, margins, alerts
- Verify RLS enabled on all: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;` returns 8 rows
- Verify total policies: `SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';` returns 32
- Test RLS isolation manually:
  1. Create test user A via Supabase auth
  2. INSERT test client row: `INSERT INTO clients (user_id, name) VALUES ('<user-a-id>', 'Test Client A');`
  3. Switch to test user B context
  4. SELECT from clients: `SELECT * FROM clients WHERE name = 'Test Client A';` → returns 0 rows (proves isolation)
  5. Clean up test data

**Manual gate:** Agent pauses after verification, asks user to confirm Phase 3 tables are correct and RLS isolation test passed before marking implementation complete.

## Progress

Phase 1: Core data tables + RLS
- [x] Create supabase/migrations/ directory
- [x] Create migration file 20260601_create_profitleak_schema.sql
- [x] Define uploads table with user_id FK
- [x] Define clients table with unique constraint on (user_id, name)
- [x] Define transactions table with upload_id and client_id FKs
- [x] Define costs table with upload_id FK
- [x] Enable RLS on uploads, clients, transactions, costs
- [x] Create 16 RLS policies (4 per table)
- [x] Add indexes on foreign keys
- [x] Verify migration applies cleanly
- [x] Verify 4 tables exist with RLS enabled
- [x] Verify 16 policies created

Phase 2: Mapping & assignment rules + RLS
- [x] Define column_mappings table with upload_id FK
- [x] Define cost_assignments table with cost_id and client_id FKs
- [x] Enable RLS on column_mappings, cost_assignments
- [x] Create 8 RLS policies (4 per table)
- [x] Add indexes on foreign keys
- [x] Verify migration applies cleanly
- [x] Verify 6 tables total exist with RLS enabled
- [x] Verify 24 policies total created

Phase 3: Calculated results + alerts + RLS
- [x] Define margins table with generated columns (margin_amount, margin_percentage)
- [x] Define alerts table with severity and alert_type enums
- [x] Enable RLS on margins, alerts
- [x] Create 8 RLS policies (4 per table)
- [x] Add indexes on foreign keys and query columns
- [x] Verify migration applies cleanly
- [x] Verify all 8 tables exist with RLS enabled
- [x] Verify 32 policies total created
- [x] Run manual RLS isolation test (user A can't see user B's data)
- [x] Document migration in context/changes/data-schema-migrations/verification.md
