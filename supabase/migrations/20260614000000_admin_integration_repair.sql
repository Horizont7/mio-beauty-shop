alter table public.orders
  add column if not exists customer_id bigint,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists total_price numeric default 0,
  add column if not exists status text default 'new',
  add column if not exists delivery_method text,
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

update public.orders
set
  order_number = coalesce(order_number, 'MIO-' || id::text),
  customer_phone = coalesce(nullif(customer_phone, ''), phone),
  customer_address = coalesce(nullif(customer_address, ''), address),
  order_status = case coalesce(status, order_status)
    when 'accepted' then 'processing'
    when 'packing' then 'processing'
    when 'delivering' then 'shipped'
    when 'completed' then 'delivered'
    else coalesce(status, order_status, 'new')
  end,
  subtotal = case when coalesce(subtotal, 0) = 0 then coalesce(total_price, 0) else subtotal end,
  total = case when coalesce(total, 0) = 0 then coalesce(total_price, 0) else total end
where
  order_number is null
  or customer_phone is null
  or customer_address is null
  or coalesce(subtotal, 0) = 0
  or coalesce(total, 0) = 0;

create unique index if not exists orders_order_number_idx
  on public.orders (order_number);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_customer_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_customer_id_fkey
      foreign key (customer_id)
      references public.customers(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'products_category_id_fkey'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_category_id_fkey
      foreign key (category_id)
      references public.categories(id)
      on delete set null
      not valid;
  end if;
end $$;

alter table public.order_items
  add column if not exists product_sku text,
  add column if not exists product_image text,
  add column if not exists sku text,
  add column if not exists unit_price numeric default 0,
  add column if not exists price numeric default 0,
  add column if not exists total_price numeric default 0;

update public.order_items
set
  product_sku = coalesce(product_sku, sku),
  sku = coalesce(sku, product_sku),
  unit_price = case when coalesce(unit_price, 0) = 0 then coalesce(price, 0) else unit_price end,
  price = case when coalesce(price, 0) = 0 then coalesce(unit_price, 0) else price end;

alter table public.reviews
  add column if not exists text text,
  add column if not exists status text default 'pending',
  add column if not exists comment text,
  add column if not exists active boolean default false;

update public.reviews
set
  comment = coalesce(comment, text),
  active = case
    when status = 'approved' then true
    when status in ('pending', 'rejected') then false
    else coalesce(active, false)
  end;

alter table public.product_images
  add column if not exists image_url text,
  add column if not exists url text,
  add column if not exists path text,
  add column if not exists active boolean default true;

create table if not exists public.video_highlights (
  id bigserial primary key,
  title text not null,
  title_ru text,
  title_uz text,
  cover_image text,
  video_url text,
  sort_order integer default 0,
  active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists usage_ru text,
  add column if not exists usage_uz text,
  add column if not exists ingredients_ru text,
  add column if not exists ingredients_uz text;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.product_images enable row level security;
alter table public.video_highlights enable row level security;

revoke all on table public.orders from anon;
revoke all on table public.order_items from anon;
revoke all on table public.customers from anon;

grant select, insert, update, delete on table public.orders to authenticated;
grant select, insert, update, delete on table public.order_items to authenticated;
grant select, insert, update, delete on table public.customers to authenticated;

drop policy if exists "Public can read active recent reviews" on public.reviews;
create policy "Public can read active recent reviews"
on public.reviews
for select
to anon, authenticated
using (active = true and created_at >= now() - interval '90 days');

drop policy if exists "Public can read product images" on public.product_images;
create policy "Public can read product images"
on public.product_images
for select
to anon, authenticated
using (active = true);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'video_highlights'
      and policyname = 'Public can read active video_highlights'
  ) then
    create policy "Public can read active video_highlights"
    on public.video_highlights
    for select
    to anon, authenticated
    using (active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'video_highlights'
      and policyname = 'Admins can manage video_highlights'
  ) then
    create policy "Admins can manage video_highlights"
    on public.video_highlights
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
  end if;
end $$;

insert into storage.buckets (id, name, public)
values
  ('video-highlight-covers', 'video-highlight-covers', true),
  ('video-highlight-videos', 'video-highlight-videos', true)
on conflict (id) do update set public = excluded.public;

notify pgrst, 'reload schema';
