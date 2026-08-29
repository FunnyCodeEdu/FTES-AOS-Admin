export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type BroadcastChannel = "in-app" | "email" | "push";
export type BroadcastStatus = "draft" | "scheduled" | "sending" | "sent" | "cancelled";

/**
 * Tệp người nhận. Hai chế độ LOẠI TRỪ nhau — BE từ chối nếu gửi cả hai, hoặc không gửi gì:
 * - `allUsers: true` → mọi tài khoản ACTIVE, kể cả người không giữ role nào.
 * - `roles` không rỗng → chỉ người đang giữ một trong các role đó.
 *
 * `roles` rỗng KHÔNG có nghĩa là "tất cả": BE trả 400 để một cú bấm nhầm không biến thành
 * vài nghìn thông báo không thu hồi được. Muốn gửi tất cả thì bật `allUsers`.
 */
export interface BroadcastSegment {
  allUsers?: boolean;
  campusIds?: string[];
  subjectIds?: string[];
  roles?: string[];
}

export interface Broadcast {
  id: string;
  title: string;
  content: string;
  /** Đường dẫn nội bộ bắt đầu bằng "/" để bấm vào thông báo; null = thông báo không bấm được. */
  deepLink?: string | null;
  channels: BroadcastChannel[];
  segment: BroadcastSegment;
  scheduleAt?: string;
  status: BroadcastStatus;
  stats: {
    sent: number;
    delivered: number;
    read: number;
  };
  createdAt: string;
}

export interface BroadcastPreview {
  recipientCount: number;
  sample: { id: string; fullName: string; email: string }[];
}

export type BannerPlacement = "home-hero" | "sidebar" | "subject-top";
export type BannerStatus = "active" | "scheduled" | "expired";

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  position: BannerPlacement;
  order: number;
  activeFrom?: string;
  activeTo?: string;
  status: BannerStatus;
  /** Slider enrichment fields (backend `banner-slider-enrichment`). */
  subtitle?: string;
  ctaText?: string;
  /** CSS gradient/background string rendered behind the slide. */
  theme?: string;
}

export type AnnouncementScopeType = "system" | "subject" | "group";
export type AnnouncementLevel = "info" | "warning" | "critical";
export type AnnouncementStatus = "active" | "scheduled" | "expired";

export interface Announcement {
  id: string;
  content: string;
  level: AnnouncementLevel;
  scopeType: AnnouncementScopeType;
  scopeId?: string;
  activeFrom?: string;
  activeTo?: string;
  status: AnnouncementStatus;
  createdAt: string;
}

export type OfficialEventType =
  | "webinar"
  | "workshop"
  | "hackathon"
  /** Chương trình ghép đôi ("Ghép đôi sinh viên FU") — mở thêm tab điều khiển riêng. */
  | "matchmaking";
/**
 * Hình thức tổ chức, ánh xạ 1-1 với CHECK `location_type` của BE (ONSITE | ONLINE | HYBRID).
 * `offline` là từ vựng hiển thị của FE cho ONSITE — BE KHÔNG có giá trị "OFFLINE".
 *
 * `hybrid` từng bị bỏ sót khỏi union này trong khi resolver BE vẫn trả về, nên chỗ nào cast trần
 * `as OfficialEventMode` là type system nói dối: sự kiện HYBRID hiện ra như "online" ở form sửa
 * còn tab Tổng quan lại in "hybrid" — hai chỗ nói hai kiểu, và người dùng chạm vào ô Hình thức là
 * âm thầm hạ HYBRID xuống ONLINE/ONSITE.
 */
export type OfficialEventMode = "online" | "offline" | "hybrid";
/**
 * Lifecycle event, ánh xạ 1-1 với enum BE (EventService §5.1: DRAFT → PENDING_APPROVAL → PUBLISHED
 * → ONGOING → ENDED; CANCELLED). BE nói CHỮ HOA, FE giữ chữ thường và chuẩn hoá ở đúng biên API
 * (`toEventStatus` trong api/events.api.ts) — KHÔNG cast trần.
 *
 * Trạng thái kết thúc của BE tên là ENDED (EventEndProcessor) — union cũ đặt tên khác hẳn và còn
 * thiếu pending_approval (trạng thái ngay sau khi Gửi duyệt), nên type system đang bảo chứng cho
 * một hợp đồng sai.
 */
export type OfficialEventStatus =
  | "draft"
  | "pending_approval"
  | "published"
  | "ongoing"
  | "ended"
  | "cancelled";

export interface OfficialEvent {
  id: string;
  type: OfficialEventType;
  title: string;
  description?: string;
  schedule: {
    startAt: string;
    endAt?: string;
  };
  mode: OfficialEventMode;
  capacity?: number;
  location?: string;
  onlineLink?: string;
  certificateConfig?: {
    enabled: boolean;
    templateId?: string;
  };
  rewardConfig?: {
    enabled: boolean;
    points?: number;
  };
  status: OfficialEventStatus;
  recordingUrl?: string;
  cancelledReason?: string;
  createdAt: string;
}

export interface Registration {
  id: string;
  userId: string;
  userName: string;
  email: string;
  checkedIn: boolean;
  checkedInAt?: string;
  registeredAt: string;
}

export interface CheckInInfo {
  qrToken: string;
  expiresAt: string;
}

export interface CertificateIssueResult {
  issuedCount: number;
}

export type FlagEnv = "dev" | "staging" | "prod";

export interface FlagEnvState {
  enabled: boolean;
  rolloutPercent: number;
  targetSegment?: BroadcastSegment;
}

export interface Flag {
  key: string;
  description: string;
  envs: Record<FlagEnv, FlagEnvState>;
}

export type ConfigValueType = "string" | "number" | "boolean" | "json";

export interface ConfigEntry {
  key: string;
  value: unknown;
  type: ConfigValueType;
  description?: string;
}

export interface ConfigGroup {
  group: string;
  entries: ConfigEntry[];
}

export interface ConfigChange {
  id: string;
  key: string;
  before: unknown;
  after: unknown;
  reason: string;
  actorName: string;
  occurredAt: string;
}
