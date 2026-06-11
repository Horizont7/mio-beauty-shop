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
      and role in ('owner', 'admin', 'manager', 'operator')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'products',
    'categories',
    'banners',
    'video_highlights',
    'brands',
    'orders',
    'order_items',
    'customers',
    'promotions',
    'reviews',
    'delivery_settings',
    'payment_settings',
    'site_settings',
    'admin_users',
    'product_images'
  ]
  loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format('alter table public.%I enable row level security', target_table);
    end if;
  end loop;
end $$;

do $$
declare
  item record;
begin
  for item in
    select * from (values
      ('products', 'active = true'),
      ('categories', 'active = true'),
      ('banners', 'active = true'),
      ('video_highlights', 'active = true'),
      ('brands', 'active = true')
    ) as policy(table_name, predicate)
  loop
    if to_regclass(format('public.%I', item.table_name)) is not null
      and not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = item.table_name
          and policyname = format('Public can read active %s', item.table_name)
      )
    then
      execute format(
        'create policy %I on public.%I for select to anon, authenticated using (%s)',
        format('Public can read active %s', item.table_name),
        item.table_name,
        item.predicate
      );
    end if;
  end loop;
end $$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'products',
    'categories',
    'banners',
    'video_highlights',
    'brands',
    'orders',
    'order_items',
    'customers',
    'promotions',
    'reviews',
    'delivery_settings',
    'payment_settings',
    'site_settings'
  ]
  loop
    if to_regclass(format('public.%I', target_table)) is not null
      and not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = target_table
          and policyname = format('Admins can manage %s', target_table)
      )
    then
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
        format('Admins can manage %s', target_table),
        target_table
      );
    end if;
  end loop;
end $$;

do $$
begin
  if to_regclass('public.admin_users') is not null then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'admin_users'
        and policyname = 'Admins can read own active admin profile'
    ) then
      create policy "Admins can read own active admin profile"
      on public.admin_users
      for select
      to authenticated
      using ((auth_user_id = auth.uid() and active = true) or public.is_admin());
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'admin_users'
        and policyname = 'Admins can manage admin users'
    ) then
      create policy "Admins can manage admin users"
      on public.admin_users
      for all
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.product_images') is not null then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'product_images'
        and policyname = 'Public can read product images'
    ) then
      create policy "Public can read product images"
      on public.product_images
      for select
      to anon, authenticated
      using (true);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'product_images'
        and policyname = 'Admins can manage product images'
    ) then
      create policy "Admins can manage product images"
      on public.product_images
      for all
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
    end if;
  end if;
end $$;

insert into storage.buckets (id, name, public)
values
  ('products', 'products', true),
  ('categories', 'categories', true),
  ('banners', 'banners', true),
  ('video-highlight-covers', 'video-highlight-covers', true),
  ('video-highlight-videos', 'video-highlight-videos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Authenticated users can manage video highlight covers"
on storage.objects;
drop policy if exists "Authenticated users can manage video highlight videos"
on storage.objects;

do $$
declare
  bucket_name text;
begin
  foreach bucket_name in array array[
    'products',
    'categories',
    'banners',
    'video-highlight-covers',
    'video-highlight-videos'
  ]
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = format('Public can read %s bucket', bucket_name)
    ) then
      execute format(
        'create policy %I on storage.objects for select to anon, authenticated using (bucket_id = %L)',
        format('Public can read %s bucket', bucket_name),
        bucket_name
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = format('Admins can manage %s bucket', bucket_name)
    ) then
      execute format(
        'create policy %I on storage.objects for all to authenticated using (bucket_id = %L and public.is_admin()) with check (bucket_id = %L and public.is_admin())',
        format('Admins can manage %s bucket', bucket_name),
        bucket_name,
        bucket_name
      );
    end if;
  end loop;
end $$;
