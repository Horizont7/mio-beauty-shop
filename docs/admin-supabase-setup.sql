-- Safe setup suggestions for optional MIO Beauty admin modules.
-- Review before running in Supabase SQL editor.
-- These statements do not delete existing data.

create table if not exists public.orders (
  id bigserial primary key,
  customer_name text,
  phone text,
  address text,
  total_price numeric default 0,
  status text default 'new' check (status in ('new', 'accepted', 'packing', 'delivering', 'completed', 'cancelled')),
  payment_method text,
  delivery_method text,
  created_at timestamptz default now()
);

create table if not exists public.order_items (
  id bigserial primary key,
  order_id bigint references public.orders(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  sku text,
  product_name text,
  quantity integer default 1,
  price numeric default 0,
  total_price numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.customers (
  id bigserial primary key,
  name text,
  phone text,
  email text,
  address text,
  orders_count integer default 0,
  total_spent numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.promotions (
  id bigserial primary key,
  title text not null,
  discount_type text default 'percentage' check (discount_type in ('percentage', 'fixed')),
  discount_value numeric default 0,
  product_id bigint references public.products(id) on delete set null,
  category_id bigint references public.categories(id) on delete set null,
  start_date date,
  end_date date,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.brands (
  id bigserial primary key,
  name text not null,
  slug text unique not null,
  image text,
  active boolean default true,
  created_at timestamptz default now()
);

insert into public.brands (name, slug, active)
values
  ('MIO BEAUTY', 'mio-beauty', true),
  ('MIO BABY', 'mio-baby', true),
  ('MIO HOME', 'mio-home', true),
  ('SHINESKIN', 'shineskin', true)
on conflict (slug) do nothing;

create table if not exists public.reviews (
  id bigserial primary key,
  product_id bigint references public.products(id) on delete cascade,
  customer_name text,
  rating integer check (rating between 1 and 5),
  text text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

create table if not exists public.delivery_settings (
  id bigserial primary key,
  region text,
  city text,
  delivery_price numeric default 0,
  free_delivery_min numeric default 0,
  delivery_text text,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.payment_settings (
  id bigserial primary key,
  method_key text,
  method_name text,
  instruction_text text,
  active boolean default true,
  created_at timestamptz default now()
);

insert into public.payment_settings (method_key, method_name, active)
values
  ('cash', 'Cash', true),
  ('card', 'Card', true),
  ('payme', 'Payme', false),
  ('click', 'Click', false),
  ('uzum', 'Uzum', false)
on conflict do nothing;

create table if not exists public.site_settings (
  id bigserial primary key,
  logo text,
  phone text,
  email text,
  address text,
  instagram text,
  telegram text,
  youtube text,
  footer_text text,
  company_info text,
  delivery_page_text text,
  payment_page_text text,
  created_at timestamptz default now()
);

create table if not exists public.admin_users (
  id bigserial primary key,
  auth_user_id uuid,
  email text unique not null,
  full_name text,
  role text default 'operator' check (role in ('owner', 'admin', 'manager', 'operator')),
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.video_highlights (
  id bigserial primary key,
  title text not null,
  title_ru text,
  title_uz text,
  cover_image text,
  video_url text,
  sort_order integer default 0,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.video_highlights
  add column if not exists title_ru text,
  add column if not exists title_uz text;

create index if not exists video_highlights_active_sort_idx
  on public.video_highlights (active, sort_order, id);

insert into storage.buckets (id, name, public)
values
  ('video-highlight-covers', 'video-highlight-covers', true),
  ('video-highlight-videos', 'video-highlight-videos', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read video highlight covers'
  ) then
    create policy "Public can read video highlight covers"
    on storage.objects for select
    using (bucket_id = 'video-highlight-covers');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read video highlight videos'
  ) then
    create policy "Public can read video highlight videos"
    on storage.objects for select
    using (bucket_id = 'video-highlight-videos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can manage video highlight covers'
  ) then
    create policy "Authenticated users can manage video highlight covers"
    on storage.objects for all
    to authenticated
    using (bucket_id = 'video-highlight-covers')
    with check (bucket_id = 'video-highlight-covers');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can manage video highlight videos'
  ) then
    create policy "Authenticated users can manage video highlight videos"
    on storage.objects for all
    to authenticated
    using (bucket_id = 'video-highlight-videos')
    with check (bucket_id = 'video-highlight-videos');
  end if;
end $$;
