-- Positions and trades are wallet-scoped. No dummy data inserted.

create table if not exists positions (
  id bigserial primary key,
  wallet text not null,
  bond_id text not null,
  quantity numeric not null check (quantity >= 0),
  avg_price numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create unique index if not exists positions_wallet_bond_unique on positions (wallet, bond_id);

create table if not exists trades (
  id bigserial primary key,
  wallet text not null,
  bond_id text not null,
  side text not null check (side in ('buy','sell')),
  quantity numeric not null check (quantity > 0),
  price numeric not null check (price >= 0),
  created_at timestamptz not null default now()
);

-- Optional future metadata table populated from Aspero (not required for MVP UI)
create table if not exists bonds (
  id text primary key,
  isin text,
  name text,
  credit_rating text,
  coupon_rate numeric,
  listed_yield numeric,
  maturity_date date,
  logo_url text,
  min_investment numeric,
  updated_at timestamptz not null default now()
);

comment on table positions is 'Net holdings per wallet per bond';
comment on table trades is 'Recorded off-chain trade intents for audit/history';
comment on table bonds is 'Optional cache of bond metadata from Aspero';
