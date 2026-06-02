-- ProfitLeak Schema Migration
-- Created: 2026-06-01
-- Purpose: Create minimal PostgreSQL schema for CSV uploads, parsed data, 
--          mapping/assignment rules, calculated margins, and alerts with 
--          Row Level Security for tenant isolation

-- ============================================================================
-- Phase 1: Core Data Tables
-- ============================================================================

-- uploads: CSV file metadata (no raw file bytes stored)
CREATE TABLE uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_type text NOT NULL CHECK (file_type IN ('revenue', 'cost')),
  filename text NOT NULL,
  row_count integer NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_uploads_user_id ON uploads(user_id);

-- clients: Auto-extracted from revenue CSV (unique per user)
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX idx_clients_user_id ON clients(user_id);

-- transactions: Parsed revenue CSV rows
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  amount numeric(15,2) NOT NULL,
  transaction_date date NOT NULL,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_upload_id ON transactions(upload_id);
CREATE INDEX idx_transactions_client_id ON transactions(client_id);

-- costs: Parsed cost CSV rows
CREATE TABLE costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  vendor text,
  category text,
  amount numeric(15,2) NOT NULL,
  cost_date date NOT NULL,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_costs_user_id ON costs(user_id);
CREATE INDEX idx_costs_upload_id ON costs(upload_id);

-- ============================================================================
-- Phase 1: Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all core tables
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;

-- uploads policies
CREATE POLICY "Users can view own uploads"
  ON uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploads"
  ON uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own uploads"
  ON uploads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploads"
  ON uploads FOR DELETE
  USING (auth.uid() = user_id);

-- clients policies
CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  USING (auth.uid() = user_id);

-- transactions policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- costs policies
CREATE POLICY "Users can view own costs"
  ON costs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own costs"
  ON costs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own costs"
  ON costs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own costs"
  ON costs FOR DELETE
  USING (auth.uid() = user_id);
