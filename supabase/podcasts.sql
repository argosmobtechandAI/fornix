-- Podcasts feature (Admin)
-- Storage: Upload audio/video to existing "media" bucket under path podcasts/<course_id>/<subject_id>/<filename>

create table if not exists public.podcasts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  description text,
  topics text[] null,
  media_url text not null,
  media_type text not null check (media_type in ('audio', 'video')),
  media_size_bytes bigint not null,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists podcasts_course_id_idx on public.podcasts(course_id);
create index if not exists podcasts_subject_id_idx on public.podcasts(subject_id);
create index if not exists podcasts_media_type_idx on public.podcasts(media_type);

create or replace function public.set_podcasts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_podcasts_updated_at on public.podcasts;
create trigger trg_podcasts_updated_at
before update on public.podcasts
for each row execute function public.set_podcasts_updated_at();
