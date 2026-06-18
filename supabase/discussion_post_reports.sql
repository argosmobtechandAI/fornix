-- Reports table for discussion posts
create table if not exists public.discussion_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.discussion_posts(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists discussion_post_reports_post_id_idx on public.discussion_post_reports(post_id);
