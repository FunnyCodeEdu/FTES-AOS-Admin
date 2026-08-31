// Kiểu dữ liệu của Studio video ngắn — bám ĐÚNG hợp đồng chung SHORTVIDEO-DESIGN §3
// (module BE `vn.ftes.aos.shortvideo`, REST `/api/v1/admin/shortvideo/...`). Tên field ở đây
// KHÔNG được đổi tuỳ hứng: BE và Community đang code song song theo cùng bản hợp đồng đó.

/** Vòng đời một lần nhờ AI đọc transcript tìm điểm nhấn. */
export type HighlightJobStatus = "RUNNING" | "READY" | "FAILED";

/** Vòng đời một clip: xếp hàng → đang cắt → sẵn sàng / hỏng. */
export type ClipStatus = "QUEUED" | "RENDERING" | "READY" | "FAILED";

/** Một đoạn AI đề xuất. `rank` là thứ tự AI cho là đáng dùng nhất (nhỏ = ưu tiên hơn). */
export interface HighlightSuggestion {
  id: string;
  startMs: number;
  endMs: number;
  title: string;
  reason?: string | null;
  rank?: number | null;
}

export interface HighlightJob {
  id: string;
  videoId: string;
  lessonId?: string | null;
  courseId?: string | null;
  status: HighlightJobStatus;
  model?: string | null;
  error?: string | null;
  createdAt?: string | null;
  suggestions: HighlightSuggestion[];
}

export interface Clip {
  id: string;
  suggestionId?: string | null;
  videoId: string;
  lessonId?: string | null;
  courseId?: string | null;
  startMs: number;
  endMs: number;
  title: string;
  description?: string | null;
  status: ClipStatus;
  clipUrl?: string | null;
  posterUrl?: string | null;
  durationSeconds?: number | null;
  sizeBytes?: number | null;
  error?: string | null;
  /** Có giá trị ⇒ clip ĐANG nằm ở mục Tin của cộng đồng (nút chuyển thành "Gỡ"). */
  publishedStoryId?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

/** Body `POST /shortvideo/highlights`. */
export interface CreateHighlightsInput {
  videoId: string;
  lessonId?: string;
  courseId?: string;
  count?: number;
}

/** Body `POST /shortvideo/clips`. */
export interface CreateClipInput {
  videoId: string;
  startMs: number;
  endMs: number;
  title: string;
  description?: string;
  suggestionId?: string;
  lessonId?: string;
  courseId?: string;
}

/** Query của bảng Studio (`GET /shortvideo/clips`). `page` ở FE đếm từ 1, BE đếm từ 0. */
export interface ClipListParams {
  status?: ClipStatus;
  courseId?: string;
  page: number;
  pageSize: number;
}

export interface ClipListResult {
  items: Clip[];
  total: number;
}
