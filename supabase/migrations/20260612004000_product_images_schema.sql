create table if not exists public.product_images (
  id bigserial primary key,
  product_id bigint references public.products(id) on delete cascade,
  image text,
  image_url text,
  url text,
  path text,
  sort_order integer default 0,
  active boolean default true,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_sort_idx
  on public.product_images (product_id, sort_order, id);

alter table public.product_images enable row level security;

drop policy if exists "Public can read product images" on public.product_images;
drop policy if exists "Admins can manage product images" on public.product_images;

create policy "Public can read product images"
on public.product_images
for select
to anon, authenticated
using (active = true);

create policy "Admins can manage product images"
on public.product_images
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
