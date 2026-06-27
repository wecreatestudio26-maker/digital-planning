
-- Revoke default PUBLIC execute on all SECURITY DEFINER helper/trigger functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, public.org_role[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Trigger-only functions — never called directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_org() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_categories() FROM PUBLIC, anon, authenticated;

-- RPCs intentionally exposed: keep narrow grants
REVOKE EXECUTE ON FUNCTION public.accept_org_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_org_invite(uuid) TO authenticated;

-- get_invite_public is used to preview an invite before login — keep anon access
REVOKE EXECUTE ON FUNCTION public.get_invite_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_public(uuid) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.transfer_ownership(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_ownership(uuid, uuid) TO authenticated;
