export interface AuditActor {
  id: string;
  fullName: string;
  email?: string;
}

export interface AuditEntry {
  id: string;
  actor: AuditActor;
  action: string;
  domain: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}

export interface AuditEntryDetail extends AuditEntry {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
}

export interface AuditLogParams {
  page: number;
  pageSize: number;
  actorId?: string;
  action?: string;
  domain?: string;
  from?: string;
  to?: string;
}

export type SecurityEventType = "login_anomaly" | "account_lock" | "permission_change";

export const SECURITY_EVENT_TYPES: { value: SecurityEventType; label: string }[] = [
  { value: "login_anomaly", label: "Đăng nhập bất thường" },
  { value: "account_lock", label: "Khoá tài khoản" },
  { value: "permission_change", label: "Thay đổi quyền" },
];

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  timestamp: string;
  userId: string;
  userName: string;
  actorId?: string;
  actorName?: string;
  ip: string;
  device: string;
  severity: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, unknown>;
}

export interface SecurityEventParams {
  page: number;
  pageSize: number;
  type?: SecurityEventType;
  userId?: string;
  from?: string;
  to?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}
