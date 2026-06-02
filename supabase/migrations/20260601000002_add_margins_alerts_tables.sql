-- ProfitLeak Schema Migration - Phase 3
-- Created: 2026-06-01
-- Purpose: Add margins and alerts tables with RLS

-- ============================================================================
-- Phase 3: Calculated Results + Alerts
-- ============================================================================

-- margins: Materialized per-client margins
-- Design note: margin_percentage returns 0 (not NULL) when revenue = 0.
-- This is correct for financial reporting: clients with no revenue display as 0% margin,
-- not as missing data. The CASE guard prevents division by zero.
CREATE TABLE margins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  revenue numeric(15,2) NOT NULL DEFAULT 0,
  costs numeric(15,2) NOT NULL DEFAULT 0,
  margin_amount numeric(15,2) NOT NULL GENERATED ALWAYS AS (revenue - costs) STORED,
  margin_percentage numeric(5,2) NOT NULL GENERATED ALWAYS AS (
    CASE WHEN revenue > 0 
      THEN ((revenue - costs) / revenue * 100) 
      ELSE 0 
    END
  ) STORED,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

CREATE INDEX idx_margins_user_id ON margins(user_id);
CREATE INDEX idx_margins_client_id ON margins(client_id);
CREATE INDEX idx_margins_margin_percentage ON margins(margin_percentage);

-- alerts: Persistent threshold-based alerts
CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('unprofitable_client', 'margin_drop', 'cost_growth')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  message text NOT NULL,
  threshold_value numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_client_id ON alerts(client_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);

-- ============================================================================
-- Phase 3: Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on results tables
ALTER TABLE margins ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- margins policies
CREATE POLICY "Users can view own margins"
  ON margins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own margins"
  ON margins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own margins"
  ON margins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own margins"
  ON margins FOR DELETE
  USING (auth.uid() = user_id);

-- alerts policies
CREATE POLICY "Users can view own alerts"
  ON alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts"
  ON alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON alerts FOR DELETE
  USING (auth.uid() = user_id);
