alter table public.products
  add column if not exists usage_ru text,
  add column if not exists usage_uz text,
  add column if not exists ingredients_ru text,
  add column if not exists ingredients_uz text;

create table if not exists public.orders (
  id bigserial primary key,
  order_number text unique not null,
  customer_name text not null,
  customer_phone text not null,
  customer_city text,
  customer_address text not null,
  customer_comment text,
  payment_method text not null default 'cash_on_delivery',
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'cancelled')),
  order_status text not null default 'new'
    check (order_status in ('new', 'processing', 'shipped', 'delivered', 'cancelled')),
  subtotal numeric not null default 0,
  delivery_price numeric not null default 0,
  total numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists order_number text,
  add column if not exists customer_phone text,
  add column if not exists customer_city text,
  add column if not exists customer_address text,
  add column if not exists customer_comment text,
  add column if not exists payment_status text default 'pending',
  add column if not exists order_status text default 'new',
  add column if not exists subtotal numeric default 0,
  add column if not exists delivery_price numeric default 0,
  add column if not exists total numeric default 0,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.order_items (
  id bigserial primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  product_name text not null,
  product_sku text,
  product_image text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric not null default 0,
  total_price numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.order_items
  add column if not exists product_name text,
  add column if not exists product_sku text,
  add column if not exists product_image text,
  add column if not exists unit_price numeric default 0,
  add column if not exists total_price numeric default 0;

create table if not exists public.reviews (
  id bigserial primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  customer_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  active boolean default false,
  created_at timestamptz not null default now()
);

alter table public.reviews
  add column if not exists comment text,
  add column if not exists active boolean default false;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reviews'
      and column_name = 'text'
  ) then
    update public.reviews
    set comment = coalesce(comment, text)
    where comment is null;
  end if;
end $$;

create index if not exists orders_order_number_idx
  on public.orders (order_number);
create index if not exists orders_customer_phone_idx
  on public.orders (customer_phone);
create index if not exists order_items_order_id_idx
  on public.order_items (order_id);
create index if not exists reviews_product_active_created_idx
  on public.reviews (product_id, active, created_at desc);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;

do $$
declare
  target_table text;
begin
  foreach target_table in array array['orders', 'order_items', 'reviews']
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname = format('Admins can manage %s', target_table)
    ) then
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
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reviews'
      and policyname = 'Public can read active recent reviews'
  ) then
    create policy "Public can read active recent reviews"
    on public.reviews
    for select
    to anon, authenticated
    using (active = true and created_at >= now() - interval '90 days');
  end if;
end $$;

create or replace function public.cleanup_old_reviews()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.reviews
  where created_at < now() - interval '90 days';
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'cleanup-old-mio-reviews',
      '0 3 * * *',
      'select public.cleanup_old_reviews();'
    )
    where not exists (
      select 1 from cron.job where jobname = 'cleanup-old-mio-reviews'
    );
  end if;
end $$;
