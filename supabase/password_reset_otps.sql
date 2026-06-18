-- Password reset OTPs table
create table if not exists public.password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  email text not null,
  otp text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists password_reset_otps_email_idx
  on public.password_reset_otps (email);

create index if not exists password_reset_otps_email_otp_idx
  on public.password_reset_otps (email, otp);
create index if not exists password_reset_otps_expires_at_idx
  on public.password_reset_otps (expires_at);
