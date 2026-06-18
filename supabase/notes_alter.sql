-- ALTER existing course_notes table to add subject_id and note_type columns
-- Run this ONLY if you already have the course_notes table in your database

-- Add subject_id column
alter table public.course_notes 
  add column if not exists subject_id uuid;

-- Add note_type column with default value
alter table public.course_notes 
  add column if not exists note_type text not null default 'sample';

-- Add foreign key constraint for subject_id (drop and recreate to avoid duplicate constraint errors)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_course_notes_subject') then
    alter table public.course_notes 
      add constraint fk_course_notes_subject 
      foreign key (subject_id) references public.subjects(id) on delete cascade;
  end if;
end $$;

-- Add check constraint for note_type (drop and recreate to avoid duplicate constraint errors)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_note_type') then
    alter table public.course_notes 
      add constraint chk_note_type 
      check (note_type in ('sample', 'premium'));
  end if;
end $$;

-- Create indexes
create index if not exists course_notes_subject_id_idx on public.course_notes(subject_id);
create index if not exists course_notes_note_type_idx on public.course_notes(note_type);

-- Optional: After updating all existing rows with proper subject_id values, 
-- uncomment and run this to make subject_id required:
-- alter table public.course_notes alter column subject_id set not null;
