-- Add current_session_id to users table
alter table public.users add column if not exists current_session_id uuid;
