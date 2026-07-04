alter table if exists tg_accounts
  add column if not exists daily_job_limit int not null default 30;

alter table if exists tg_accounts
  add column if not exists daily_job_count int not null default 0;

alter table if exists tg_accounts
  add column if not exists daily_job_reset_at timestamptz;

alter table if exists tg_accounts
  add column if not exists risk_status text not null default 'active';

alter table if exists tg_accounts
  add column if not exists risk_reason text not null default '';

alter table if exists queue_jobs
  add column if not exists account_id uuid references tg_accounts(id) on delete set null;

create index if not exists idx_tg_accounts_risk_status on tg_accounts(risk_status, is_active, daily_job_count);
create index if not exists idx_queue_jobs_account_status on queue_jobs(account_id, status, created_at desc);

