-- Question marking + AMC option chance percent
-- Run in Supabase SQL editor

-- 1) Per-question marking (for non-AMC courses)
alter table public.questions
  add column if not exists marks numeric not null default 1,
  add column if not exists negative_marks numeric not null default 0;

alter table public.questions
  add constraint if not exists questions_marks_nonnegative_chk check (marks >= 0),
  add constraint if not exists questions_negative_marks_nonnegative_chk check (negative_marks >= 0);

-- 2) Per-option chance percent (for AMC course questions)
alter table public.question_options
  add column if not exists chance_percent numeric null;

alter table public.question_options
  add constraint if not exists question_options_chance_percent_chk check (
    chance_percent is null or (chance_percent >= 0 and chance_percent <= 100)
  );


