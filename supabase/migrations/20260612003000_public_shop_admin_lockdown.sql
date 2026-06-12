create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where auth_user_id = auth.uid()
      and active = true
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where auth_user_id = auth.uid()
      and active = true
      and role = 'owner'
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_owner() from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_owner() to authenticated;

do $$
begin
  if to_regclass('public.admin_users') is not null then
    update public.admin_users
    set role = 'admin'
    where role in ('operator', 'manager', 'content_manager');

    alter table public.admin_users
      drop constraint if exists admin_users_role_check;

    alter table public.admin_users
      add constraint admin_users_role_check
      check (role in ('owner', 'admin'));
  end if;
end $$;

alter table if exists public.admin_users enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.categories enable row level security;
alter table if exists public.banners enable row level security;
alter table if exists public.video_highlights enable row level security;
alter table if exists public.reviews enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;
alter table if exists public.site_settings enable row level security;
alter table if exists public.security_audit_logs enable row level security;

drop policy if exists "Admins can manage admin users" on public.admin_users;
drop policy if exists "Owners can manage admin users" on public.admin_users;

create policy "Owners can manage admin users"
on public.admin_users
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());
