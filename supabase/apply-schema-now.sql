-- =============================================================================
-- MIO BEAUTY SHOP — Master Schema Patch
-- Safe to run multiple times.  All statements use IF NOT EXISTS / ON CONFLICT.
-- Run in Supabase Dashboard → SQL Editor (paste and click Run).
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1.  FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users
    where auth_user_id = auth.uid() and active = true and role in ('owner','admin')
  );
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users
    where auth_user_id = auth.uid() and active = true and role = 'owner'
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_owner() from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_owner() to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2.  PRODUCTS — add columns that code expects
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.products
  add column if not exists barcode       text,
  add column if not exists weight        text,
  add column if not exists volume        text,
  add column if not exists sort_order    integer default 0,
  add column if not exists is_new        boolean default false,
  add column if not exists is_hit        boolean default false,
  add column if not exists usage_ru      text,
  add column if not exists usage_uz      text,
  add column if not exists ingredients_ru text,
  add column if not exists ingredients_uz text;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.  CATEGORIES — add columns that code expects
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.categories
  add column if not exists description     text,
  add column if not exists parent_id       bigint,
  add column if not exists sort_order      integer default 0,
  add column if not exists seo_title       text,
  add column if not exists seo_description text;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4.  BANNERS — add columns that code expects
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.banners
  add column if not exists mobile_image text,
  add column if not exists link         text,
  add column if not exists sort_order   integer default 0,
  add column if not exists updated_at   timestamptz default now();


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.  VIDEO_HIGHLIGHTS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.video_highlights (
  id          bigserial primary key,
  title       text not null,
  title_ru    text,
  title_uz    text,
  cover_image text,
  video_url   text,
  sort_order  integer default 0,
  active      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists video_highlights_active_sort_idx
  on public.video_highlights (active, sort_order, id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6.  ORDERS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.orders (
  id               bigserial primary key,
  order_number     text unique,
  customer_name    text not null default '',
  customer_phone   text not null default '',
  customer_city    text,
  customer_address text not null default '',
  customer_comment text,
  payment_method   text not null default 'cash_on_delivery',
  payment_status   text not null default 'pending',
  order_status     text not null default 'new',
  subtotal         numeric not null default 0,
  delivery_price   numeric not null default 0,
  total            numeric not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_order_number_idx on public.orders (order_number);
create index if not exists orders_customer_phone_idx on public.orders (customer_phone);
create index if not exists orders_created_at_idx on public.orders (created_at desc);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7.  ORDER_ITEMS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.order_items (
  id           bigserial primary key,
  order_id     bigint not null references public.orders(id) on delete cascade,
  product_id   bigint references public.products(id) on delete set null,
  product_name text not null default '',
  product_sku  text,
  product_image text,
  sku          text,
  quantity     integer not null default 1,
  unit_price   numeric not null default 0,
  price        numeric default 0,
  total_price  numeric not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8.  REVIEWS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.reviews (
  id            bigserial primary key,
  product_id    bigint not null references public.products(id) on delete cascade,
  customer_name text not null default '',
  rating        integer not null default 5,
  comment       text,
  active        boolean default false,
  created_at    timestamptz not null default now()
);

create index if not exists reviews_product_active_created_idx
  on public.reviews (product_id, active, created_at desc);


-- ─────────────────────────────────────────────────────────────────────────────
-- 9.  SECURITY_AUDIT_LOGS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.security_audit_logs (
  id                   bigserial primary key,
  event_type           text not null,
  actor_user_id        uuid,
  actor_admin_user_id  bigint,
  resource_type        text,
  resource_id          text,
  ip_address           text,
  user_agent           text,
  metadata             jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);

create index if not exists security_audit_logs_created_idx
  on public.security_audit_logs (created_at desc);
create index if not exists security_audit_logs_event_created_idx
  on public.security_audit_logs (event_type, created_at desc);


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. PRODUCT_IMAGES
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.product_images (
  id         bigserial primary key,
  product_id bigint references public.products(id) on delete cascade,
  image      text,
  image_url  text,
  url        text,
  path       text,
  sort_order integer default 0,
  active     boolean default true,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_sort_idx
  on public.product_images (product_id, sort_order, id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. BRANDS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.brands (
  id         bigserial primary key,
  name       text not null,
  slug       text,
  image      text,
  active     boolean default true,
  created_at timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. CUSTOMERS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.customers (
  id           bigserial primary key,
  name         text not null default '',
  phone        text,
  email        text,
  address      text,
  orders_count integer default 0,
  total_spent  numeric default 0,
  created_at   timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. PROMOTIONS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.promotions (
  id             bigserial primary key,
  title          text not null default '',
  discount_type  text,
  discount_value numeric,
  product_id     bigint references public.products(id) on delete set null,
  category_id    bigint references public.categories(id) on delete set null,
  start_date     date,
  end_date       date,
  active         boolean default true,
  created_at     timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 14. DELIVERY_SETTINGS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.delivery_settings (
  id                  bigserial primary key,
  region              text,
  city                text,
  delivery_price      numeric default 0,
  free_delivery_min   numeric default 0,
  delivery_text       text,
  active              boolean default true,
  created_at          timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 15. PAYMENT_SETTINGS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.payment_settings (
  id               bigserial primary key,
  method_key       text,
  method_name      text not null default '',
  instruction_text text,
  active           boolean default true,
  created_at       timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 16. SITE_SETTINGS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.site_settings (
  id                  bigserial primary key,
  logo                text,
  phone               text,
  email               text,
  address             text,
  instagram           text,
  telegram            text,
  youtube             text,
  footer_text         text,
  company_info        text,
  delivery_page_text  text,
  payment_page_text   text,
  created_at          timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 17. ROW LEVEL SECURITY — enable on every table
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'products','categories','banners','video_highlights','brands',
    'orders','order_items','reviews','customers','promotions',
    'delivery_settings','payment_settings','site_settings',
    'admin_users','product_images','security_audit_logs'
  ] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 18. RLS POLICIES — public read on storefront-visible tables
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  t text; pred text;
begin
  foreach t, pred in array array[
    array['products',          'active = true'],
    array['categories',        'active = true'],
    array['banners',           'active = true'],
    array['video_highlights',  'active = true'],
    array['brands',            'active = true']
  ] loop
    if to_regclass(format('public.%I', t)) is not null
      and not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = t
          and policyname = format('Public can read active %s', t)
      )
    then
      execute format(
        'create policy %I on public.%I for select to anon, authenticated using (%s)',
        format('Public can read active %s', t), t, pred
      );
    end if;
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 19. RLS POLICIES — admin full-access on all managed tables
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'products','categories','banners','video_highlights','brands',
    'orders','order_items','reviews','customers','promotions',
    'delivery_settings','payment_settings','site_settings','product_images'
  ] loop
    if to_regclass(format('public.%I', t)) is not null
      and not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = t
          and policyname = format('Admins can manage %s', t)
      )
    then
      execute format(
        'create policy %I on public.%I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())',
        format('Admins can manage %s', t), t
      );
    end if;
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 20. RLS POLICIES — admin_users (owners only)
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.admin_users') is not null then

    if not exists (select 1 from pg_policies where schemaname='public'
        and tablename='admin_users' and policyname='Admins can read own active admin profile')
    then
      create policy "Admins can read own active admin profile"
      on public.admin_users for select to authenticated
      using ((auth_user_id = auth.uid() and active = true) or public.is_admin());
    end if;

    if not exists (select 1 from pg_policies where schemaname='public'
        and tablename='admin_users' and policyname='Owners can manage admin users')
    then
      create policy "Owners can manage admin users"
      on public.admin_users for all to authenticated
      using (public.is_owner()) with check (public.is_owner());
    end if;

  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 21. RLS POLICIES — security_audit_logs (owners read, service-role write)
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.security_audit_logs') is not null then
    if not exists (select 1 from pg_policies where schemaname='public'
        and tablename='security_audit_logs' and policyname='Owners can read security audit logs')
    then
      create policy "Owners can read security audit logs"
      on public.security_audit_logs for select to authenticated
      using (public.is_owner());
    end if;
    if not exists (select 1 from pg_policies where schemaname='public'
        and tablename='security_audit_logs' and policyname='Owners can manage security audit logs')
    then
      create policy "Owners can manage security audit logs"
      on public.security_audit_logs for all to authenticated
      using (public.is_owner()) with check (public.is_owner());
    end if;
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 22. RLS POLICIES — reviews public read (active, last 90 days)
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.reviews') is not null
     and not exists (select 1 from pg_policies where schemaname='public'
         and tablename='reviews' and policyname='Public can read active recent reviews')
  then
    create policy "Public can read active recent reviews"
    on public.reviews for select to anon, authenticated
    using (active = true and created_at >= now() - interval '90 days');
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 23. RLS POLICIES — product_images public read
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.product_images') is not null
     and not exists (select 1 from pg_policies where schemaname='public'
         and tablename='product_images' and policyname='Public can read product images')
  then
    create policy "Public can read product images"
    on public.product_images for select to anon, authenticated
    using (active = true);
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 24. STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public) values
  ('products',                'products',                true),
  ('categories',              'categories',              true),
  ('banners',                 'banners',                 true),
  ('video-highlight-covers',  'video-highlight-covers',  true),
  ('video-highlight-videos',  'video-highlight-videos',  true)
on conflict (id) do update set public = excluded.public;


-- ─────────────────────────────────────────────────────────────────────────────
-- 25. STORAGE POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare b text;
begin
  foreach b in array array[
    'products','categories','banners','video-highlight-covers','video-highlight-videos'
  ] loop

    if not exists (select 1 from pg_policies where schemaname='storage'
        and tablename='objects' and policyname=format('Public can read %s bucket', b))
    then
      execute format(
        'create policy %I on storage.objects for select to anon, authenticated
         using (bucket_id = %L)',
        format('Public can read %s bucket', b), b
      );
    end if;

    if not exists (select 1 from pg_policies where schemaname='storage'
        and tablename='objects' and policyname=format('Admins can manage %s bucket', b))
    then
      execute format(
        'create policy %I on storage.objects for all to authenticated
         using (bucket_id = %L and public.is_admin())
         with check (bucket_id = %L and public.is_admin())',
        format('Admins can manage %s bucket', b), b, b
      );
    end if;

  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 26. REFRESH POSTGREST SCHEMA CACHE
-- ─────────────────────────────────────────────────────────────────────────────

notify pgrst, 'reload schema';
