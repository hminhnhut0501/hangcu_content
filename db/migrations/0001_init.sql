create extension if not exists pgcrypto;

create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tg_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  api_id bigint,
  api_hash text,
  phone text,
  session_ref text,
  is_active boolean not null default false,
  status text not null default 'unverified',
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  tg_chat_id text not null unique,
  username text,
  title text not null,
  chat_type text not null default 'channel',
  is_active boolean not null default true,
  source_status text not null default 'unchecked',
  can_forward boolean not null default true,
  noforwards boolean not null default false,
  is_admin boolean not null default false,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_key text,
  source_link text,
  target_link text,
  auto_enabled boolean not null default false,
  auto_slots text not null default '',
  auto_pick_count int not null default 1,
  auto_strategy text not null default 'round_robin',
  auto_next_run_at timestamptz,
  auto_last_run_at timestamptz,
  auto_last_slot_key text,
  auto_last_result text,
  auto_last_error text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content_topics (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references content_groups(id) on delete cascade,
  name text not null,
  source_topic_id bigint,
  target_topic_id bigint,
  target_link_seed text,
  last_msg_id bigint not null default 0,
  sort_order int not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content_campaigns (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references content_groups(id) on delete cascade,
  topic_id uuid not null references content_topics(id) on delete cascade,
  title text not null,
  source_start_link text,
  source_end_link text,
  follow_latest boolean not null default true,
  target_link text,
  caption text,
  group_mode text not null default 'keep',
  order_mode text not null default 'auto',
  batch_size int not null default 1,
  delay_min int not null default 1,
  delay_max int not null default 7,
  enabled boolean not null default true,
  status text not null default 'draft',
  schedule_enabled boolean not null default false,
  schedule_slots text not null default '',
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_result text,
  last_msg_id bigint not null default 0,
  sent_count int not null default 0,
  sent_units_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists campaign_runs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references content_campaigns(id) on delete cascade,
  slot_key text not null,
  scheduled_at timestamptz,
  status text not null default 'pending',
  selected_topic_ids jsonb,
  queued_items int not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, slot_key)
);

create table if not exists queue_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  group_id uuid,
  topic_id uuid,
  campaign_id uuid,
  priority int not null default 100,
  status text not null default 'pending',
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  attempts int not null default 0,
  max_attempts int not null default 3,
  locked_by text,
  locked_at timestamptz,
  last_error text,
  payload jsonb,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content_events (
  id bigserial primary key,
  group_id uuid,
  topic_id uuid,
  campaign_id uuid,
  level text not null default 'info',
  code text not null default '',
  message text not null default '',
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id bigserial primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_content_groups_status_created_at on content_groups(status, created_at desc);
create index if not exists idx_content_topics_group_sort on content_topics(group_id, sort_order, created_at desc);
create index if not exists idx_content_campaigns_topic_enabled_next_run on content_campaigns(topic_id, enabled, next_run_at);
create index if not exists idx_queue_jobs_status_scheduled_priority on queue_jobs(status, scheduled_at, priority);
create index if not exists idx_content_events_group_created_at on content_events(group_id, created_at desc);
create index if not exists idx_content_events_campaign_created_at on content_events(campaign_id, created_at desc);

