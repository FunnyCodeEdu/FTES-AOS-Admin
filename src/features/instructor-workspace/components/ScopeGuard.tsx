import { Navigate, useLocation } from "react-router-dom";
import { useMe } from "../../auth/api";
import { hasScopedPermission } from "../../../shared/permissions";

interface ScopeGuardProps {
  scopeType: string;
  scopeId: string;
  permission?: string;
  children: React.ReactNode;
}

/**
 * Clone của ctv-workspace/components/ScopeGuard cho instructor console (scopeType "COURSE").
 * Lách URL sang khoá ngoài scope → Navigate /403, KHÔNG render con nên KHÔNG phát request
 * dữ liệu khoá đó và KHÔNG lộ tên khoá.
 */
export function ScopeGuard({ scopeType, scopeId, permission, children }: ScopeGuardProps) {
  const { data: me } = useMe();
  const location = useLocation();
  if (!me) return null;
  const grants = me.scopedGrants;

  const hasAccess = permission
    ? hasScopedPermission(grants, permission, scopeType, scopeId)
    : grants.some(
        (g) =>
          g.scopeType === scopeType &&
          g.scopeId === scopeId &&
          hasScopedPermission(grants, g.permission, g.scopeType, g.scopeId)
      );

  if (!hasAccess) {
    return (
      <Navigate
        to="/403"
        replace
        state={{
          missingPermissions: permission ? [permission] : undefined,
          scopeMessage: "Ngoài scope được gán",
          from: location.pathname,
        }}
      />
    );
  }

  return <>{children}</>;
}
