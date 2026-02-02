-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (wallet-based authentication)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  ens_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rental contracts table (cache of on-chain data)
CREATE TABLE rental_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_address TEXT UNIQUE NOT NULL,
  landlord_address TEXT NOT NULL,
  tenant_address TEXT,
  tenant_ens_name TEXT,
  basename TEXT,
  monthly_amount BIGINT NOT NULL, -- USDC amount in wei (6 decimals)
  total_months INTEGER NOT NULL,
  start_timestamp BIGINT,
  state INTEGER NOT NULL DEFAULT 0, -- 0=Deployed, 1=Active, 2=Completed, 3=TerminationPending, 4=Terminated
  termination_initiated_at BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Computed fields for easier querying
  total_amount BIGINT GENERATED ALWAYS AS (monthly_amount * total_months) STORED,
  is_active BOOLEAN GENERATED ALWAYS AS (state = 1) STORED,

  -- Foreign keys
  CONSTRAINT fk_landlord FOREIGN KEY (landlord_address) REFERENCES users(wallet_address) ON DELETE CASCADE,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_address) REFERENCES users(wallet_address) ON DELETE SET NULL
);

-- User-Contract relationship table (for multi-role queries)
CREATE TABLE user_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address TEXT NOT NULL,
  contract_address TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('landlord', 'tenant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_address, contract_address, role),
  CONSTRAINT fk_user FOREIGN KEY (user_address) REFERENCES users(wallet_address) ON DELETE CASCADE,
  CONSTRAINT fk_contract FOREIGN KEY (contract_address) REFERENCES rental_contracts(contract_address) ON DELETE CASCADE
);

-- Contract events table (audit log of state changes)
CREATE TABLE contract_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_address TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'created', 'activated', 'rent_released', 'termination_initiated', 'terminated', 'completed'
  block_number BIGINT NOT NULL,
  transaction_hash TEXT NOT NULL,
  event_data JSONB, -- Flexible storage for event-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_contract_event FOREIGN KEY (contract_address) REFERENCES rental_contracts(contract_address) ON DELETE CASCADE
);

-- Chat sessions table (AI conversation history)
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address TEXT NOT NULL,
  contract_address TEXT, -- NULL until contract is deployed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_session_user FOREIGN KEY (user_address) REFERENCES users(wallet_address) ON DELETE CASCADE,
  CONSTRAINT fk_session_contract FOREIGN KEY (contract_address) REFERENCES rental_contracts(contract_address) ON DELETE SET NULL
);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_message_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX idx_rental_contracts_landlord ON rental_contracts(landlord_address);
CREATE INDEX idx_rental_contracts_tenant ON rental_contracts(tenant_address);
CREATE INDEX idx_rental_contracts_state ON rental_contracts(state);
CREATE INDEX idx_rental_contracts_basename ON rental_contracts(basename);
CREATE INDEX idx_user_contracts_user ON user_contracts(user_address);
CREATE INDEX idx_user_contracts_contract ON user_contracts(contract_address);
CREATE INDEX idx_contract_events_contract ON contract_events(contract_address);
CREATE INDEX idx_contract_events_type ON contract_events(event_type);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_address);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);

-- Row Level Security (RLS) Policies
-- Note: We use wallet-based authentication (RainbowKit), not Supabase Auth.
-- Server-side operations use service role key to bypass RLS.
-- Client-side operations use anon key with permissive policies.
-- Application-level access control is enforced in service layer.

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users: Public read, service role handles writes
CREATE POLICY "Public read access for users" ON users FOR SELECT USING (true);
CREATE POLICY "Service role can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update users" ON users FOR UPDATE USING (true);

-- Rental contracts: Public read, service role handles writes
CREATE POLICY "Public read access for rental contracts" ON rental_contracts FOR SELECT USING (true);
CREATE POLICY "Service role can insert contracts" ON rental_contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update contracts" ON rental_contracts FOR UPDATE USING (true);

-- User-contracts: Public read, service role handles writes
CREATE POLICY "Public read access for user contracts" ON user_contracts FOR SELECT USING (true);
CREATE POLICY "Service role can insert user contracts" ON user_contracts FOR INSERT WITH CHECK (true);

-- Contract events: Public read, service role can insert
CREATE POLICY "Public read access for contract events" ON contract_events FOR SELECT USING (true);
CREATE POLICY "Service role can insert contract events" ON contract_events FOR INSERT WITH CHECK (true);

-- Chat sessions: Public read (filtered by service layer), service role handles writes
CREATE POLICY "Public read access for chat sessions" ON chat_sessions FOR SELECT USING (true);
CREATE POLICY "Service role can insert chat sessions" ON chat_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update chat sessions" ON chat_sessions FOR UPDATE USING (true);

-- Chat messages: Public read (filtered by service layer), service role handles writes
CREATE POLICY "Public read access for chat messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Service role can insert chat messages" ON chat_messages FOR INSERT WITH CHECK (true);

-- Functions

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rental_contracts_updated_at BEFORE UPDATE ON rental_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User Settings table (added 2026-02-03)
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address TEXT UNIQUE NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  network_mode TEXT NOT NULL DEFAULT 'testnet' CHECK (network_mode IN ('mainnet', 'testnet')),
  currency_display TEXT DEFAULT 'USD' CHECK (currency_display IN ('USD', 'EUR', 'GBP')),
  date_format TEXT DEFAULT 'MM/DD/YYYY' CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY', 'ISO')),
  address_display TEXT DEFAULT 'truncated' CHECK (address_display IN ('full', 'truncated')),
  rpc_base_url TEXT,
  rpc_ethereum_url TEXT,
  notification_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user ON user_settings(user_address);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for user settings" ON user_settings FOR SELECT USING (true);
CREATE POLICY "Service role can manage settings" ON user_settings FOR ALL USING (true);

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
