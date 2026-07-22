import { createContext, useContext } from "react";
import { useMe } from "../../features/auth/api";
import { hasAnyPermission, hasScopedPermission } from "./index";

/**
 * Ngữ cảnh scope cho một subtree: khi được cung cấp, `<Can permissions={[...]}>` (vốn kiểm tra
 * quyền GLOBAL) sẽ được thoả mãn thêm nếu caller giữ quyền đó dưới dạng grant scoped khớp scope
 * này. Dùng để tái sử dụng component quản trị academic (gate bằng global `<Can>`) trong console
 * giảng viên, nơi LECTURER chỉ có quyền `course.manage`/`course.publish` ở mức COURSE-scope.
 * Mặc định null → hành vi cũ (chỉ xét quyền global), nên không ảnh hưởng nơi khác.
 */
export const PermissionScopeContext = createContext<{ type: string; id: string } | null>(null);

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
  const scopeCtx = useContext(PermissionScopeContext);

  let ok = true;
  if (permissions) {
    const globalOk = hasAnyPermission(permSet, permissions);
    // Trong một subtree có scope context, chấp nhận grant scoped tương ứng như quyền global.
    const scopedOk = scopeCtx
      ? permissions.some((p) =>
          hasScopedPermission(scopedGrants, p, scopeCtx.type, scopeCtx.id)
        )
      : false;
    if (!globalOk && !scopedOk) ok = false;
  }
  if (scope && !hasScopedPermission(scopedGrants, scope.permission, scope.type, scope.id)) {
    ok = false;
  }

  return ok ? <>{children}</> : <>{fallback}</>;
}
