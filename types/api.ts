// API Types for NyayChain Platform

export interface Bond {
  id: number;
  bond_mint: string;
  isin?: string;
  issuer: string;
  name: string;
  coupon_rate: number;
  maturity_date: string;
  face_value: number;
  decimals: number;
  total_supply: number;
  status: 'active' | 'paused' | 'matured' | 'defaulted';
  credit_rating?: string;
  credit_rating_agency?: string;
  sector?: string;
  interest_payment_frequency?: string;
  listed_yield?: number;
  min_investment?: number;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Market {
  id: number;
  bond_id: number;
  market_pda: string;
  usdc_mint: string;
  price_per_token_scaled: number;
  vault_bond_account: string;
  vault_usdc_account: string;
  admin_pubkey: string;
  paused: boolean;
  liquidity_bond: number;
  liquidity_usdc: number;
  created_at: string;
  updated_at: string;
}

export interface BondMarketView {
  bond_id: number;
  bond_mint: string;
  issuer: string;
  name: string;
  coupon_rate: number;
  maturity_date: string;
  face_value: number;
  listed_yield?: number;
  min_investment?: number;
  bond_status: string;
  market_id?: number;
  market_pda?: string;
  price_per_token_scaled?: number;
  market_paused?: boolean;
  liquidity_bond?: number;
  liquidity_usdc?: number;
}

export interface User {
  id: number;
  wallet_address: string;
  kyc_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: number;
  tx_signature: string;
  market_id: number;
  user_wallet: string;
  side: 'buy' | 'sell';
  amount: number;
  price_scaled: number;
  total_value: number;
  status: 'pending' | 'confirmed' | 'failed';
  block_height?: number;
  created_at: string;
  confirmed_at?: string;
}

export interface Position {
  id: number;
  wallet_address: string;
  bond_id: number;
  quantity_scaled: number;
  avg_price_scaled: number;
  total_cost: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioView {
  wallet_address: string;
  bond_name: string;
  issuer: string;
  coupon_rate: number;
  maturity_date: string;
  quantity_scaled: number;
  avg_price_scaled: number;
  total_cost: number;
  current_price?: number;
  current_value?: number;
  unrealized_pnl?: number;
}

export interface PriceHistory {
  id: number;
  market_id: number;
  price_scaled: number;
  source: 'oracle' | 'trade' | 'manual' | 'aspero';
  volume_24h: number;
  created_at: string;
}

export interface AIJob {
  id: number;
  job_type: 'price_estimate' | 'document_parse' | 'anomaly_detect' | 'recommendation';
  input_ref?: string;
  input_data?: any;
  output_json?: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  confidence?: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface OracleUpdate {
  id: number;
  market_id: number;
  old_price_scaled?: number;
  new_price_scaled: number;
  tx_signature?: string;
  source: string;
  created_at: string;
}

export interface SystemEvent {
  id: number;
  event_type: 'trade' | 'price_update' | 'market_init' | 'bond_mint' | 'pause' | 'resume';
  entity_id?: string;
  tx_signature?: string;
  data?: any;
  processed: boolean;
  created_at: string;
  processed_at?: string;
}

export interface Coupon {
  id: number;
  bond_id: number;
  payment_date: string;
  amount_per_token: number;
  status: 'pending' | 'paid' | 'cancelled';
  tx_signature?: string;
  created_at: string;
  paid_at?: string;
}

// API Request/Response Types
export interface CreateBondRequest {
  bond_mint: string;
  isin?: string;
  issuer: string;
  name: string;
  coupon_rate: number;
  maturity_date: string;
  face_value: number;
  total_supply: number;
  credit_rating?: string;
  credit_rating_agency?: string;
  sector?: string;
  interest_payment_frequency?: string;
  listed_yield?: number;
  min_investment?: number;
  logo_url?: string;
}

export interface CreateMarketRequest {
  bond_id: number;
  market_pda: string;
  initial_price_scaled: number;
  vault_bond_account: string;
  vault_usdc_account: string;
  admin_pubkey: string;
}

export interface TradeRequest {
  market_id: number;
  side: 'buy' | 'sell';
  amount: number;
  max_price_scaled?: number; // For buy orders
  min_price_scaled?: number; // For sell orders
}

export interface PriceUpdateRequest {
  market_id: number;
  new_price_scaled: number;
  source?: string;
}

export interface AIJobRequest {
  job_type: AIJob['job_type'];
  input_ref?: string;
  input_data?: any;
}

// Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: 'trade' | 'price_update' | 'market_status' | 'portfolio_update';
  data: any;
  timestamp: string;
}

export interface TradeEvent extends WebSocketEvent {
  type: 'trade';
  data: Trade;
}

export interface PriceUpdateEvent extends WebSocketEvent {
  type: 'price_update';
  data: {
    market_id: number;
    bond_mint: string;
    old_price_scaled?: number;
    new_price_scaled: number;
    source: string;
  };
}

// Aspero API Integration Types (from api_example.txt)
export interface AsperoBond {
  units_to_sell: number;
  pref_buckets: Array<{
    min: number;
    max: number;
    yield: number;
  }>;
  logo_url?: string;
  credit_rating_agency: string;
  maturity_date: string;
  listed_yield: number;
  credit_rating: string;
  coupon_rate: number;
  name: string;
  min_investment: number;
  min_units_to_sell: number;
  id: string;
  tag: string[];
  min_investment_per_unit: number;
  category: string;
  sector: string;
  isin: string;
  interest_payment_frequency: string;
}

export interface AsperoWidget {
  config: {
    widget_id: number;
    widget_type: string;
    render_type: string;
    heading: {
      title: string;
      ctaText?: string;
    };
    category: string;
  };
  data: AsperoBond[] | any;
}

export interface AsperoApiResponse {
  widgets: AsperoWidget[];
}

// Blockchain Integration Types
export interface SolanaTransaction {
  signature: string;
  slot: number;
  blockTime: number;
  confirmationStatus: 'processed' | 'confirmed' | 'finalized';
}

export interface MarketInstruction {
  type: 'initialize_market' | 'buy' | 'sell' | 'update_price' | 'pause' | 'resume';
  accounts: string[];
  data: any;
}

// Analytics Types
export interface MarketStats {
  market_id: number;
  bond_name: string;
  total_volume_24h: number;
  total_trades_24h: number;
  price_change_24h: number;
  price_change_24h_percent: number;
  highest_price_24h: number;
  lowest_price_24h: number;
  current_price: number;
}
