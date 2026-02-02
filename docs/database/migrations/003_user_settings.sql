-- User Settings Table Migration
-- Applied: 2026-02-03
-- Purpose: Store user preferences for network mode, display settings, and RPC endpoints

CREATE TABLE IF NOT EXISTS user_settings (
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

-- Index for fast user lookups
CREATE INDEX idx_user_settings_user ON user_settings(user_address);

-- RLS Policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for user settings"
  ON user_settings FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage settings"
  ON user_settings FOR ALL
  USING (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
