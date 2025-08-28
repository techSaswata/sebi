-- program_logs table for persisted Solana program logs (optional)
create table if not exists program_logs (
  id bigserial primary key,
  program_id text not null,
  slot bigint not null,
  signature text,
  err jsonb,
  logs jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists program_logs_program_id_idx on program_logs (program_id);
create index if not exists program_logs_slot_idx on program_logs (slot);
