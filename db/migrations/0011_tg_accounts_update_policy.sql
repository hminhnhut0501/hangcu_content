alter table if exists tg_accounts enable row level security;

drop policy if exists "tg_accounts_write" on tg_accounts;
create policy "tg_accounts_write" on tg_accounts
  for all
  using (public.is_app_role('owner', 'admin'))
  with check (public.is_app_role('owner', 'admin'));

drop policy if exists "tg_accounts_admin_write" on tg_accounts;
create policy "tg_accounts_admin_write" on tg_accounts
  for insert
  with check (public.is_app_role('owner', 'admin'));
