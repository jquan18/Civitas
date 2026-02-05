-- Enable Realtime for contract_transactions table
-- This allows frontend to subscribe to real-time updates when transactions occur

-- Enable realtime for contract_transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE contract_transactions;

-- Note: If the publication doesn't exist, you may need to create it first with:
-- CREATE PUBLICATION supabase_realtime;

-- Verify realtime is enabled
-- You can check by running:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
