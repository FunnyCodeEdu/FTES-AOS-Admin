// Types cho console KHO THỬ THÁCH toàn cục (change admin-challenge-bank-console).
// Khớp BE `ChallengeBankApi` (module challenge) + `AdminChallengeController` (module admin):
//   GET  /api/v1/admin/challenges/bank              → BankPage
//   GET  /api/v1/admin/challenges/tags              → List<TagView>
//   GET|PUT    /api/v1/admin/challenges/{id}/tags   → List<TagView>
//   GET|POST|DELETE /api/v1/admin/challenges/{id}/placements → PlacementView
//
// CỐ Ý tách khỏi `api/challengeBank.api.ts` (kho CỦA MỘT KHOÁ, đi `GET /admin/challenges?courseId=`):
// hai bề mặt có shape khác nhau — dòng của `/bank` mang thêm tags/placements/difficulty và KHÔNG
// mang description/mode/maxSubmissions. Trộn hai type sẽ đẻ ra một đống field "có lúc có lúc không".

/** 1 tag của kho: `slug` là khoá (đã chuẩn hoá ở BE), `label` là nhãn hiển thị. */
export interface ChallengeTagView {
  slug: string;
  label: string;
}

/** 1 chỗ dùng của challenge (nhiều-nhiều với bài học). `orderNo` = thứ tự trong bài. */
export interface ChallengePlacementView {
  id: string;
  lessonId: string;
  courseId: string | null;
  orderNo: number;
  createdAt?: string | null;
}

/**
 * Thông tin tệp ĐỀ THI đính kèm challenge — response của `POST /admin/challenges/{id}/paper`.
 *
 * ASSUMPTION (endpoint đang xây song song): hợp đồng chốt 4 field này; BE đóng watermark server-side.
 */
export interface ChallengePaperInfo {
  paperUrl: string;
  paperMime?: string | null;
  paperFilename?: string | null;
  paperSizeBytes?: number | null;
}

/**
 * Vai của MỘT tệp trong bộ đề: `VIEW` = học viên xem tại chỗ (ảnh/PDF), `DOWNLOAD` = tải về làm bài
 * (zip/docx/xlsx…).
 *
 * BE SUY vai này TỪ MIME đã lưu và trả về — FE **không được suy lại**. Suy hai nơi là hai nguồn sự
 * thật: ngày BE nhận thêm một định dạng xem-được (hoặc đổi cách chuẩn hoá MIME), bảng đối chiếu ở
 * FE vẫn dõng dạc dán nhãn cũ và admin thấy nhãn không khớp thứ học viên thật sự nhận được.
 */
export type PaperFileRole = "VIEW" | "DOWNLOAD";

/**
 * 1 tệp trong bộ đề nhiều-tệp — phần tử của `GET /admin/challenges/{id}/paper-files`.
 *
 * ASSUMPTION (BE change `challenge-paper-multifile` đang xây song song): hợp đồng chốt các field
 * dưới đây. `role` khai rộng hơn `PaperFileRole` để một giá trị lạ của BE mới KHÔNG làm vỡ type —
 * UI rơi về nhãn "không rõ" thay vì crash.
 */
export interface ChallengePaperFileView {
  id: string;
  url: string;
  mime?: string | null;
  filename?: string | null;
  sizeBytes?: number | null;
  role?: PaperFileRole | string | null;
  sortOrder?: number | null;
}

/**
 * 1 dòng kho (`BankPage.items`). `subjectId` là UUID môn (nullable — challenge chưa phân môn),
 * `courseId`/`lessonId` là placement CHÍNH (bản cũ nhất) chứ không phải "chỗ duy nhất".
 *
 * ASSUMPTION: `paper*` và `rejectionReason` là ADDITIVE, đến cùng đợt BE của
 * `POST /{id}/paper` + review queue. Vì KHÔNG có endpoint đọc đề của một challenge, đây là nguồn duy
 * nhất để biết challenge đã có đề hay chưa lúc mới mở màn — nên khai optional và UI phải chịu được
 * khi vắng (chỉ hiện đề vừa tải trong phiên).
 */
export interface BankChallengeRow {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  visibility?: string | null;
  difficulty?: string | null;
  subjectId?: string | null;
  courseId?: string | null;
  lessonId?: string | null;
  free?: boolean;
  tags?: ChallengeTagView[];
  placements?: ChallengePlacementView[];
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  // --- ADDITIVE, chưa deploy (xem chú thích trên) ---
  paperUrl?: string | null;
  paperMime?: string | null;
  paperFilename?: string | null;
  paperSizeBytes?: number | null;
  rejectionReason?: string | null;
}

/** Trang kho — BE trả `page` 0-based (mirror `@RequestParam(defaultValue = "0")`). */
export interface BankPageResponse {
  items: BankChallengeRow[];
  total: number;
  page: number;
  size: number;
}

/**
 * Bộ lọc kho ở tầng UI. `page` ở đây là **1-based** (từ vựng AntD `Table`); `buildBankQueryParams`
 * hạ về 0-based khi gửi. `tags` là danh sách slug, BE khớp theo GIAO (mang ĐỦ mọi tag).
 */
export interface BankSearchParams {
  q?: string;
  tags?: string[];
  type?: string;
  difficulty?: string;
  subjectId?: string;
  courseId?: string;
  status?: string;
  free?: boolean;
  onlyUnattached?: boolean;
  page: number;
  pageSize: number;
}

/** Bộ lọc hàng đợi duyệt (`GET /admin/challenges/review-queue`) — `page` 1-based như trên. */
export interface ReviewQueueParams {
  subjectId?: string;
  page: number;
  pageSize: number;
}

export const CHALLENGE_TYPE_OPTIONS = [
  { value: "CODE", label: "Code" },
  { value: "MULTIPLE_CHOICE", label: "Trắc nghiệm" },
  { value: "ESSAY", label: "Tự luận" },
];

/** Khớp `ChallengeDifficulty` của BE (V313): EASY | MEDIUM | HARD. Giá trị khác → 400. */
export const CHALLENGE_DIFFICULTY_OPTIONS = [
  { value: "EASY", label: "Dễ" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "HARD", label: "Khó" },
];

/**
 * Trạng thái challenge. `PENDING_APPROVAL` là trạng thái MỚI của đợt review queue (đang xây song
 * song) — để sẵn trong bộ lọc để màn duyệt và kho nói cùng một thứ tiếng.
 */
export const CHALLENGE_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Nháp" },
  { value: "PENDING_APPROVAL", label: "Chờ duyệt" },
  { value: "PUBLISHED", label: "Đã xuất bản" },
  { value: "RUNNING", label: "Đang chạy" },
  { value: "CLOSED", label: "Đã đóng" },
  { value: "ARCHIVED", label: "Lưu trữ" },
];

export const CHALLENGE_STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  PENDING_APPROVAL: "gold",
  PUBLISHED: "green",
  RUNNING: "blue",
  CLOSED: "red",
  ARCHIVED: "red",
  REJECTED: "volcano",
};

export function challengeStatusLabel(status: string): string {
  return CHALLENGE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status ?? "—";
}

export function challengeDifficultyLabel(difficulty: string | null | undefined): string {
  if (!difficulty) return "—";
  return CHALLENGE_DIFFICULTY_OPTIONS.find((o) => o.value === difficulty)?.label ?? difficulty;
}

/** Tag đánh dấu đề PE (mô hình "PE gấp vào challenge": tag = `PE` + MÃ MÔN). */
export const PE_TAG = "PE";
