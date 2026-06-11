alter table public.products
  add column if not exists name_ru text,
  add column if not exists name_uz text,
  add column if not exists description_ru text,
  add column if not exists description_uz text,
  add column if not exists seo_title_ru text,
  add column if not exists seo_title_uz text,
  add column if not exists seo_description_ru text,
  add column if not exists seo_description_uz text;

alter table public.categories
  add column if not exists name_ru text,
  add column if not exists name_uz text;

alter table public.banners
  add column if not exists title_ru text,
  add column if not exists title_uz text,
  add column if not exists subtitle_ru text,
  add column if not exists subtitle_uz text,
  add column if not exists button_text_ru text,
  add column if not exists button_text_uz text;
