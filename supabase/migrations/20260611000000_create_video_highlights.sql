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
end $$;
