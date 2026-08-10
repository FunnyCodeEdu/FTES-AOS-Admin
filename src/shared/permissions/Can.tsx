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

  // SUPER_ADMIN bypass mọi check ở engine BE (`EffectivePermissions.allows()` return true ngay),
  // NHƯNG `permissionCodes()` — nguồn của `me.permissions` — chỉ gom grant tường minh và không hề
  // đọc cờ đó. Gate bằng Set.has thuần vì vậy ẩn sạch UI của tài khoản SUPER_ADMIN thuần; nghịch lý
  // nặng nhất là trang RBAC, nơi leaf admin.rbac.manage/grant cố ý chỉ dành SUPER_ADMIN mà chính họ
  // lại là người duy nhất không thấy nút.
  // Không nới quyền: cờ do BE tính từ chính engine đang thi hành (client không tự phong được), và
  // BE vẫn enforce độc lập bằng cùng cờ đó, nên hiện thêm UI không mở ra hành động nào BE vốn cấm.
  // Cờ chỉ sống trong cache react-query của `useMe` theo token hiện hành — TUYỆT ĐỐI không persist
  // vào localStorage rồi tin, vì như vậy user bị hạ quyền vẫn giữ bypass phía client.
  if (me?.superAdmin) return <>{children}</>;

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
