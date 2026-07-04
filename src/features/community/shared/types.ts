// Shared community & moderation domain types. API shapes are assumptions per design.md.

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

export type ReportTargetType = "post" | "comment" | "resource";
export type ReportStatus = "pending" | "resolved" | "escalated" | "rejected";
export type ReportSeverity = "low" | "medium" | "high" | "critical";
export type ResolveAction = "approve" | "reject" | "remove";

export interface Reporter {
  userId: string;
  userName: string;
  reason: string;
  reportedAt: string;
}

export interface ReportHistoryItem {
  action: string;
  actorId: string;
  actorName: string;
  reason?: string;
  occurredAt: string;
}

export interface Report {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle: string;
  targetSnapshot: string;
  groupId?: string;
  groupName?: string;
  status: ReportStatus;
  severity: ReportSeverity;
  reporters: Reporter[];
  history: ReportHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export type WorkflowStage =
  | "draft"
  | "ai_review"
  | "mod_review"
  | "approved"
  | "published"
  | "archived";

export interface WorkflowTransition {
  from: WorkflowStage;
  to: WorkflowStage;
  actorId: string;
  actorName: string;
  note?: string;
  occurredAt: string;
}

export interface WorkflowItem {
  id: string;
  title: string;
  contentType: string;
  authorId: string;
  authorName: string;
  stage: WorkflowStage;
  transitions: WorkflowTransition[];
  createdAt: string;
}

export interface ModLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetTitle?: string;
  reason?: string;
  createdAt: string;
}

export type PostStatus = "active" | "hidden" | "pending";

export interface Post {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  groupId?: string;
  groupName?: string;
  status: PostStatus;
  pinned: boolean;
  featured: boolean;
  hiddenReason?: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  memberCount: number;
  status: "active" | "locked";
  ctvNames: string[];
  lockedReason?: string;
}

export interface Member {
  userId: string;
  userName: string;
  role: string;
  joinedAt: string;
}

export interface CtvAssignment {
  id: string;
  userId: string;
  userName: string;
  permissions: string[];
  assignedAt: string;
}

export interface GroupDetail {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  memberCount: number;
  status: "active" | "locked";
  lockedReason?: string;
  members: Member[];
  posts: Post[];
  ctvAssignments: CtvAssignment[];
}

export type EventReviewStatus = "pending" | "approved" | "rejected";

export interface CommunityEvent {
  id: string;
  title: string;
  description?: string;
  groupId: string;
  groupName: string;
  organizerName: string;
  location?: string;
  onlineLink?: string;
  startAt: string;
  endAt?: string;
  status: EventReviewStatus;
  reviewHistory: { decision: string; reason?: string; actorName: string; occurredAt: string }[];
}
