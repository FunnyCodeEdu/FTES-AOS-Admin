export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type BroadcastChannel = "in-app" | "email" | "push";
export type BroadcastStatus = "draft" | "scheduled" | "sending" | "sent" | "cancelled";

export interface BroadcastSegment {
  campusIds?: string[];
  subjectIds?: string[];
  roles?: string[];
}

export interface Broadcast {
  id: string;
  title: string;
  content: string;
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

export type OfficialEventType = "webinar" | "workshop" | "hackathon";
export type OfficialEventMode = "online" | "offline";
export type OfficialEventStatus = "draft" | "published" | "ongoing" | "completed" | "cancelled";

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
