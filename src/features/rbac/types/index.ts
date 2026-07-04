// Types cho RBAC console. Nhiều field theo assumption từ design.md, cần đối chiếu khi BE chốt.

export interface Role {
  id: string;
  name: string;
  description?: string;
  isPreset: boolean;
  presetDomain?: string;
  permissionCount: number;
  userCount: number;
  updatedAt: string;
  permissions?: string[]; // chỉ có ở detail
}

export interface PermissionLeaf {
  key: string;
  description: string;
  scopable: boolean;
  roles: string[];
}

export interface PermissionDomain {
  domain: string;
  permissions: PermissionLeaf[];
}

export interface PermissionCatalog {
  domains: PermissionDomain[];
}

export interface UserAccessSummary {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
  grantCount: number;
}

export interface UserRoleAssignment {
  roleId: string;
  name: string;
  assignedAt: string;
  assignedBy: string;
}

export interface UserScopedGrant {
  grantId: string;
  permission: string;
  scopeType: "GROUP" | "SUBJECT" | "RESOURCE_SET";
  scopeId: string;
  scopeName: string;
  expiresAt: string;
  reason: string;
  grantedBy: string;
  grantedAt: string;
}

export interface UserAccessDetail {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  };
  roles: UserRoleAssignment[];
  grants: UserScopedGrant[];
}

export interface MatrixSource {
  type: "ROLE" | "GRANT";
  name: string;
  scope?: {
    type: string;
    id: string;
    name: string;
  };
  expiresAt?: string;
}

export interface MatrixEntry {
  permission: string;
  sources: MatrixSource[];
}

export interface MatrixByPermissionEntry {
  userId: string;
  email: string;
  fullName: string;
  source: MatrixSource;
}

export interface ScopeItem {
  scopeId: string;
  name: string;
  type: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  reason?: string;
  details?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleRequest extends CreateRoleRequest {}

export interface CloneRoleRequest {
  name: string;
}

export interface AssignRoleRequest {
  roleId: string;
}

export interface CreateGrantRequest {
  permission: string;
  scopeType: "GROUP" | "SUBJECT" | "RESOURCE_SET";
  scopeId: string;
  expiresAt: string;
  reason: string;
}

export interface RevokeGrantRequest {
  reason: string;
}
