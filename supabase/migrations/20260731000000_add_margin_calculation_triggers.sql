-- Margin Calculation & Alert Generation Triggers
-- Created: 2026-07-31
-- Purpose: Automatically populate margins and alerts tables when transactions/costs change

-- ============================================================================
-- Function: Recalculate margins for a specific user
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_user_margins(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Clear old margins
  DELETE FROM margins WHERE user_id = p_user_id;

  -- Recalculate margins from transactions and costs
  INSERT INTO margins (user_id, client_id, revenue, costs)
  SELECT 
    t.user_id,
    t.client_id,
    COALESCE(SUM(CASE WHEN t.client_id IS NOT NULL THEN t.amount ELSE 0 END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN ca.client_id = t.client_id THEN c.amount ELSE 0 END), 0) as total_costs
  FROM transactions t
  LEFT JOIN costs c ON c.user_id = t.user_id
  LEFT JOIN cost_assignments ca ON ca.cost_id = c.id
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
RETURNS void AS $$
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
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalculate_user_margins(NEW.user_id);
  PERFORM generate_margin_alerts(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_margins_on_assignment_change ON cost_assignments;

CREATE TRIGGER trg_recalculate_margins_on_assignment_change
AFTER INSERT OR UPDATE OR DELETE ON cost_assignments
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_margins_on_assignment();
