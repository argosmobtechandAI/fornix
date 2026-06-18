-- Discussions feature

-- Create discussions table
create table if not exists public.discussions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  subject_id uuid null references public.subjects(id) on delete set null,
  title text not null,
  description text,
  is_active boolean not null default true,
  created_by uuid null references public.users(id) on delete set null,
  updated_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Junction table to assign doctors to a discussion
create table if not exists public.discussion_doctors (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  doctor_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(discussion_id, doctor_id)
);

-- Posts/queries inside a discussion
create table if not exists public.discussion_posts (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  parent_id uuid null references public.discussion_posts(id) on delete cascade,
  content text not null,
  is_answer boolean not null default false,
  edited boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists discussions_course_id_idx on public.discussions(course_id);
create index if not exists discussions_subject_id_idx on public.discussions(subject_id);
create index if not exists discussion_doctors_discussion_id_idx on public.discussion_doctors(discussion_id);
create index if not exists discussion_posts_discussion_id_idx on public.discussion_posts(discussion_id);
create index if not exists discussion_posts_user_id_idx on public.discussion_posts(user_id);

-- Triggers for updated_at
drop trigger if exists trg_discussions_updated_at on public.discussions;
create trigger trg_discussions_updated_at
before update on public.discussions
for each row execute function public.set_updated_at();

drop trigger if exists trg_discussion_posts_updated_at on public.discussion_posts;
create trigger trg_discussion_posts_updated_at
before update on public.discussion_posts
for each row execute function public.set_updated_at();
