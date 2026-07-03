import type { ScopedGrant } from "../../features/auth/store";

export * from "./Can";
export * from "./ErrorPages";
export * from "./NavMenu";
export * from "./PermissionRoute";

export function hasPermission(
  permissions: Set<string> | string[],
  permission: string
): boolean {
  const set = Array.isArray(permissions) ? new Set(permissions) : permissions;
  return set.has(permission);
}

export function hasAnyPermission(
  permissions: Set<string> | string[],
  required: string[]
): boolean {
  if (required.length === 0) return true;
  const set = Array.isArray(permissions) ? new Set(permissions) : permissions;
  return required.some((p) => set.has(p));
}

export function hasAllPermissions(
  permissions: Set<string> | string[],
  required: string[]
): boolean {
  if (required.length === 0) return true;
  const set = Array.isArray(permissions) ? new Set(permissions) : permissions;
  return required.every((p) => set.has(p));
}

export function hasScopedPermission(
  grants: ScopedGrant[],
  permission: string,
  scopeType?: string,
  scopeId?: string
): boolean {
  const now = new Date();
  return grants.some((g) => {
    if (g.permission !== permission) return false;
    if (g.expiresAt && new Date(g.expiresAt) <= now) return false;
    if (scopeType && g.scopeType !== scopeType) return false;
    if (scopeId && g.scopeId !== scopeId) return false;
    return true;
  });
}
