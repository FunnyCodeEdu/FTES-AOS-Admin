import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import { useMe } from "../../features/auth/api";
import { hasAnyPermission } from "./index";
import type { RouteDefinition } from "../../app/routeRegistry";

type MenuItem = Required<MenuProps>["items"][number];

interface NavMenuProps {
  registry: RouteDefinition[];
  mode?: "vertical" | "inline" | "horizontal";
  collapsed?: boolean;
  /**
   * Gọi khi người dùng chọn MỘT MỤC LÁ (không gọi khi bung/thu một nhóm).
   * Drawer trên điện thoại dùng cái này để đóng đúng lúc — đóng theo mọi cú chạm thì chạm vào mũi
   * tên sổ nhóm cũng đóng mất, chưa kịp chọn gì.
   */
  onItemClick?: () => void;
}

export function useNavItems(registry: RouteDefinition[]): MenuItem[] {
  const { data: me } = useMe();
  const permissions = me?.permissions ?? [];
  const permSet = useMemo(() => new Set(permissions), [permissions]);
  // Xem ghi chú ở Can.tsx: `me.permissions` KHÔNG chứa quyền nào của SUPER_ADMIN thuần (bypass nằm
  // ở engine, không nằm trong danh sách công bố) nên nav phải xét cờ này, nếu không tài khoản đó
  // không thấy trang nào — kể cả /system/rbac/* vốn chỉ họ dùng được.
  const superAdmin = me?.superAdmin === true;

  return useMemo(() => {
    const groups = new Map<string, MenuItem[]>();
    const topLevel: MenuItem[] = [];

    for (const route of registry) {
      if (!route.nav) continue;
      if (
        route.requiredPermissions &&
        !superAdmin &&
        !hasAnyPermission(permSet, route.requiredPermissions)
      ) {
        continue;
      }
      if (route.requiredScope) {
        const now = new Date();
        const hasActiveScope = (me?.scopedGrants ?? []).some(
          (g) =>
            (!g.expiresAt || new Date(g.expiresAt) > now) &&
            g.scopeId &&
            (!route.requiredScopeType || g.scopeType === route.requiredScopeType)
        );
        if (!hasActiveScope) continue;
      }

      const item: MenuItem = {
        key: route.path,
        icon: route.nav.icon,
        label: <Link to={route.path}>{route.nav.label}</Link>,
      };

      if (route.nav.group) {
        const existing = groups.get(route.nav.group);
        if (existing) {
          existing.push(item);
        } else {
          groups.set(route.nav.group, [item]);
        }
      } else {
        topLevel.push(item);
      }
    }

    const result: MenuItem[] = [...topLevel];
    groups.forEach((items, label) => {
      if (items.length > 0) {
        result.push({
          key: `group-${label}`,
          label,
          children: items,
        });
      }
    });

    return result;
  }, [registry, permSet, superAdmin]);
}

export function NavMenu({ registry, mode = "inline", collapsed, onItemClick }: NavMenuProps) {
  const location = useLocation();
  const items = useNavItems(registry);

  return (
    <Menu
      mode={mode}
      selectedKeys={[location.pathname]}
      inlineCollapsed={collapsed}
      items={items}
      onClick={onItemClick ? () => onItemClick() : undefined}
      style={{ borderInlineEnd: "none" }}
    />
  );
}
