-- Verify Phase 1 tables created
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('uploads', 'clients', 'transactions', 'costs') 
ORDER BY tablename;
