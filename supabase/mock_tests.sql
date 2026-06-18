-- Mock Tests feature (Admin) - Run this in Supabase SQL editor

-- Create mock_tests table
create table if not exists public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  course_id uuid not null references public.courses(id) on delete cascade,
  total_questions integer not null,
  duration_minutes integer not null default 60,
  is_published boolean not null default false,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create mock_test_subjects junction table (allows multiple subjects per test)
create table if not exists public.mock_test_subjects (
  id uuid primary key default gen_random_uuid(),
  mock_test_id uuid not null references public.mock_tests(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(mock_test_id, subject_id)
);

-- Create mock_test_questions table (junction table)
create table if not exists public.mock_test_questions (
  id uuid primary key default gen_random_uuid(),
  mock_test_id uuid not null references public.mock_tests(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  "order" integer not null default 1,
  created_at timestamptz not null default now()
);

-- Create test_attempts table (student responses)
create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  mock_test_id uuid not null references public.mock_tests(id) on delete cascade,
  answers jsonb not null default '[]', -- Array of { question_id, selected_option, is_correct }
  score integer not null default 0, -- Percentage (0-100)
  correct_answers integer not null default 0,
  total_questions integer not null default 0,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for performance
create index if not exists mock_tests_course_id_idx on public.mock_tests(course_id);
create index if not exists mock_tests_published_idx on public.mock_tests(is_published);
create index if not exists mock_test_subjects_mock_test_id_idx on public.mock_test_subjects(mock_test_id);
create index if not exists mock_test_subjects_subject_id_idx on public.mock_test_subjects(subject_id);
create index if not exists mock_test_questions_mock_test_id_idx on public.mock_test_questions(mock_test_id);
create index if not exists mock_test_questions_question_id_idx on public.mock_test_questions(question_id);
create index if not exists test_attempts_user_id_idx on public.test_attempts(user_id);
create index if not exists test_attempts_mock_test_id_idx on public.test_attempts(mock_test_id);
create index if not exists test_attempts_status_idx on public.test_attempts(status);

-- Update trigger function for mock_tests
drop trigger if exists trg_mock_tests_updated_at on public.mock_tests;
create trigger trg_mock_tests_updated_at
before update on public.mock_tests
for each row execute function public.set_updated_at();
