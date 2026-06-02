-- Fix: Add validation constraint on allocation_percentage
-- Issue: F3 from implementation review (data-schema-migrations)
-- Created: 2026-06-02

-- Add CHECK constraint to ensure allocation_percentage is between 0 and 100
ALTER TABLE cost_assignments
ADD CONSTRAINT allocation_percentage_valid 
CHECK (allocation_percentage IS NULL OR (allocation_percentage >= 0 AND allocation_percentage <= 100));
