-- Countries and Colleges/Universities management
-- Run this in Supabase SQL editor

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text null,
  courses_csv text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists countries_name_key on public.countries(lower(name));

create or replace function public.set_updated_at_countries()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_countries_updated_at on public.countries;
create trigger trg_countries_updated_at
before update on public.countries
for each row execute function public.set_updated_at_countries();

create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete cascade,
  name text not null,
  city text null,
  type text null check (type in ('college','university') or type is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists colleges_country_id_idx on public.colleges(country_id);
create unique index if not exists colleges_country_name_key on public.colleges(lower(name), country_id);

create or replace function public.set_updated_at_colleges()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_colleges_updated_at on public.colleges;
create trigger trg_colleges_updated_at
before update on public.colleges
for each row execute function public.set_updated_at_colleges();
