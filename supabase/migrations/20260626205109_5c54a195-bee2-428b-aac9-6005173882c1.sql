
-- 1. Enum de roles dentro de la organización
CREATE TYPE public.org_role AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- 2. organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. organization_members
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'VIEWER',
  is_owner boolean NOT NULL DEFAULT false,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
-- Un único OWNER por organización
CREATE UNIQUE INDEX organization_members_one_owner
  ON public.organization_members(org_id) WHERE is_owner = true;
CREATE INDEX organization_members_user_idx ON public.organization_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 4. organization_invites
CREATE TABLE public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.org_role NOT NULL DEFAULT 'VIEWER',
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invites TO authenticated;
GRANT ALL ON public.organization_invites TO service_role;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- 5. Funciones helper SECURITY DEFINER (evitan recursión en políticas)
CREATE OR REPLACE FUNCTION public.is_org_member(_user uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user AND org_id = _org)
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user uuid, _org uuid, _roles org_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user AND org_id = _org AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(_user uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user AND org_id = _org AND is_owner = true
  )
$$;

-- 6. Políticas: organizations
CREATE POLICY "members can view org" ON public.organizations
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), id));
CREATE POLICY "owner can update org" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_org_owner(auth.uid(), id))
  WITH CHECK (public.is_org_owner(auth.uid(), id));
CREATE POLICY "owner can delete org" ON public.organizations
  FOR DELETE TO authenticated USING (public.is_org_owner(auth.uid(), id));
-- Inserción manual de organizaciones: bloqueada para usuarios (se crea vía trigger).
-- service_role puede insertar siempre (bypass RLS).

-- 7. Políticas: organization_members
CREATE POLICY "members can view members" ON public.organization_members
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "owner/admin can add members" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_role(auth.uid(), org_id, ARRAY['OWNER','ADMIN']::org_role[])
    AND is_owner = false
    AND role <> 'OWNER'
  );
CREATE POLICY "owner/admin can update members" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (
    public.has_org_role(auth.uid(), org_id, ARRAY['OWNER','ADMIN']::org_role[])
    AND is_owner = false
  )
  WITH CHECK (
    public.has_org_role(auth.uid(), org_id, ARRAY['OWNER','ADMIN']::org_role[])
    AND role <> 'OWNER'
    AND is_owner = false
  );
CREATE POLICY "owner/admin can remove members" ON public.organization_members
  FOR DELETE TO authenticated
  USING (
    public.has_org_role(auth.uid(), org_id, ARRAY['OWNER','ADMIN']::org_role[])
    AND is_owner = false
  );

-- 8. Políticas: organization_invites
CREATE POLICY "owner/admin manage invites" ON public.organization_invites
  FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), org_id, ARRAY['OWNER','ADMIN']::org_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), org_id, ARRAY['OWNER','ADMIN']::org_role[]));

-- 9. Trigger: nuevo usuario => nueva organización + membresía OWNER
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_org_id uuid;
  org_name text;
BEGIN
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'org_name',
    NULLIF(split_part(NEW.email, '@', 1), ''),
    'My Organization'
  );
  INSERT INTO public.organizations (name, owner_id)
  VALUES (org_name, NEW.id)
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role, is_owner)
  VALUES (new_org_id, NEW.id, 'OWNER', true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_org();

-- 10. updated_at trigger reutilizable
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER organizations_touch_updated
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 11. Transferencia de propiedad
CREATE OR REPLACE FUNCTION public.transfer_ownership(_org uuid, _new_owner uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_org_owner(caller, _org) THEN
    RAISE EXCEPTION 'Only the OWNER can transfer ownership';
  END IF;
  IF NOT public.is_org_member(_new_owner, _org) THEN
    RAISE EXCEPTION 'Target user is not a member of this organization';
  END IF;
  IF _new_owner = caller THEN
    RAISE EXCEPTION 'You already own this organization';
  END IF;

  -- Demote current owner first (releases the partial unique index)
  UPDATE public.organization_members
    SET is_owner = false, role = 'ADMIN'
    WHERE org_id = _org AND user_id = caller;

  -- Promote new owner
  UPDATE public.organization_members
    SET is_owner = true, role = 'OWNER'
    WHERE org_id = _org AND user_id = _new_owner;

  UPDATE public.organizations SET owner_id = _new_owner WHERE id = _org;
END;
$$;

-- 12. Backfill: crear organización para usuarios existentes que no tengan ninguna
DO $$
DECLARE
  u RECORD;
  new_org_id uuid;
BEGIN
  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM public.organization_members om WHERE om.user_id = au.id)
  LOOP
    INSERT INTO public.organizations (name, owner_id)
    VALUES (COALESCE(NULLIF(split_part(u.email, '@', 1), ''), 'My Organization'), u.id)
    RETURNING id INTO new_org_id;
    INSERT INTO public.organization_members (org_id, user_id, role, is_owner)
    VALUES (new_org_id, u.id, 'OWNER', true);
  END LOOP;
END $$;
