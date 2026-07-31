-- ProfitLeak Schema Hotfix
-- Created: 2026-07-31
-- Purpose: Fix RLS issues in margin calculation functions by adding SECURITY DEFINER

-- Drop and recreate functions with SECURITY DEFINER to bypass RLS checks when called from triggers
-- Triggers execute in database context without auth.uid() session, causing RLS failures

-- ============================================================================
-- Function: Recalculate margins for a specific user (FIXED - SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_user_margins(p_user_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
DECLARE
  v_total_revenue numeric := 0;
  v_total_costs numeric := 0;
BEGIN
  -- Clear old margins
  DELETE FROM margins WHERE user_id = p_user_id;

  -- Calculate total revenue and costs for user
  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN file_type = 'cost' THEN amount ELSE 0 END), 0)
  INTO v_total_revenue, v_total_costs
  FROM transactions t
  JOIN uploads u ON u.id = t.upload_id
  WHERE t.user_id = p_user_id
    AND u.file_type = 'revenue';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_costs
  FROM costs
  WHERE user_id = p_user_id;

  -- Recalculate margins - use proportional allocation (cost_assignments is always empty on upload)
  INSERT INTO margins (user_id, client_id, revenue, costs)
  SELECT 
    t.user_id,
    t.client_id,
    COALESCE(SUM(t.amount), 0) as total_revenue,
    CASE 
      WHEN v_total_revenue > 0 AND COALESCE(SUM(t.amount), 0) > 0
        THEN (COALESCE(SUM(t.amount), 0) / v_total_revenue) * v_total_costs
      ELSE 0
    END as allocated_costs
  FROM transactions t
  WHERE t.user_id = p_user_id
  GROUP BY t.user_id, t.client_id
  ON CONFLICT (user_id, client_id) 
  DO UPDATE SET 
    revenue = EXCLUDED.revenue,
    costs = EXCLUDED.costs,
    calculated_at = now();
END;
$$;

-- ============================================================================
-- Function: Generate alerts based on margins (FIXED - SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_margin_alerts(p_user_id uuid, p_profitability_threshold numeric DEFAULT 10)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  -- Clear old alerts for this user
  DELETE FROM alerts WHERE user_id = p_user_id;

  -- Alert: Unprofitable clients (below threshold)
  INSERT INTO alerts (user_id, client_id, alert_type, severity, message, threshold_value)
  SELECT 
    m.user_id,
    m.client_id,
    'unprofitable_client',
    CASE 
      WHEN m.margin_percentage < 0 THEN 'high'
      WHEN m.margin_percentage < p_profitability_threshold THEN 'medium'
      ELSE 'low'
    END,
    FORMAT('Client "%s" margin is %.1f%% (below threshold of %.1f%%)',
      c.name, m.margin_percentage, p_profitability_threshold),
    p_profitability_threshold
  FROM margins m
  JOIN clients c ON c.id = m.client_id
  WHERE m.user_id = p_user_id
    AND m.margin_percentage < p_profitability_threshold
    AND m.revenue > 0;

  -- Alert: High cost clients (more costs than revenue)
  INSERT INTO alerts (user_id, client_id, alert_type, severity, message)
  SELECT 
    m.user_id,
    m.client_id,
    'cost_growth',
    'high',
    FORMAT('Client "%s" has %.2f PLN in costs but only %.2f PLN in revenue (loss of %.2f PLN)',
      c.name, m.costs, m.revenue, m.margin_amount * -1)
  FROM margins m
  JOIN clients c ON c.id = m.client_id
  WHERE m.user_id = p_user_id
    AND m.costs > m.revenue
    AND m.revenue > 0;
END;
$$;

-- ============================================================================
-- Trigger Functions (FIXED - SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_recalculate_margins_on_cost()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  PERFORM recalculate_user_margins(NEW.user_id);
  PERFORM generate_margin_alerts(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_recalculate_margins_on_assignment()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM costs WHERE id = NEW.cost_id;
  IF v_user_id IS NOT NULL THEN
    PERFORM recalculate_user_margins(v_user_id);
    PERFORM generate_margin_alerts(v_user_id);
  END IF;
  RETURN NEW;
END;
$$;
