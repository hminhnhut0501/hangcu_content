-- Phase 9 cleanup: final idempotent hardening for the unified content flow.
-- This file keeps the database aligned without reintroducing legacy mock/preview paths.

alter table if exists content_groups
  add column if not exists auto_last_run_at timestamptz;

alter table if exists content_groups
  add column if not exists auto_next_run_at timestamptz;

alter table if exists content_groups
  add column if not exists auto_last_slot_key text;

alter table if exists content_groups
  add column if not exists auto_last_result text;

alter table if exists content_groups
  add column if not exists auto_last_error text;

alter table if exists content_campaigns
  add column if not exists sent_units_count int not null default 0;

alter table if exists content_campaigns
  add column if not exists last_msg_id bigint not null default 0;

alter table if exists content_topics
  add column if not exists last_msg_id bigint not null default 0;

alter table if exists queue_jobs
  add column if not exists account_id uuid references tg_accounts(id) on delete set null;

create index if not exists idx_content_groups_auto_next_run on content_groups(auto_enabled, auto_next_run_at);
create index if not exists idx_content_groups_auto_status on content_groups(status, auto_enabled, updated_at desc);
create index if not exists idx_content_campaigns_group_schedule on content_campaigns(group_id, schedule_enabled, next_run_at);
create index if not exists idx_campaign_runs_status_created_at on campaign_runs(status, created_at desc);
create index if not exists idx_queue_jobs_account_status_created_at on queue_jobs(account_id, status, created_at desc);
create index if not exists idx_content_events_created_at on content_events(created_at desc);

