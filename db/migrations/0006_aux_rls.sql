alter table if exists schema_migrations enable row level security;

drop policy if exists "schema_migrations_owner_read" on schema_migrations;
create policy "schema_migrations_owner_read" on schema_migrations
  for select using (public.is_app_role('owner'));

drop policy if exists "schema_migrations_owner_write" on schema_migrations;
create policy "schema_migrations_owner_write" on schema_migrations
  for all using (public.is_app_role('owner'));

drop policy if exists "audit_logs_admin_read" on audit_logs;
create policy "audit_logs_admin_read" on audit_logs
  for select using (public.is_app_role('owner', 'admin'));

drop policy if exists "audit_logs_admin_write" on audit_logs;
create policy "audit_logs_admin_write" on audit_logs
  for insert with check (public.is_app_role('owner', 'admin'));

drop policy if exists "tg_accounts_admin_write" on tg_accounts;
create policy "tg_accounts_admin_write" on tg_accounts
  for insert with check (public.is_app_role('owner', 'admin'));

drop policy if exists "content_events_admin_write" on content_events;
create policy "content_events_admin_write" on content_events
  for insert with check (public.is_app_role('owner', 'admin'));

drop policy if exists "queue_jobs_admin_write" on queue_jobs;
create policy "queue_jobs_admin_write" on queue_jobs
  for insert with check (public.is_app_role('owner', 'admin'));

drop policy if exists "settings_admin_write" on settings;
create policy "settings_admin_write" on settings
  for insert with check (public.is_app_role('owner', 'admin'));

