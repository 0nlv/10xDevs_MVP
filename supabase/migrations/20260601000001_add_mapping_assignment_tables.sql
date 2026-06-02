-- ProfitLeak Schema Migration - Phase 2
-- Created: 2026-06-01
-- Purpose: Add column_mappings and cost_assignments tables with RLS

-- ============================================================================
-- Phase 2: Mapping & Assignment Rules
-- ============================================================================

-- column_mappings: CSV column → system field mapping
CREATE TABLE column_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  csv_column_name text NOT NULL,
  system_field text NOT NULL CHECK (system_field IN ('client_name', 'amount', 'date', 'project', 'category', 'vendor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (upload_id, csv_column_name)
);

CREATE INDEX idx_column_mappings_user_id ON column_mappings(user_id);
CREATE INDEX idx_column_mappings_upload_id ON column_mappings(upload_id);

-- cost_assignments: cost → client allocation rules
-- Design note: Multiple assignments per cost_id are allowed (total may exceed 100%).
-- Proportional/manual allocation is calculated at query time, not enforced at DB level.
-- Application layer is responsible for validating total allocation if needed.
CREATE TABLE cost_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cost_id uuid NOT NULL REFERENCES costs(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  allocation_type text NOT NULL CHECK (allocation_type IN ('direct', 'proportional', 'manual')),
  allocation_percentage numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cost_assignments_user_id ON cost_assignments(user_id);
CREATE INDEX idx_cost_assignments_cost_id ON cost_assignments(cost_id);
CREATE INDEX idx_cost_assignments_client_id ON cost_assignments(client_id);

-- ============================================================================
-- Phase 2: Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on mapping and assignment tables
ALTER TABLE column_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_assignments ENABLE ROW LEVEL SECURITY;

-- column_mappings policies
CREATE POLICY "Users can view own column_mappings"
  ON column_mappings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own column_mappings"
  ON column_mappings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own column_mappings"
  ON column_mappings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own column_mappings"
  ON column_mappings FOR DELETE
  USING (auth.uid() = user_id);

-- cost_assignments policies
CREATE POLICY "Users can view own cost_assignments"
  ON cost_assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cost_assignments"
  ON cost_assignments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cost_assignments"
  ON cost_assignments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cost_assignments"
  ON cost_assignments FOR DELETE
  USING (auth.uid() = user_id);
