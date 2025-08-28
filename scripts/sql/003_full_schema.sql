-- NyayChain Complete Database Schema
-- Based on PRD requirements for tokenized bond trading platform

-- Enhanced bonds table with blockchain integration
DROP TABLE IF EXISTS bonds CASCADE;
CREATE TABLE bonds (
  id BIGSERIAL PRIMARY KEY,
  bond_mint TEXT UNIQUE NOT NULL, -- Solana SPL token mint address
  isin TEXT UNIQUE,
  issuer TEXT NOT NULL,
  name TEXT NOT NULL,
  coupon_rate NUMERIC(5,2) NOT NULL CHECK (coupon_rate >= 0),
  maturity_date DATE NOT NULL,
  face_value NUMERIC(15,2) NOT NULL CHECK (face_value > 0),
  decimals INTEGER NOT NULL DEFAULT 6,
  total_supply BIGINT NOT NULL CHECK (total_supply > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'matured', 'defaulted')),
  credit_rating TEXT,
  credit_rating_agency TEXT,
  sector TEXT,
  interest_payment_frequency TEXT DEFAULT 'monthly',
  listed_yield NUMERIC(5,2),
  min_investment NUMERIC(15,2),
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Markets table for trading venues
CREATE TABLE markets (
  id BIGSERIAL PRIMARY KEY,
  bond_id BIGINT NOT NULL REFERENCES bonds(id) ON DELETE CASCADE,
  market_pda TEXT UNIQUE NOT NULL, -- Solana PDA address
  usdc_mint TEXT NOT NULL DEFAULT '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  price_per_token_scaled BIGINT NOT NULL DEFAULT 0, -- Price scaled by 10^6
  vault_bond_account TEXT NOT NULL, -- Bond token vault
  vault_usdc_account TEXT NOT NULL, -- USDC vault
  admin_pubkey TEXT NOT NULL,
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  liquidity_bond BIGINT DEFAULT 0,
  liquidity_usdc BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enhanced trades table with blockchain integration
DROP TABLE IF EXISTS trades CASCADE;
CREATE TABLE trades (
  id BIGSERIAL PRIMARY KEY,
  tx_signature TEXT UNIQUE NOT NULL, -- Solana transaction signature
  market_id BIGINT NOT NULL REFERENCES markets(id),
  user_wallet TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  amount BIGINT NOT NULL CHECK (amount > 0), -- Token amount (scaled)
  price_scaled BIGINT NOT NULL CHECK (price_scaled > 0), -- Price scaled by 10^6
  total_value BIGINT NOT NULL CHECK (total_value > 0), -- Total USDC value
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  block_height BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- Enhanced positions table
DROP TABLE IF EXISTS positions CASCADE;
CREATE TABLE positions (
  id BIGSERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  bond_id BIGINT NOT NULL REFERENCES bonds(id),
  quantity_scaled BIGINT NOT NULL DEFAULT 0 CHECK (quantity_scaled >= 0),
  avg_price_scaled BIGINT DEFAULT 0,
  total_cost BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wallet_address, bond_id)
);

-- Price history table for analytics
CREATE TABLE price_history (
  id BIGSERIAL PRIMARY KEY,
  market_id BIGINT NOT NULL REFERENCES markets(id),
  price_scaled BIGINT NOT NULL,
  source TEXT NOT NULL DEFAULT 'oracle' CHECK (source IN ('oracle', 'trade', 'manual', 'aspero')),
  volume_24h BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI jobs table for ML tasks
CREATE TABLE ai_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_type TEXT NOT NULL CHECK (job_type IN ('price_estimate', 'document_parse', 'anomaly_detect', 'recommendation')),
  input_ref TEXT, -- File path, bond ID, or other input reference
  input_data JSONB,
  output_json JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Oracle updates log
CREATE TABLE oracle_updates (
  id BIGSERIAL PRIMARY KEY,
  market_id BIGINT NOT NULL REFERENCES markets(id),
  old_price_scaled BIGINT,
  new_price_scaled BIGINT NOT NULL,
  tx_signature TEXT,
  source TEXT NOT NULL DEFAULT 'aspero',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System events table for reconciliation
CREATE TABLE system_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('trade', 'price_update', 'market_init', 'bond_mint', 'pause', 'resume')),
  entity_id TEXT, -- Market ID, Bond ID, etc.
  tx_signature TEXT,
  data JSONB,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Coupons table for interest payments
CREATE TABLE coupons (
  id BIGSERIAL PRIMARY KEY,
  bond_id BIGINT NOT NULL REFERENCES bonds(id),
  payment_date DATE NOT NULL,
  amount_per_token BIGINT NOT NULL, -- Amount scaled by 10^6
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  tx_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Indices for performance
CREATE INDEX idx_bonds_bond_mint ON bonds(bond_mint);
CREATE INDEX idx_bonds_status ON bonds(status);
CREATE INDEX idx_markets_bond_id ON markets(bond_id);
CREATE INDEX idx_markets_paused ON markets(paused);
CREATE INDEX idx_trades_market_id ON trades(market_id);
CREATE INDEX idx_trades_user_wallet ON trades(user_wallet);
CREATE INDEX idx_trades_tx_signature ON trades(tx_signature);
CREATE INDEX idx_trades_created_at ON trades(created_at);
CREATE INDEX idx_positions_wallet_address ON positions(wallet_address);
CREATE INDEX idx_price_history_market_id ON price_history(market_id);
CREATE INDEX idx_price_history_created_at ON price_history(created_at);
CREATE INDEX idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX idx_ai_jobs_job_type ON ai_jobs(job_type);
CREATE INDEX idx_system_events_processed ON system_events(processed);
CREATE INDEX idx_system_events_event_type ON system_events(event_type);

-- Views for easier querying
CREATE VIEW bond_market_view AS
SELECT 
  b.id as bond_id,
  b.bond_mint,
  b.issuer,
  b.name,
  b.coupon_rate,
  b.maturity_date,
  b.face_value,
  b.listed_yield,
  b.min_investment,
  b.status as bond_status,
  m.id as market_id,
  m.market_pda,
  m.price_per_token_scaled,
  m.paused as market_paused,
  m.liquidity_bond,
  m.liquidity_usdc
FROM bonds b
LEFT JOIN markets m ON b.id = m.bond_id;

CREATE VIEW portfolio_view AS
SELECT 
  p.wallet_address,
  b.name as bond_name,
  b.issuer,
  b.coupon_rate,
  b.maturity_date,
  p.quantity_scaled,
  p.avg_price_scaled,
  p.total_cost,
  m.price_per_token_scaled as current_price,
  (p.quantity_scaled * m.price_per_token_scaled / 1000000) as current_value,
  ((p.quantity_scaled * m.price_per_token_scaled / 1000000) - p.total_cost) as unrealized_pnl
FROM positions p
JOIN bonds b ON p.bond_id = b.id
LEFT JOIN markets m ON b.id = m.bond_id
WHERE p.quantity_scaled > 0;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bonds_updated_at BEFORE UPDATE ON bonds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON markets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE bonds IS 'Tokenized bonds with SPL token integration';
COMMENT ON TABLE markets IS 'Trading markets for bonds with Solana PDA addresses';
COMMENT ON TABLE users IS 'User accounts with wallet addresses and KYC status';
COMMENT ON TABLE trades IS 'On-chain trades with Solana transaction signatures';
COMMENT ON TABLE positions IS 'User portfolio positions aggregated from trades';
COMMENT ON TABLE price_history IS 'Historical price data for analytics and charts';
COMMENT ON TABLE ai_jobs IS 'AI/ML job tracking for price estimation and document parsing';
COMMENT ON TABLE oracle_updates IS 'Price oracle update history';
COMMENT ON TABLE system_events IS 'System events for reconciliation between on-chain and off-chain state';
COMMENT ON TABLE coupons IS 'Interest payment tracking for bonds';
