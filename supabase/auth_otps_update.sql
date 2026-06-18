-- Rename phone column to identifier
ALTER TABLE public.mobile_otps RENAME COLUMN phone TO identifier;

-- Drop old indexes
DROP INDEX IF EXISTS mobile_otps_phone_idx;
DROP INDEX IF EXISTS mobile_otps_phone_otp_idx;

-- Create new indexes
CREATE INDEX IF NOT EXISTS mobile_otps_identifier_idx ON public.mobile_otps (identifier);
CREATE INDEX IF NOT EXISTS mobile_otps_identifier_otp_idx ON public.mobile_otps (identifier, otp);
