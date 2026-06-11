alter table public.banners
  add column if not exists subtitle text,
  add column if not exists button_text text;
