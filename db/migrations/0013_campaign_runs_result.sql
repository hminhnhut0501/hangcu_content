alter table if exists campaign_runs
  add column if not exists result jsonb;

alter table if exists campaign_runs
  alter column result set default '{}'::jsonb;
