
-- Access codes table
CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  source text NOT NULL CHECK (source IN ('hotmart','gumroad','manual')),
  email_buyer text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','revoked')),
  redeemed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX access_codes_email_idx ON public.access_codes (lower(email_buyer));
CREATE INDEX access_codes_status_idx ON public.access_codes (status);
CREATE INDEX access_codes_source_idx ON public.access_codes (source);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_codes TO authenticated;
GRANT ALL ON public.access_codes TO service_role;

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Only the primary super-admin email can access via Data API
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND lower(email) = 'wecreatestudio26@gmail.com'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

CREATE POLICY "super admin manages access codes"
  ON public.access_codes FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- updated_at trigger reuses touch_updated_at (already exists)
CREATE TRIGGER access_codes_touch_updated_at
  BEFORE UPDATE ON public.access_codes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Atomic redemption
CREATE OR REPLACE FUNCTION public.redeem_access_code(_code text, _user uuid)
RETURNS public.access_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.access_codes;
BEGIN
  UPDATE public.access_codes
     SET status = 'redeemed',
         redeemed_by_user_id = _user,
         redeemed_at = now()
   WHERE code = _code
     AND status = 'active'
  RETURNING * INTO row;

  IF row.id IS NULL THEN
    RAISE EXCEPTION 'invalid_or_used_code';
  END IF;

  RETURN row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_access_code(text, uuid) FROM PUBLIC, anon, authenticated;
-- Only invoked from server (service_role); do not grant to app roles.
