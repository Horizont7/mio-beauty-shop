-- Run in the Supabase SQL editor after applying
-- supabase/migrations/20260612000000_admin_security_rls.sql.

-- 1. RLS should be enabled for storefront/admin tables.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'products',
    'categories',
    'banners',
    'video_highlights',
    'admin_users',
    'product_images'
  )
order by tablename;

-- 2. Confirm admin/public policies exist.
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where (schemaname = 'public' and tablename in (
    'products',
    'categories',
    'banners',
    'video_highlights',
    'admin_users',
    'product_images'
  ))
  or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

-- 3. This should be false/null when run without an authenticated admin JWT.
select public.is_admin() as current_request_is_admin;

-- 4. Public storefront reads should only expose active records through anon.
-- Verify in the app by logging out, then opening:
-- /catalog/products, /catalog/categories, /, /b2b

-- 5. Non-admin authenticated users should fail insert/update/delete on:
-- products, categories, banners, video_highlights and protected storage buckets.
