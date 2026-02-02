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
  CONSTRAINT fk_landlord FOREIGN KEY (landlord_address) REFERENCES users(wallet_address) ON DELETE CASCADE
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

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users: Can read all, can only insert/update own record
CREATE POLICY "Users can read all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert own record" ON users FOR INSERT WITH CHECK (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');
CREATE POLICY "Users can update own record" ON users FOR UPDATE USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Rental contracts: Can read all, can only modify as landlord
CREATE POLICY "Anyone can read rental contracts" ON rental_contracts FOR SELECT USING (true);
CREATE POLICY "Landlord can insert contracts" ON rental_contracts FOR INSERT WITH CHECK (landlord_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');
CREATE POLICY "Landlord can update contracts" ON rental_contracts FOR UPDATE USING (landlord_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- User-contracts: Can read own relationships
CREATE POLICY "Users can read own contract relationships" ON user_contracts FOR SELECT USING (user_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');
CREATE POLICY "Users can insert own relationships" ON user_contracts FOR INSERT WITH CHECK (user_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Contract events: Anyone can read, service role can insert
CREATE POLICY "Anyone can read contract events" ON contract_events FOR SELECT USING (true);

-- Chat sessions: Users can only access their own sessions
CREATE POLICY "Users can read own chat sessions" ON chat_sessions FOR SELECT USING (user_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');
CREATE POLICY "Users can create own chat sessions" ON chat_sessions FOR INSERT WITH CHECK (user_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');
CREATE POLICY "Users can update own chat sessions" ON chat_sessions FOR UPDATE USING (user_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Chat messages: Users can only access messages from their sessions
CREATE POLICY "Users can read messages from own sessions" ON chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = chat_messages.session_id
    AND chat_sessions.user_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
  )
);
CREATE POLICY "Users can insert messages to own sessions" ON chat_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = chat_messages.session_id
    AND chat_sessions.user_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
  )
);

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
