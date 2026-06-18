-- Notes feature (Admin) - Run this in Supabase SQL editor
-- Storage: Upload PDFs to a bucket (recommended: existing "media" bucket) under path notes/<course_id>/<subject_id>/<filename>.pdf

-- For NEW database: Create table
create table if not exists public.course_notes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  title text not null,
  pdf_url text not null,
  note_type text not null default 'sample' check (note_type in ('sample', 'premium')),
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- For EXISTING database: Add new columns (run these if table already exists)
-- Uncomment and run these lines if you already have course_notes table:

-- alter table public.course_notes add column if not exists subject_id uuid;
-- alter table public.course_notes add constraint fk_course_notes_subject foreign key (subject_id) references public.subjects(id) on delete cascade;
-- alter table public.course_notes add column if not exists note_type text not null default 'sample';
-- alter table public.course_notes add constraint chk_note_type check (note_type in ('sample', 'premium'));

-- Create indexes
create index if not exists course_notes_course_id_idx on public.course_notes(course_id);
create index if not exists course_notes_subject_id_idx on public.course_notes(subject_id);
create index if not exists course_notes_note_type_idx on public.course_notes(note_type);

-- Optional: keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_course_notes_updated_at on public.course_notes;
create trigger trg_course_notes_updated_at
before update on public.course_notes
for each row execute function public.set_updated_at();


