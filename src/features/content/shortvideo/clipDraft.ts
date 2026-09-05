/**
 * Bản nháp của tab "Tạo clip" — thứ giữ lại công việc đang làm dở khi rời tab hoặc tải lại trang.
 *
 * <p><b>Vì sao cần.</b> Toàn bộ trạng thái của panel (khoá, bài học, tham số, job AI đã chạy, và
 * dấu "đề xuất này đã cắt rồi") sống trong `useState`. Trang lại dựng hai phần thành hai tab và
 * chính nó hướng dẫn "cắt xong là chuyển sang Studio để tải/đăng" — nên thao tác được khuyến khích
 * nhất cũng là thao tác xoá sạch việc đang làm. Mất nặng nhất là job AI: nó tốn tiền và tốn thời
 * gian chờ, mà quay lại tab là phải xin đề xuất từ đầu.
 *
 * <p><b>Chỉ lưu ĐỊNH DANH, không lưu kết quả.</b> Nháp giữ `jobId` chứ không giữ danh sách đề xuất:
 * job nằm ở BE và còn đổi trạng thái (RUNNING → READY/FAILED), nên bản sao trong máy sẽ cũ đi mà
 * không ai biết. Khôi phục xong thì hỏi lại BE — nguồn sự thật vẫn là server.
 *
 * <p>`localStorage` chứ không phải server: đây là việc dở dang của MỘT người trên MỘT máy, không
 * phải dữ liệu chung. Mọi lối đọc/ghi đều bọc try/catch vì trình duyệt chặn site data là ca có
 * thật, và mất nháp thì cùng lắm quay về hành vi cũ chứ không được phép làm hỏng trang.
 */

const KEY = "ftes:admin:shortvideo:clip-draft";

/** Nháp quá hạn thì bỏ: mốc thời gian cũ nhiều ngày gần như chắc chắn không còn liên quan. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface ClipDraft {
  courseId?: string;
  lessonId?: string;
  count: number;
  minSeconds: number;
  maxSeconds: number;
  /** Job AI đã chạy — khôi phục bằng cách hỏi lại BE, không đọc kết quả từ nháp. */
  jobId?: string;
  /** suggestionId → chữ ký lần cắt, để nút "Cắt" tự khoá lại như trước khi rời tab. */
  cutSignatures: Record<string, string>;
  savedAt: number;
}

export const EMPTY_DRAFT: Omit<ClipDraft, "savedAt"> = {
  count: 5,
  minSeconds: 20,
  maxSeconds: 60,
  cutSignatures: {},
};

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

function optionalString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

/**
 * Đọc nháp. Trả `null` khi không có, hỏng, hoặc quá hạn — nơi gọi cứ dùng mặc định như cũ.
 *
 * <p>Kiểm từng field thay vì tin cả object: nháp cũ còn sót sau một lần đổi kiểu dữ liệu sẽ nhét
 * `undefined` vào `InputNumber` và làm vỡ form, mà lỗi đó lại chỉ hiện ra ở đúng máy có nháp cũ.
 */
export function loadClipDraft(): ClipDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<ClipDraft>;
    if (!isPositiveInt(p.savedAt) || Date.now() - p.savedAt > MAX_AGE_MS) return null;

    const cuts = p.cutSignatures;
    return {
      courseId: optionalString(p.courseId),
      lessonId: optionalString(p.lessonId),
      count: isPositiveInt(p.count) ? p.count : EMPTY_DRAFT.count,
      minSeconds: isPositiveInt(p.minSeconds) ? p.minSeconds : EMPTY_DRAFT.minSeconds,
      maxSeconds: isPositiveInt(p.maxSeconds) ? p.maxSeconds : EMPTY_DRAFT.maxSeconds,
      jobId: optionalString(p.jobId),
      cutSignatures:
        cuts && typeof cuts === "object" && !Array.isArray(cuts)
          ? Object.fromEntries(
              Object.entries(cuts).filter(([, v]) => typeof v === "string"),
            )
          : {},
      savedAt: p.savedAt,
    };
  } catch {
    return null;
  }
}

/** Ghi nháp. Nuốt lỗi (hết quota, site data bị chặn) — mất nháp không được làm hỏng trang. */
export function saveClipDraft(draft: Omit<ClipDraft, "savedAt">): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // không làm gì
  }
}

/** Xoá nháp — dùng khi người dùng bấm "Làm lại từ đầu". */
export function clearClipDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // không làm gì
  }
}

/** Nháp có gì đáng khôi phục không? Chỉ đổi tham số mặc định thì chưa đáng nhắc người dùng. */
export function hasRestorableWork(draft: ClipDraft | null): boolean {
  return Boolean(draft && (draft.jobId || draft.lessonId || draft.courseId));
}
