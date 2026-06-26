import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyOrganization } from "@/lib/org.functions";
import { can, type OrgAction, type OrgRole } from "@/lib/permissions";

export function useOrgRole() {
  const fetcher = useServerFn(getMyOrganization);
  const q = useQuery({
    queryKey: ["my-org"],
    queryFn: () => fetcher(),
    staleTime: 60_000,
  });
  const role: OrgRole | null = q.data?.role ?? null;
  return {
    loading: q.isLoading,
    role,
    isOwner: !!q.data?.isOwner,
    orgId: q.data?.orgId ?? null,
    orgName: q.data?.organization?.name ?? null,
    can: (a: OrgAction) => can(role, a),
    refetch: q.refetch,
  };
}
