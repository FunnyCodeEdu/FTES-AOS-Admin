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
}

export function useNavItems(registry: RouteDefinition[]): MenuItem[] {
  const { data: me } = useMe();
  const permissions = me?.permissions ?? [];
  const permSet = useMemo(() => new Set(permissions), [permissions]);

  return useMemo(() => {
    const groups = new Map<string, MenuItem[]>();
    const topLevel: MenuItem[] = [];

    for (const route of registry) {
      if (!route.nav) continue;
      if (route.requiredPermissions && !hasAnyPermission(permSet, route.requiredPermissions)) {
        continue;
      }
      if (route.requiredScope) {
        const now = new Date();
        const hasActiveScope = (me?.scopedGrants ?? []).some(
          (g) => (!g.expiresAt || new Date(g.expiresAt) > now) && g.scopeId
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
  }, [registry, permSet]);
}

export function NavMenu({ registry, mode = "inline", collapsed }: NavMenuProps) {
  const location = useLocation();
  const items = useNavItems(registry);

  return (
    <Menu
      mode={mode}
      selectedKeys={[location.pathname]}
      inlineCollapsed={collapsed}
      items={items}
      style={{ borderInlineEnd: "none" }}
    />
  );
}
