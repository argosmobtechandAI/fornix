-- Promo codes, promo uses, and referrals

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric NOT NULL,
  max_uses integer DEFAULT NULL,
  uses_count integer DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_to timestamptz DEFAULT NULL,
  is_active boolean DEFAULT true,
  created_by uuid DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes USING btree(code);

CREATE TABLE IF NOT EXISTS public.promo_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid,
  order_id uuid,
  amount_before numeric,
  discount_amount numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_uses_promo_code_id ON public.promo_uses(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_uses_user_id ON public.promo_uses(user_id);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid,
  code text UNIQUE,
  referred_user_id uuid DEFAULT NULL,
  credited boolean DEFAULT false,
  credit_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(code);

-- Optional: function to increment uses_count (can be called within transaction)
CREATE OR REPLACE FUNCTION public.increment_promo_uses_count(promo_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.promo_codes SET uses_count = coalesce(uses_count,0) + 1 WHERE id = promo_id;
END;
$$ LANGUAGE plpgsql;

-- Partner / affiliate support on promo codes
-- These ALTERs are safe to run multiple times thanks to IF NOT EXISTS

ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS partner_name text,
  ADD COLUMN IF NOT EXISTS partner_email text,
  ADD COLUMN IF NOT EXISTS partner_password_hash text,
  ADD COLUMN IF NOT EXISTS partner_commission_percent numeric NOT NULL DEFAULT 0;

-- Ensure commission percent is between 0 and 100
ALTER TABLE public.promo_codes
  ADD CONSTRAINT IF NOT EXISTS promo_codes_partner_commission_chk
  CHECK (partner_commission_percent >= 0 AND partner_commission_percent <= 100);

-- Partner email must be unique (when provided)
CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_partner_email_key
  ON public.promo_codes (partner_email)
  WHERE partner_email IS NOT NULL;