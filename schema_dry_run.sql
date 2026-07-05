-- Schema reconciliation dry-run
-- Missing tables: audit_logs, campaign_runs, content_campaigns, content_events, content_groups, content_topics, profiles, queue_jobs, settings, tg_accounts

-- tg_accounts.api_hash
alter table if exists tg_accounts add column if not exists api_hash text;

-- tg_accounts.api_id
alter table if exists tg_accounts add column if not exists api_id bigint;

-- tg_accounts.created_at
alter table if exists tg_accounts add column if not exists created_at timestamptz not null default now();

-- tg_accounts.daily_job_count
alter table if exists tg_accounts add column if not exists daily_job_count int not null default 0;

-- tg_accounts.daily_job_limit
alter table if exists tg_accounts add column if not exists daily_job_limit int not null default 30;

-- tg_accounts.daily_job_reset_at
alter table if exists tg_accounts add column if not exists daily_job_reset_at timestamptz;

-- tg_accounts.id
alter table if exists tg_accounts add column if not exists id uuid primary key default gen_random_uuid();

-- tg_accounts.is_active
alter table if exists tg_accounts add column if not exists is_active boolean not null default false;

-- tg_accounts.last_checked_at
alter table if exists tg_accounts add column if not exists last_checked_at timestamptz;

-- tg_accounts.last_error
alter table if exists tg_accounts add column if not exists last_error text;

-- tg_accounts.name
alter table if exists tg_accounts add column if not exists name text not null;

-- tg_accounts.phone
alter table if exists tg_accounts add column if not exists phone text;

-- tg_accounts.session_ref
alter table if exists tg_accounts add column if not exists session_ref text;

-- tg_accounts.status
alter table if exists tg_accounts add column if not exists status text not null default 'unverified';

-- tg_accounts.updated_at
alter table if exists tg_accounts add column if not exists updated_at timestamptz not null default now();

-- queue_jobs.account_id
alter table if exists queue_jobs add column if not exists account_id uuid references tg_accounts(id) on delete set null;

-- queue_jobs.attempts
alter table if exists queue_jobs add column if not exists attempts int not null default 0;

-- queue_jobs.campaign_id
alter table if exists queue_jobs add column if not exists campaign_id uuid;

-- queue_jobs.created_at
alter table if exists queue_jobs add column if not exists created_at timestamptz not null default now();

-- queue_jobs.finished_at
alter table if exists queue_jobs add column if not exists finished_at timestamptz;

-- queue_jobs.group_id
alter table if exists queue_jobs add column if not exists group_id uuid;

-- queue_jobs.id
alter table if exists queue_jobs add column if not exists id uuid primary key default gen_random_uuid();

-- queue_jobs.job_type
alter table if exists queue_jobs add column if not exists job_type text not null;

-- queue_jobs.last_error
alter table if exists queue_jobs add column if not exists last_error text;

-- queue_jobs.locked_at
alter table if exists queue_jobs add column if not exists locked_at timestamptz;

-- queue_jobs.locked_by
alter table if exists queue_jobs add column if not exists locked_by text;

-- queue_jobs.max_attempts
alter table if exists queue_jobs add column if not exists max_attempts int not null default 3;

-- queue_jobs.payload
alter table if exists queue_jobs add column if not exists payload jsonb;

-- queue_jobs.priority
alter table if exists queue_jobs add column if not exists priority int not null default 100;

-- queue_jobs.result
alter table if exists queue_jobs add column if not exists result jsonb;

-- queue_jobs.scheduled_at
alter table if exists queue_jobs add column if not exists scheduled_at timestamptz;

-- queue_jobs.started_at
alter table if exists queue_jobs add column if not exists started_at timestamptz;

-- queue_jobs.status
alter table if exists queue_jobs add column if not exists status text not null default 'pending';

-- queue_jobs.topic_id
alter table if exists queue_jobs add column if not exists topic_id uuid;

-- queue_jobs.updated_at
alter table if exists queue_jobs add column if not exists updated_at timestamptz not null default now();

-- content_groups.auto_enabled
alter table if exists content_groups add column if not exists auto_enabled boolean not null default false;

-- content_groups.auto_last_error
alter table if exists content_groups add column if not exists auto_last_error text;

-- content_groups.auto_last_result
alter table if exists content_groups add column if not exists auto_last_result text;

-- content_groups.auto_last_run_at
alter table if exists content_groups add column if not exists auto_last_run_at timestamptz;

-- content_groups.auto_last_slot_key
alter table if exists content_groups add column if not exists auto_last_slot_key text;

-- content_groups.auto_next_run_at
alter table if exists content_groups add column if not exists auto_next_run_at timestamptz;

-- content_groups.auto_pick_count
alter table if exists content_groups add column if not exists auto_pick_count int not null default 1;

-- content_groups.auto_slots
alter table if exists content_groups add column if not exists auto_slots text not null default '';

-- content_groups.auto_strategy
alter table if exists content_groups add column if not exists auto_strategy text not null default 'round_robin';

-- content_groups.created_at
alter table if exists content_groups add column if not exists created_at timestamptz not null default now();

-- content_groups.id
alter table if exists content_groups add column if not exists id uuid primary key default gen_random_uuid();

-- content_groups.name
alter table if exists content_groups add column if not exists name text not null;

-- content_groups.source_key
alter table if exists content_groups add column if not exists source_key text;

-- content_groups.source_link
alter table if exists content_groups add column if not exists source_link text;

-- content_groups.status
alter table if exists content_groups add column if not exists status text not null default 'active';

-- content_groups.target_link
alter table if exists content_groups add column if not exists target_link text;

-- content_groups.updated_at
alter table if exists content_groups add column if not exists updated_at timestamptz not null default now();

-- content_topics.created_at
alter table if exists content_topics add column if not exists created_at timestamptz not null default now();

-- content_topics.group_id
alter table if exists content_topics add column if not exists group_id uuid not null references content_groups(id) on delete cascade;

-- content_topics.id
alter table if exists content_topics add column if not exists id uuid primary key default gen_random_uuid();

-- content_topics.last_msg_id
alter table if exists content_topics add column if not exists last_msg_id bigint not null default 0;

-- content_topics.name
alter table if exists content_topics add column if not exists name text not null;

-- content_topics.sort_order
alter table if exists content_topics add column if not exists sort_order int not null default 0;

-- content_topics.source_topic_id
alter table if exists content_topics add column if not exists source_topic_id bigint;

-- content_topics.status
alter table if exists content_topics add column if not exists status text not null default 'active';

-- content_topics.target_link_seed
alter table if exists content_topics add column if not exists target_link_seed text;

-- content_topics.target_topic_id
alter table if exists content_topics add column if not exists target_topic_id bigint;

-- content_topics.updated_at
alter table if exists content_topics add column if not exists updated_at timestamptz not null default now();

-- content_campaigns.batch_size
alter table if exists content_campaigns add column if not exists batch_size int not null default 1;

-- content_campaigns.caption
alter table if exists content_campaigns add column if not exists caption text;

-- content_campaigns.created_at
alter table if exists content_campaigns add column if not exists created_at timestamptz not null default now();

-- content_campaigns.delay_max
alter table if exists content_campaigns add column if not exists delay_max int not null default 7;

-- content_campaigns.delay_min
alter table if exists content_campaigns add column if not exists delay_min int not null default 1;

-- content_campaigns.enabled
alter table if exists content_campaigns add column if not exists enabled boolean not null default true;

-- content_campaigns.follow_latest
alter table if exists content_campaigns add column if not exists follow_latest boolean not null default true;

-- content_campaigns.group_id
alter table if exists content_campaigns add column if not exists group_id uuid not null references content_groups(id) on delete cascade;

-- content_campaigns.group_mode
alter table if exists content_campaigns add column if not exists group_mode text not null default 'keep';

-- content_campaigns.id
alter table if exists content_campaigns add column if not exists id uuid primary key default gen_random_uuid();

-- content_campaigns.last_msg_id
alter table if exists content_campaigns add column if not exists last_msg_id bigint not null default 0;

-- content_campaigns.last_result
alter table if exists content_campaigns add column if not exists last_result text;

-- content_campaigns.last_run_at
alter table if exists content_campaigns add column if not exists last_run_at timestamptz;

-- content_campaigns.next_run_at
alter table if exists content_campaigns add column if not exists next_run_at timestamptz;

-- content_campaigns.order_mode
alter table if exists content_campaigns add column if not exists order_mode text not null default 'auto';

-- content_campaigns.schedule_enabled
alter table if exists content_campaigns add column if not exists schedule_enabled boolean not null default false;

-- content_campaigns.schedule_slots
alter table if exists content_campaigns add column if not exists schedule_slots text not null default '';

-- content_campaigns.sent_count
alter table if exists content_campaigns add column if not exists sent_count int not null default 0;

-- content_campaigns.sent_units_count
alter table if exists content_campaigns add column if not exists sent_units_count int not null default 0;

-- content_campaigns.source_end_link
alter table if exists content_campaigns add column if not exists source_end_link text;

-- content_campaigns.source_start_link
alter table if exists content_campaigns add column if not exists source_start_link text;

-- content_campaigns.status
alter table if exists content_campaigns add column if not exists status text not null default 'draft';

-- content_campaigns.target_link
alter table if exists content_campaigns add column if not exists target_link text;

-- content_campaigns.title
alter table if exists content_campaigns add column if not exists title text not null;

-- content_campaigns.topic_id
alter table if exists content_campaigns add column if not exists topic_id uuid not null references content_topics(id) on delete cascade;

-- content_campaigns.updated_at
alter table if exists content_campaigns add column if not exists updated_at timestamptz not null default now();

-- settings.key
alter table if exists settings add column if not exists key text primary key;

-- settings.updated_at
alter table if exists settings add column if not exists updated_at timestamptz not null default now();

-- settings.value
alter table if exists settings add column if not exists value jsonb not null;

-- profiles.created_at
alter table if exists profiles add column if not exists created_at timestamptz not null default now();

-- profiles.full_name
alter table if exists profiles add column if not exists full_name text;

-- profiles.id
alter table if exists profiles add column if not exists id uuid primary key references auth.users(id) on delete cascade;

-- profiles.role
alter table if exists profiles add column if not exists role text not null default 'owner';

-- profiles.updated_at
alter table if exists profiles add column if not exists updated_at timestamptz not null default now();

-- campaign_runs.campaign_id
alter table if exists campaign_runs add column if not exists campaign_id uuid not null references content_campaigns(id) on delete cascade;

-- campaign_runs.created_at
alter table if exists campaign_runs add column if not exists created_at timestamptz not null default now();

-- campaign_runs.finished_at
alter table if exists campaign_runs add column if not exists finished_at timestamptz;

-- campaign_runs.id
alter table if exists campaign_runs add column if not exists id uuid primary key default gen_random_uuid();

-- campaign_runs.last_error
alter table if exists campaign_runs add column if not exists last_error text;

-- campaign_runs.queued_items
alter table if exists campaign_runs add column if not exists queued_items int not null default 0;

-- campaign_runs.scheduled_at
alter table if exists campaign_runs add column if not exists scheduled_at timestamptz;

-- campaign_runs.selected_topic_ids
alter table if exists campaign_runs add column if not exists selected_topic_ids jsonb;

-- campaign_runs.slot_key
alter table if exists campaign_runs add column if not exists slot_key text not null;

-- campaign_runs.started_at
alter table if exists campaign_runs add column if not exists started_at timestamptz;

-- campaign_runs.status
alter table if exists campaign_runs add column if not exists status text not null default 'pending';

-- campaign_runs.updated_at
alter table if exists campaign_runs add column if not exists updated_at timestamptz not null default now();

-- content_events.campaign_id
alter table if exists content_events add column if not exists campaign_id uuid;

-- content_events.code
alter table if exists content_events add column if not exists code text not null default '';

-- content_events.created_at
alter table if exists content_events add column if not exists created_at timestamptz not null default now();

-- content_events.group_id
alter table if exists content_events add column if not exists group_id uuid;

-- content_events.id
alter table if exists content_events add column if not exists id bigserial primary key;

-- content_events.level
alter table if exists content_events add column if not exists level text not null default 'info';

-- content_events.message
alter table if exists content_events add column if not exists message text not null default '';

-- content_events.payload
alter table if exists content_events add column if not exists payload jsonb;

-- content_events.topic_id
alter table if exists content_events add column if not exists topic_id uuid;

-- audit_logs.action
alter table if exists audit_logs add column if not exists action text not null;

-- audit_logs.actor_id
alter table if exists audit_logs add column if not exists actor_id uuid references auth.users(id);

-- audit_logs.created_at
alter table if exists audit_logs add column if not exists created_at timestamptz not null default now();

-- audit_logs.entity_id
alter table if exists audit_logs add column if not exists entity_id text;

-- audit_logs.entity_type
alter table if exists audit_logs add column if not exists entity_type text not null;

-- audit_logs.id
alter table if exists audit_logs add column if not exists id bigserial primary key;

-- audit_logs.metadata
alter table if exists audit_logs add column if not exists metadata jsonb;

