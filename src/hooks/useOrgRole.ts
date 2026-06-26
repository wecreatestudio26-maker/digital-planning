import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyOrganization } from "@/lib/org.functions";
import {
  can, canModule, type AccessLevel, type ModuleKey, type ModulePermissions,
  type OrgAction, type OrgRole,
} from "@/lib/permissions";

export function useOrgRole() {
  const fetcher = useServerFn(getMyOrganization);
  const q = useQuery({
    queryKey: ["my-org"],
    queryFn: () => fetcher(),
    staleTime: 60_000,
  });
  const role: OrgRole | null = q.data?.role ?? null;
  const permissions: ModulePermissions = (q.data?.permissions ?? {}) as ModulePermissions;
  return {
    loading: q.isLoading,
    role,
    isOwner: !!q.data?.isOwner,
    orgId: q.data?.orgId ?? null,
    orgName: q.data?.organization?.name ?? null,
    permissions,
    can: (a: OrgAction) => can(role, a),
    canModule: (m: ModuleKey, level: AccessLevel = "view") => canModule(role, permissions, m, level),
    refetch: q.refetch,
  };
}
