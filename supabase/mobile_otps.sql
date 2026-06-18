-- Mobile OTPs table for registration/login validation
create table if not exists public.mobile_otps (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  otp text not null,
  expires_at timestamptz not null,
  verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mobile_otps_phone_idx
  on public.mobile_otps (phone);

create index if not exists mobile_otps_phone_otp_idx
  on public.mobile_otps (phone, otp);

create index if not exists mobile_otps_expires_at_idx
  on public.mobile_otps (expires_at);
