
-- Lock down SECURITY DEFINER functions: revoke from PUBLIC, grant only to roles that must call them.

-- Trigger-only functions: no direct callers needed
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_default_categories() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_org() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Role/permission helpers: used inside RLS policies and server functions as the signed-in user
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.is_org_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.has_org_role(uuid, uuid, org_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, org_role[]) TO authenticated;

-- Ownership transfer: only signed-in users (the function checks caller is owner)
REVOKE ALL ON FUNCTION public.transfer_ownership(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_ownership(uuid, uuid) TO authenticated;

-- Accept invite: signed-in users only
REVOKE ALL ON FUNCTION public.accept_org_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_org_invite(uuid) TO authenticated;

-- Public invite lookup: intentionally callable by anon for the public /invite/{token} page
REVOKE ALL ON FUNCTION public.get_invite_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_public(uuid) TO anon, authenticated;
