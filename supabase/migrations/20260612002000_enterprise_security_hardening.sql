create table if not exists public.security_audit_logs (
  id bigserial primary key,
  event_type text not null,
  actor_user_id uuid,
  actor_admin_user_id bigint,
  resource_type text,
  resource_id text,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.security_audit_logs enable row level security;

create index if not exists security_audit_logs_created_idx
  on public.security_audit_logs (created_at desc);

create index if not exists security_audit_logs_event_created_idx
  on public.security_audit_logs (event_type, created_at desc);

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
      and role in ('owner', 'admin', 'manager', 'content_manager')
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
    set role = 'content_manager'
    where role = 'operator';
  end if;
end $$;

drop policy if exists "Admins can manage admin users" on public.admin_users;
drop policy if exists "Owners can manage admin users" on public.admin_users;

create policy "Owners can manage admin users"
on public.admin_users
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "Owners can read security audit logs" on public.security_audit_logs;
drop policy if exists "Service role can write security audit logs" on public.security_audit_logs;

create policy "Owners can read security audit logs"
on public.security_audit_logs
for select
to authenticated
using (public.is_owner());

create policy "Owners can manage security audit logs"
on public.security_audit_logs
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());
