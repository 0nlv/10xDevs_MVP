-- Fix: Add composite indexes for date/time range queries
-- Issue: F4 and F5 from implementation review (data-schema-migrations)
-- Created: 2026-06-02

-- Add composite index on transactions for date range queries
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date);

-- Add composite index on costs for date range queries
CREATE INDEX idx_costs_user_date ON costs(user_id, cost_date);

-- Add composite index on alerts for recent alerts queries
CREATE INDEX idx_alerts_user_created ON alerts(user_id, created_at DESC);
