import type { Dayjs } from "dayjs";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface UserRow {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  roleNames: string[];
  status: "active" | "locked" | "pending";
  campus?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  status: "active" | "locked" | "pending";
  lockReason?: string;
  campus?: string;
  roles: { roleId: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  sessionId: string;
  device: string;
  ip: string;
  lastActiveAt: string;
  current: boolean;
}

export interface SecurityEvent {
  id: string;
  eventType: string;
  timestamp: string;
  actor?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface LearningSummary {
  enrolledCount: number;
  completedCount: number;
  certificates: { courseId: string; courseName: string; issuedAt: string }[];
  enrollments: {
    items: {
      courseId: string;
      courseName: string;
      progressPercent: number;
      enrolledAt: string;
    }[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface TransactionSummary {
  totalSpent: number;
  orderCount: number;
  walletBalance: number;
  recentTransactions: {
    transactionId: string;
    type: string;
    amount: number;
    createdAt: string;
  }[];
}

export interface UserListParams {
  search?: string;
  role?: string;
  status?: string;
  campus?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SecurityLogParams {
  eventType?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export interface ExportJob {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  downloadUrl?: string;
  failedReason?: string;
}

export interface ImpersonationSession {
  token: string;
  expiresAt: string;
}

// Form value helpers
export type UserFilterFormValues = {
  search?: string;
  role?: string;
  status?: string;
  campus?: string;
};

export type SecurityLogFilterFormValues = {
  eventType?: string;
  range?: [Dayjs, Dayjs];
};
