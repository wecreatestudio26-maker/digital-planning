
-- Extend organization_invites
ALTER TABLE public.organization_invites
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Add permissions to organization_members
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Public read by token (security definer)
CREATE OR REPLACE FUNCTION public.get_invite_public(_token uuid)
RETURNS TABLE (
  email text,
  role public.org_role,
  name text,
  org_name text,
  status text,
  expires_at timestamptz,
  expired boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.email, i.role, i.name, o.name as org_name, i.status, i.expires_at,
         (i.expires_at < now()) as expired
  FROM public.organization_invites i
  JOIN public.organizations o ON o.id = i.org_id
  WHERE i.token = _token
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_public(uuid) TO anon, authenticated;

-- Accept invite
CREATE OR REPLACE FUNCTION public.accept_org_invite(_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_invite record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_user;

  SELECT * INTO v_invite FROM public.organization_invites WHERE token = _token;
  IF v_invite IS NULL THEN RAISE EXCEPTION 'Invitación no encontrada'; END IF;
  IF v_invite.status <> 'pending' THEN RAISE EXCEPTION 'Invitación no válida'; END IF;
  IF v_invite.expires_at < now() THEN
    UPDATE public.organization_invites SET status = 'expired' WHERE id = v_invite.id;
    RAISE EXCEPTION 'Invitación expirada';
  END IF;
  IF lower(v_invite.email) <> lower(v_email) THEN
    RAISE EXCEPTION 'Esta invitación es para %', v_invite.email;
  END IF;

  -- Insert membership if not exists
  INSERT INTO public.organization_members (org_id, user_id, role, is_owner, invited_by, permissions)
  VALUES (v_invite.org_id, v_user, v_invite.role, false, v_invite.invited_by, v_invite.permissions)
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET role = EXCLUDED.role, permissions = EXCLUDED.permissions;

  UPDATE public.organization_invites
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_invite.id;

  RETURN v_invite.org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_org_invite(uuid) TO authenticated;
