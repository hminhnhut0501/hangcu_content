create or replace function public.get_app_role_for_user(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role::text from public.profiles p where p.id = target_user_id limit 1),
    'viewer'
  );
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select public.get_app_role_for_user(auth.uid());
$$;

drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles
  for all using (
    public.get_app_role_for_user(auth.uid()) in ('owner', 'admin')
  );
