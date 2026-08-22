// Shared academic types. API fields marked (assumed) map to design.md contracts.

import type { LessonType } from "../lessons/types";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

// ---------- Subjects ----------

export type SubjectStatus = "active" | "inactive" | "draft";

export interface Subject {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: SubjectStatus;
  // "Kì" gợi ý trong chương trình (FPT: 1..9), nullable. BE lộ/nhận qua /admin/subjects
  // (recommended_semester ở Workspace). Danh sách GraphQL adminSubjects KHÔNG trả field này → undefined.
  recommendedSemester?: number | null;
  // Ảnh bìa môn (Contract A) — BE CHỈ lộ/nhận trên endpoint CORE theo CODE
  // (GET/PATCH /api/v1/subjects/{code}); nullable. FE render lên header workspace, admin
  // đặt/xoá qua control ảnh bìa ở tab Thông tin (useSubjectCoverImage/useUpdateSubjectCover).
  imageUrl?: string | null;
  lecturerIds: string[];
  moderatorIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LearningOutcome {
  id: string;
  order: number;
  description: string;
}

export interface SubjectStaff {
  userId: string;
  fullName: string;
  email: string;
  role: "lecturer" | "moderator";
}

// Staff theo contract BE GET/PUT /api/v1/subjects/{code}/staff (SubjectStaffController).
// Domain KHÔNG có role MANAGER per-subject — "manager" là permission RBAC global subject.manage.
export type SubjectStaffRole = "MODERATOR" | "LECTURER" | "CONTRIBUTOR";

export interface SubjectStaffView {
  userId: string;
  role: SubjectStaffRole;
  joinedAt: string;
  grantedBy: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

// Ngành học (V336) — danh mục dùng chung; một môn thuộc NHIỀU ngành (nhiều-nhiều).
export interface Major {
  id: string;
  code: string;
  name: string;
  nameVi: string;
}

export interface SubjectDetail extends Subject {
  outcomes: LearningOutcome[];
  prerequisites: Subject[]; // (assumed) BE returns shallow subject rows
  staff: SubjectStaff[];
  // Ngành hiện tại của môn (BE /admin/subjects/{id}.majors). Có thể vắng ở dữ liệu cũ → optional.
  majors?: Major[];
}

export interface SubjectListParams {
  search?: string;
  status?: SubjectStatus;
  lecturerId?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SubjectFormValues {
  code: string;
  name: string;
  description?: string;
  status: SubjectStatus;
  // "Kì" gợi ý (1..9), nullable — gửi lên /admin/subjects. undefined/null = không đặt/giữ nguyên.
  recommendedSemester?: number | null;
  outcomes?: LearningOutcome[];
}

export type SubjectFilterFormValues = {
  search?: string;
  status?: SubjectStatus;
  lecturerId?: string;
};

// ---------- Courses ----------

export type CourseStatus = "draft" | "review" | "published" | "archived";
export type CourseType = "LEGACY" | "PACKAGE";

export interface Course {
  id: string;
  subjectId: string;
  subjectName?: string;
  name: string;
  summary?: string;
  status: CourseStatus;
  workflowStatus: CourseStatus;
  lecturerIds: string[];
  basePrice?: number;
  // Giá bán/khuyến mãi hiện tại (BE adminCourse.salePrice) — đọc để hiển thị; form pricing hiện chỉ
  // sửa giá gốc (basePrice → totalPrice), salePrice giữ nguyên qua PATCH partial.
  salePrice?: number;
  saleMode?: CourseType;
  createdAt: string;
  updatedAt: string;
}

export interface CourseTreeNode {
  id?: string;
  key: string; // client key for tree rendering
  title: string;
  description?: string | null;
  type: "section" | "lesson" | "assignment";
  lessonType?: LessonType; // populated by BE for lesson nodes
  /**
   * Cờ "Miễn phí (học thử toàn bài)" của BÀI HỌC — BE trả qua adminCourse.sections.lessons.free.
   * Chỉ có nghĩa cho node type "lesson". Thread xuống LessonExercisesCard để bật/tắt toggle miễn phí
   * (khi lesson.free=true → học viên đăng nhập, chưa enroll vẫn mở được cả buổi + các bài tập học thử).
   */
  free?: boolean;
  children?: CourseTreeNode[];
  // path used for 422 error mapping
  path?: string;
  error?: string;
}

// ---------- Course packages (BE PackageView / CreatePackageRequest) ----------

/**
 * Enum BE giữ nguyên UPPERCASE. EXERCISE là non-goal của editor nhưng vẫn phải đọc được.
 * COURSE = trọn khoá, kể cả nội dung thêm sau (BE course-package-course-entitlement) — gói mặc định
 * `full` sinh khi nâng LEGACY→PACKAGE dùng đúng type này, editor BẮT BUỘC hiểu kẻo PATCH ghi đè làm
 * mất quyền của người đã mua.
 */
export type PackageEntitlementType = "COURSE" | "PART" | "LESSON" | "EXERCISE";

export interface PackageEntitlement {
  id?: string;
  type: PackageEntitlementType;
  sectionId?: string | null;
  lessonId?: string | null;
  selectedLessonIds?: string[] | null;
  freeLessonIds?: string[] | null;
  selectedExerciseIds?: string[] | null;
  freeExerciseIds?: string[] | null;
}

export interface CoursePackage {
  id: string;
  name: string;
  slug: string;
  status: string;
  salePrice?: number | null;
  originalPrice?: number | null;
  descriptions?: string[] | null;
  sortOrder?: number | null;
  defaultPackage?: boolean;
  entitlements: PackageEntitlement[];
}

/** Body entitlement gửi BE — chỉ mang field ứng với `type`, tránh BE hiểu nhầm. */
export interface CreateEntitlementRequest {
  type: PackageEntitlementType;
  sectionId?: string;
  lessonId?: string;
  selectedLessonIds?: string[];
  freeLessonIds?: string[];
  selectedExerciseIds?: string[];
  freeExerciseIds?: string[];
}

export interface CreatePackageRequest {
  name: string;
  slug: string;
  salePrice?: number;
  originalPrice?: number;
  descriptions?: string[];
  sortOrder?: number;
  defaultPackage?: boolean;
  entitlements: CreateEntitlementRequest[];
}

/**
 * PATCH gói. `status` chỉ có ở PATCH (POST tạo gói luôn ACTIVE): BE `PackageService.updatePackage`
 * nhận ACTIVE/ARCHIVED, nhờ đó gói đã ngừng bán bật lại được. LƯU Ý: BE chỉ xoá-ghi-lại entitlement
 * khi body CÓ khoá `entitlements` — PATCH đổi mỗi status thì entitlement cũ được giữ nguyên.
 */
export type UpdatePackageRequest = Partial<CreatePackageRequest> & {
  status?: "ACTIVE" | "ARCHIVED";
};

export interface CourseDetail extends Course {
  tree: CourseTreeNode[];
  publishChecklist: PublishChecklistItem[];
}

export interface PublishChecklistItem {
  key: string;
  label: string;
  passed: boolean;
}

export interface CourseListParams {
  search?: string;
  subjectId?: string;
  status?: CourseStatus;
  courseType?: CourseType;
  lecturerId?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CourseFormValues {
  subjectId: string;
  name: string;
  summary?: string;
  saleMode?: CourseType;
}

export type CourseFilterFormValues = {
  search?: string;
  subjectId?: string;
  status?: CourseStatus;
  courseType?: CourseType;
  lecturerId?: string;
};

// ---------- Resources ----------

// ResourceType khớp enum thật của BE (C-3). FE = "folder học liệu" (upload cả thư mục → zip client-side).
export type ResourceType =
  | "PDF"
  | "SLIDE"
  | "VIDEO"
  | "BOOK"
  | "SOURCE_CODE"
  | "ASSIGNMENT"
  | "PE"
  | "FE"
  | "NOTES"
  | "TEMPLATES";
export type ResourceStatus = "pending" | "approved" | "rejected";
export type ResourceVisibility = "public" | "enrolled" | "package_only";
// License khớp enum thật của BE (C-3) — gửi thẳng trong CreateResourceRequest, không map.
export type ResourceLicense =
  | "ALL_RIGHTS_RESERVED"
  | "CC_BY"
  | "CC_BY_SA"
  | "CC_BY_NC"
  | "MIT"
  | "APACHE_2"
  | "PUBLIC_DOMAIN";

export interface Resource {
  id: string;
  subjectId: string;
  subjectName?: string;
  title: string;
  type: ResourceType;
  status: ResourceStatus;
  visibility: ResourceVisibility;
  // BE trả tên enum License (vd "CC_BY_SA") ở detail; list không kèm license (undefined).
  license?: ResourceLicense;
  currentVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceDetail extends Resource {
  fileUrl?: string;
  rejectReason?: string;
}

export interface ResourceVersion {
  version: number;
  status: ResourceStatus;
  createdBy: string;
  createdAt: string;
}

export interface ResourceListParams {
  subjectId?: string;
  type?: ResourceType;
  status?: ResourceStatus;
  search?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ResourceFormValues {
  subjectId: string;
  title: string;
  type: ResourceType;
  license?: ResourceLicense;
  visibility: ResourceVisibility;
}

export type ResourceFilterFormValues = {
  subjectId?: string;
  type?: ResourceType;
  status?: ResourceStatus;
  search?: string;
};

// ---------- Resource moderation queue ----------

/**
 * Trang trả về bởi endpoint CÔNG KHAI `/api/v1/resources/**` (BE `ResourceDtos.PageResponse`).
 * KHÁC `PaginatedResponse` ở trên (vocab admin, `pageSize` 1-based): `page` ở đây **0-based** và
 * kích thước trang tên là `size` — giữ nguyên tên BE để không phải đoán khi đọc network tab.
 */
export interface ResourcePageResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

/**
 * Một mục trong hàng đợi duyệt (`GET /api/v1/resources/moderation/pending`), khớp ĐÚNG BE
 * `ResourceDtos.ResourceSummary`.
 *
 * ⚠️ Đây là TOÀN BỘ dữ liệu hàng đợi có. Cố ý KHÔNG khai thêm field nào mà BE không trả:
 * - không có `status` — spec BE ép `status = PENDING_APPROVAL` nên mọi dòng đều đang chờ duyệt;
 * - không có `uploaderId`/`description`/`rejectedReason` — chỉ lấy được ở drawer qua
 *   `GET /api/v1/admin/resources/{id}` (`createdBy`, `rejectReason`);
 * - không có `subjectName` — phải tra map từ danh sách môn (xem `useSubjectLabelMap`);
 * - không có mốc "submittedAt" riêng: `createdAt` là mốc duy nhất, BE sort ASC theo nó.
 */
export interface PendingResourceSummary {
  id: string;
  title: string;
  /** Enum THÔ của BE (UPPERCASE) — endpoint công khai không hạ chữ như admin detail. */
  type: ResourceType;
  subjectId: string | null;
  /** Enum THÔ BE Visibility: PUBLIC | ENROLLED_ONLY | MEMBERS | PRIVATE. */
  visibility?: string | null;
  license?: ResourceLicense | null;
  avgRating?: number | null;
  ratingCount?: number;
  downloadCount?: number;
  lockedForViewer?: boolean;
  createdAt: string;
}

export interface ModerationQueueParams {
  /** 1-based (vocab UI). Hook tự trừ 1 khi gọi BE. */
  page: number;
  pageSize: number;
}

/** Một ảnh trong album đề FE — BE `FeAlbumDtos.FeImageView`. */
export interface FeAlbumImage {
  id: string;
  resourceId: string;
  /**
   * Loại TRANG. Album FE trộn được hai loại vì đề nạp vào theo ba đường khác nhau: giữ nguyên ảnh
   * cho ra `IMAGE`, hai đường số hoá (ảnh→chữ, tệp .txt/.md) cho ra `TEXT`.
   *
   * <p>Trang `TEXT` KHÔNG có `imageUrl` — chiếu nó bằng thẻ ảnh cho ra một ô vỡ chứ không cho ra
   * lỗi, nên mọi chỗ hiển thị album phải rẽ nhánh theo trường này. Optional để tương thích bản BE
   * cũ chưa trả trường (khi đó coi như IMAGE — đúng hành vi lúc album chỉ có một loại).
   */
  kind?: "IMAGE" | "TEXT";
  /**
   * Vòng đời của trang: PENDING = worker đang số hoá (chưa có `textContent`); READY = dùng được;
   * FAILED = số hoá hỏng, lý do ở `errorMessage`.
   *
   * <p>Optional để tương thích bản BE cũ chưa trả trường — khi đó coi như READY, đúng hành vi lúc
   * mọi trang đều được tạo xong ngay trong request.
   */
  status?: "PENDING" | "READY" | "FAILED";
  /** Lý do hỏng khi FAILED; khi READY thì là cảnh báo của model (hình cắt trượt…). */
  errorMessage?: string | null;
  /** Markdown của trang `TEXT`; rỗng với trang `IMAGE`. */
  textContent?: string | null;
  imageUrl: string;
  sortOrder: number;
  caption?: string | null;
  uploadedBy?: string | null;
  commentCount?: number;
  createdAt: string;
}

/** Album đề FE — BE `FeAlbumDtos.FeAlbumView`. `maxImages` = trần ảnh của album. */
export interface FeAlbumView {
  resourceId: string;
  images: FeAlbumImage[];
  total: number;
  maxImages: number;
}

/** Kết quả duyệt hàng loạt — 1 phần tử cho MỖI mục thất bại, để UI nêu đích danh. */
export interface BulkApproveFailure {
  id: string;
  title: string;
  message: string;
}

export interface BulkApproveResult {
  succeeded: string[];
  failed: BulkApproveFailure[];
}

// ---------- Learning Packs ----------

export type PackStatus = "active" | "inactive" | "draft";

export interface Pack {
  id: string;
  name: string;
  description?: string;
  status: PackStatus;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export type PackItemType = "course" | "resource";

export interface PackItem {
  type: PackItemType;
  refId: string;
  title: string;
  order: number;
}

export interface PackDetail extends Pack {
  items: PackItem[];
}

export interface PackListParams {
  search?: string;
  status?: PackStatus;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PackFormValues {
  name: string;
  description?: string;
  status: PackStatus;
}

export type PackFilterFormValues = {
  search?: string;
  status?: PackStatus;
};

// ---------- Quiz ----------

export type QuizDifficulty = "easy" | "medium" | "hard";
export type QuizStatus = "draft" | "ready" | "archived";

export interface QuizAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  subjectId: string;
  subjectName?: string;
  content: string;
  answers: QuizAnswer[];
  correctAnswerId: string;
  tags: string[];
  difficulty: QuizDifficulty;
  status: QuizStatus;
  createdAt: string;
  updatedAt: string;
}

export interface QuizListParams {
  subjectId?: string;
  tag?: string;
  difficulty?: QuizDifficulty;
  status?: QuizStatus;
  search?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Enum type theo BE V12 (AdminQuizQuestionCreateRequest.type).
export type QuizQuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";

/** Shape form FE (answers hiển thị) — api layer map sang options/correctKeys khi gửi BE. */
export interface QuizFormValues {
  subjectId?: string;
  content: string;
  type: QuizQuestionType;
  answers: QuizAnswer[];
  tags: string[];
  difficulty: QuizDifficulty;
  status: QuizStatus;
}

/** Body POST /admin/quiz-questions + PATCH /{id} (PATCH: field vắng = giữ nguyên). */
export interface QuizQuestionWriteRequest {
  content?: string;
  type?: QuizQuestionType;
  options?: { key: string; text: string }[];
  correctKeys?: string[];
  explanation?: string;
  points?: number;
  subjectId?: string;
  tags?: string[];
  difficulty?: QuizDifficulty;
  status?: QuizStatus;
  quizId?: string;
}

export type QuizFilterFormValues = {
  subjectId?: string;
  tag?: string;
  difficulty?: QuizDifficulty;
  status?: QuizStatus;
  search?: string;
};

/**
 * Kết quả POST /admin/quiz-questions/bulk-import — PARTIAL-SUCCESS đồng bộ (HTTP 200 kể cả
 * failed>0): dòng hợp lệ lưu, dòng lỗi trả errors[{index 0-based, message}].
 */
export interface QuizBulkImportResult {
  total: number;
  imported: number;
  failed: number;
  items: QuizQuestion[];
  errors: { index: number; message: string }[];
}

// ---------- Terms (Kỳ học) ----------
// BE domain `term` (/api/v1/admin/terms**). Ngày là ISO-8601 Instant: gửi dayjs.toISOString(),
// hydrate dayjs(iso). Ghi gate BE `term.manage`, đọc `term.view`. `code` immutable sau khi tạo.

/** Vòng đời kỳ do BE tính từ startsAt/endsAt (không phải field nhập). */
export type TermStatus = "SCHEDULED" | "ACTIVE" | "ENDED";

/** GET /terms, /terms/{id} — envelope.data. */
export interface TermView {
  id: string;
  code: string;
  name: string;
  startsAt: string;
  endsAt: string;
  reminderLeadDays: number;
  status: TermStatus;
  /** Thời điểm đã gửi nhắc (null nếu chưa). */
  remindedAt: string | null;
  /** Thời điểm đã auto-kick học viên khi kỳ kết thúc (null nếu chưa). */
  expiredAt: string | null;
  courseCount: number;
  createdAt: string;
  updatedAt: string;
}

/** POST /terms — body. `reminderLeadDays` null → BE mặc định 7. */
export interface CreateTermRequest {
  code: string;
  name: string;
  startsAt: string;
  endsAt: string;
  reminderLeadDays?: number | null;
}

/** PUT /terms/{id} — body. KHÔNG có `code` (immutable). Field vắng = giữ nguyên. */
export interface UpdateTermRequest {
  name?: string;
  startsAt?: string;
  endsAt?: string;
  reminderLeadDays?: number | null;
}

/** POST /terms/{id}/courses — body. */
export interface AddCourseRequest {
  courseId: string;
}

/** GET /terms/{id}/courses — một khoá thuộc kỳ. */
export interface TermCourseView {
  courseId: string;
  title: string;
  slugName: string;
  courseStatus: string;
  addedAt: string;
}

/** Một dòng khoá trong tóm tắt ảnh hưởng. */
export interface TermAffectedCourse {
  courseId: string;
  title: string;
  activeEnrollments: number;
  activePurchases: number;
}

/** GET /terms/{id}/enrollments — tóm tắt học viên bị ảnh hưởng khi kỳ kết thúc. */
export interface TermAffectedSummaryView {
  termId: string;
  courseCount: number;
  affectedActiveUsers: number;
  courses: TermAffectedCourse[];
}
