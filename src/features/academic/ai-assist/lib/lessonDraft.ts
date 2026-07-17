// Thao tác thuần trên body markdown cho AI soạn thảo lesson (design §7.3). Pure/không side-effect
// → unit test được ngay khi dựng runner. Không chạm React/DOM.

/** Giới hạn độ dài đoạn bôi đen gửi kèm prompt (design §7.3: > 4000 chars → cắt + báo). */
export const MAX_SELECTION_CHARS = 4000;

/** Snapshot vùng chọn textarea lúc bấm action (giữ qua việc focus chuyển vào panel). */
export interface SelectionSnapshot {
  start: number;
  end: number;
  text: string;
}

/**
 * Parse heading markdown (`#`..`######`) từ body → danh sách text heading (đã trim, bỏ trùng liền,
 * giữ thứ tự). Dùng cho select "Viết nháp section". Bỏ dòng heading rỗng.
 */
export function parseHeadings(body: string): string[] {
  const out: string[] = [];
  for (const line of body.split("\n")) {
    const m = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      const text = m[2].trim();
      if (text) out.push(text);
    }
  }
  return out;
}

/** Cắt đoạn chọn nếu vượt giới hạn; trả {text, truncated}. */
export function clampSelectionText(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_SELECTION_CHARS) return { text, truncated: false };
  return { text: text.slice(0, MAX_SELECTION_CHARS), truncated: true };
}

/** Chèn `insert` vào `body` tại vị trí caret (kẹp trong [0, len]). Trả body mới. */
export function insertAtCaret(body: string, caret: number, insert: string): string {
  const pos = Math.max(0, Math.min(caret, body.length));
  return body.slice(0, pos) + insert + body.slice(pos);
}

/** Thay khoảng [start, end) của `body` bằng `replacement`. Kẹp + hoán đổi nếu start>end. */
export function replaceRange(
  body: string,
  start: number,
  end: number,
  replacement: string,
): string {
  let a = Math.max(0, Math.min(start, body.length));
  let b = Math.max(0, Math.min(end, body.length));
  if (a > b) [a, b] = [b, a];
  return body.slice(0, a) + replacement + body.slice(b);
}

/**
 * Map code lỗi SSE/HTTP → message tiếng Việt cho panel (design §7.3). Pure → test được. Lỗi KHÔNG
 * đụng nội dung editor (component chỉ hiển thị Alert).
 */
export function draftErrorMessage(code: string): string {
  switch (code) {
    case "AI_QUOTA_EXCEEDED":
      return "Bạn đã hết lượt AI trong ngày. Vui lòng thử lại vào ngày mai.";
    case "AI_SESSION_BUSY":
      return "Đang có một lượt chạy cho phiên này. Đợi xong rồi thử lại.";
    case "AI_PROVIDER_UNAVAILABLE":
      return "Dịch vụ AI tạm gián đoạn. Vui lòng thử lại.";
    case "AI_FEATURE_FORBIDDEN":
      return "Bạn không có quyền dùng trợ lý soạn thảo (cần quyền ai.teacher.use).";
    case "AI_MODEL_NOT_ALLOWED":
      return "Model đã chọn không nằm trong danh mục cho phép. Chọn model khác.";
    case "AI_SESSION_NOT_FOUND":
      return "Phiên soạn thảo không còn hợp lệ. Đóng trợ lý và mở lại.";
    case "AI_SESSION_CREATE_FAILED":
      return "Không tạo được phiên soạn thảo. Thử lại.";
    case "AI_UNAUTHORIZED":
      return "Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang.";
    case "AI_NETWORK_ERROR":
      return "Kết nối thất bại. Kiểm tra mạng và thử lại.";
    case "AI_STREAM_INTERRUPTED":
      return "Luồng bị gián đoạn giữa chừng. Thử lại.";
    default:
      return "Không tạo được nội dung. Vui lòng thử lại.";
  }
}
