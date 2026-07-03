import { useMe } from "../../features/auth/api";
import { hasAnyPermission, hasScopedPermission } from "./index";

interface CanProps {
  permissions?: string[];
  scope?: {
    permission: string;
    type: string;
    id: string;
  };
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ permissions, scope, children, fallback = null }: CanProps) {
  const { data: me } = useMe();
  const perms = me?.permissions ?? [];
  const scopedGrants = me?.scopedGrants ?? [];
  const permSet = new Set(perms);

  let ok = true;
  if (permissions && !hasAnyPermission(permSet, permissions)) ok = false;
  if (scope && !hasScopedPermission(scopedGrants, scope.permission, scope.type, scope.id)) {
    ok = false;
  }

  return ok ? <>{children}</> : <>{fallback}</>;
}
