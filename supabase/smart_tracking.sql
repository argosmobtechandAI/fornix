-- Smart tracking results for students
create table if not exists public.smart_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid null references public.courses(id) on delete set null,
  metrics jsonb not null default '{}'::jsonb,
  summary text,
  recommendations jsonb,
  ai_raw text,
  created_at timestamptz not null default now()
);

create index if not exists smart_tracking_user_id_idx on public.smart_tracking(user_id);
