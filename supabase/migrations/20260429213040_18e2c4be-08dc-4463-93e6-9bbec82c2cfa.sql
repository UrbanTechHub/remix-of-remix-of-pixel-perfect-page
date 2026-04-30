CREATE TABLE public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login',
  consumed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_codes_email_purpose ON public.otp_codes (email, purpose, created_at DESC);
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
-- No public policies: only edge functions (service role) access this table.