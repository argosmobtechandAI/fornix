-- Migration: Add support for multiple subjects per mock test
-- Run this in Supabase SQL editor to migrate existing mock_tests table

-- Step 1: Create mock_test_subjects junction table
create table if not exists public.mock_test_subjects (
  id uuid primary key default gen_random_uuid(),
  mock_test_id uuid not null references public.mock_tests(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(mock_test_id, subject_id)
);

-- Step 2: Migrate existing data from subject_id to junction table
-- Only if mock_tests.subject_id column exists
do $$
begin
  if exists (
    select 1 
    from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'mock_tests' 
    and column_name = 'subject_id'
  ) then
    -- Insert existing subject associations into junction table
    insert into public.mock_test_subjects (mock_test_id, subject_id)
    select id, subject_id
    from public.mock_tests
    where subject_id is not null
    on conflict (mock_test_id, subject_id) do nothing;
    
    raise notice 'Migrated existing subject_id data to mock_test_subjects junction table';
  else
    raise notice 'Column subject_id does not exist in mock_tests, skipping data migration';
  end if;
end $$;

-- Step 3: Drop the old subject_id column if it exists
do $$
begin
  if exists (
    select 1 
    from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'mock_tests' 
    and column_name = 'subject_id'
  ) then
    -- First drop the index if it exists
    drop index if exists public.mock_tests_subject_id_idx;
    
    -- Then drop the column
    alter table public.mock_tests drop column subject_id;
    
    raise notice 'Dropped subject_id column from mock_tests table';
  else
    raise notice 'Column subject_id already removed from mock_tests';
  end if;
end $$;

-- Step 4: Create indexes for performance
create index if not exists mock_test_subjects_mock_test_id_idx 
  on public.mock_test_subjects(mock_test_id);

create index if not exists mock_test_subjects_subject_id_idx 
  on public.mock_test_subjects(subject_id);

-- Step 5: Verify migration
do $$
declare
  tests_count integer;
  subjects_count integer;
begin
  select count(*) into tests_count from public.mock_tests;
  select count(*) into subjects_count from public.mock_test_subjects;
  
  raise notice 'Migration complete:';
  raise notice '  - Mock tests: %', tests_count;
  raise notice '  - Subject associations: %', subjects_count;
end $$;

-- Step 6: Add helpful comment
comment on table public.mock_test_subjects is 'Junction table allowing multiple subjects per mock test';
comment on column public.mock_test_subjects.mock_test_id is 'Reference to the mock test';
comment on column public.mock_test_subjects.subject_id is 'Reference to the subject';
