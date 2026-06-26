CREATE TABLE public.gumroad_licenses (
  id uuid primary key default gen_random_uuid(),
  license_key text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  product_id text,
  product_permalink text,
  sale_id text,
  purchase_id text,
  uses int not null default 0,
  redeemed_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT ON public.gumroad_licenses TO authenticated;
GRANT ALL ON public.gumroad_licenses TO service_role;

ALTER TABLE public.gumroad_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own license"
  ON public.gumroad_licenses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_gumroad_licenses_updated
  BEFORE UPDATE ON public.gumroad_licenses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();