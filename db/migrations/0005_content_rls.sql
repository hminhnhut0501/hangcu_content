create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(
    (select p.role::text from public.profiles p where p.id = auth.uid() limit 1),
    'viewer'
  );
$$;

create or replace function public.is_app_role(variadic var_args text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    where public.current_app_role() = any (var_args)
  );
$$;

alter table if exists content_groups enable row level security;
alter table if exists content_topics enable row level security;
alter table if exists content_campaigns enable row level security;
alter table if exists campaign_runs enable row level security;
alter table if exists queue_jobs enable row level security;
alter table if exists content_events enable row level security;
alter table if exists settings enable row level security;
alter table if exists tg_accounts enable row level security;
alter table if exists audit_logs enable row level security;

drop policy if exists "content_groups_read" on content_groups;
create policy "content_groups_read" on content_groups
  for select using (auth.uid() is not null);

drop policy if exists "content_groups_write" on content_groups;
create policy "content_groups_write" on content_groups
  for all using (public.is_app_role('owner', 'admin', 'editor'));

drop policy if exists "content_topics_read" on content_topics;
create policy "content_topics_read" on content_topics
  for select using (auth.uid() is not null);

drop policy if exists "content_topics_write" on content_topics;
create policy "content_topics_write" on content_topics
  for all using (public.is_app_role('owner', 'admin', 'editor'));

drop policy if exists "content_campaigns_read" on content_campaigns;
create policy "content_campaigns_read" on content_campaigns
  for select using (auth.uid() is not null);

drop policy if exists "content_campaigns_write" on content_campaigns;
create policy "content_campaigns_write" on content_campaigns
  for all using (public.is_app_role('owner', 'admin', 'editor'));

drop policy if exists "campaign_runs_read" on campaign_runs;
create policy "campaign_runs_read" on campaign_runs
  for select using (auth.uid() is not null);

drop policy if exists "campaign_runs_write" on campaign_runs;
create policy "campaign_runs_write" on campaign_runs
  for all using (public.is_app_role('owner', 'admin', 'editor'));

drop policy if exists "queue_jobs_read" on queue_jobs;
create policy "queue_jobs_read" on queue_jobs
  for select using (auth.uid() is not null);

drop policy if exists "queue_jobs_write" on queue_jobs;
create policy "queue_jobs_write" on queue_jobs
  for all using (public.is_app_role('owner', 'admin'));

drop policy if exists "content_events_read" on content_events;
create policy "content_events_read" on content_events
  for select using (auth.uid() is not null);

drop policy if exists "content_events_write" on content_events;
create policy "content_events_write" on content_events
  for all using (public.is_app_role('owner', 'admin'));

drop policy if exists "settings_read" on settings;
create policy "settings_read" on settings
  for select using (public.is_app_role('owner', 'admin'));

drop policy if exists "settings_write" on settings;
create policy "settings_write" on settings
  for all using (public.is_app_role('owner', 'admin'));

drop policy if exists "tg_accounts_read" on tg_accounts;
create policy "tg_accounts_read" on tg_accounts
  for select using (public.is_app_role('owner', 'admin', 'editor'));

drop policy if exists "tg_accounts_write" on tg_accounts;
create policy "tg_accounts_write" on tg_accounts
  for all using (public.is_app_role('owner', 'admin'));

drop policy if exists "audit_logs_read" on audit_logs;
create policy "audit_logs_read" on audit_logs
  for select using (public.is_app_role('owner', 'admin'));
