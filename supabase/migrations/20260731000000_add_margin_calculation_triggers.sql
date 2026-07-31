-- Margin Calculation & Alert Generation Triggers
-- Created: 2026-07-31
-- Purpose: Automatically populate margins and alerts tables when transactions/costs change

-- ============================================================================
-- Function: Recalculate margins for a specific user
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

  -- Recalculate margins from transactions
  -- Uses direct cost_assignments if available (allocation_type = 'direct'), otherwise proportional allocation
  INSERT INTO margins (user_id, client_id, revenue, costs)
  SELECT 
    t.user_id,
    t.client_id,
    COALESCE(SUM(t.amount), 0) as total_revenue,
    COALESCE(
      -- Try to get direct cost assignments for this client
      (SELECT SUM(c.amount)
       FROM costs c
       JOIN cost_assignments ca ON ca.cost_id = c.id
       WHERE c.user_id = t.user_id
         AND ca.client_id = t.client_id
         AND ca.allocation_type = 'direct'),
      -- Fallback to proportional allocation if no direct assignments exist
      CASE 
        WHEN v_total_revenue > 0 AND COALESCE(SUM(t.amount), 0) > 0
          THEN (COALESCE(SUM(t.amount), 0) / v_total_revenue) * v_total_costs
        ELSE 0
      END
    ) as allocated_costs
  FROM transactions t
  WHERE t.user_id = p_user_id
  GROUP BY t.user_id, t.client_id
  ON CONFLICT (user_id, client_id) 
  DO UPDATE SET 
    revenue = EXCLUDED.revenue,
    costs = EXCLUDED.costs,
    calculated_at = now();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: Generate alerts based on margins
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
    AND m.margin_amount < 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger: Recalculate margins when transactions change
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_recalculate_margins_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalculate_user_margins(NEW.user_id);
  PERFORM generate_margin_alerts(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_margins_on_transaction_insert ON transactions;
DROP TRIGGER IF EXISTS trg_recalculate_margins_on_transaction_update ON transactions;
DROP TRIGGER IF EXISTS trg_recalculate_margins_on_transaction_delete ON transactions;

CREATE TRIGGER trg_recalculate_margins_on_transaction_insert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_margins_on_transaction();

CREATE TRIGGER trg_recalculate_margins_on_transaction_update
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_margins_on_transaction();

CREATE TRIGGER trg_recalculate_margins_on_transaction_delete
AFTER DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_margins_on_transaction();

-- ============================================================================
-- Trigger: Recalculate margins when costs/assignments change
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

DROP TRIGGER IF EXISTS trg_recalculate_margins_on_cost_insert ON costs;
DROP TRIGGER IF EXISTS trg_recalculate_margins_on_cost_update ON costs;
DROP TRIGGER IF EXISTS trg_recalculate_margins_on_cost_delete ON costs;

CREATE TRIGGER trg_recalculate_margins_on_cost_insert
AFTER INSERT ON costs
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_margins_on_cost();

CREATE TRIGGER trg_recalculate_margins_on_cost_update
AFTER UPDATE ON costs
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_margins_on_cost();

CREATE TRIGGER trg_recalculate_margins_on_cost_delete
AFTER DELETE ON costs
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_margins_on_cost();

-- ============================================================================
-- Trigger: Recalculate when cost assignments change
-- ============================================================================

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

DROP TRIGGER IF EXISTS trg_recalculate_margins_on_assignment_change ON cost_assignments;

CREATE TRIGGER trg_recalculate_margins_on_assignment_change
AFTER INSERT OR UPDATE OR DELETE ON cost_assignments
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_margins_on_assignment();
