alter table public.products
  add column if not exists usage_ru text,
  add column if not exists usage_uz text,
  add column if not exists ingredients_ru text,
  add column if not exists ingredients_uz text;
