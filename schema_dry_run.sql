-- Schema reconciliation dry-run
-- Missing tables: none

-- campaign_runs.result
alter table if exists campaign_runs
  add column if not exists result jsonb;

alter table if exists campaign_runs
  alter column result set default '{}'::jsonb;

-- content_campaigns.last_target_post_id
alter table if exists content_campaigns
  add column if not exists last_target_post_id bigint not null default 0;
