import { notification } from "antd";
import { ApiError, ForbiddenError } from "./client";

const ADMIN_ERROR_MESSAGES: Record<string, string> = {
  ADMIN_REASON_REQUIRED: "Thao tác này yêu cầu nhập lý do để ghi audit log.",
  ADMIN_PRIVILEGE_ESCALATION: "Bạn không thể thực hiện thao tác vượt quyền của mình.",
  ADMIN_ACCESS_DENIED: "Bạn không có quyền thực hiện thao tác này.",
  COURSE_TYPE_NOT_PACKAGE: "Khoá học loại LEGACY không hỗ trợ tạo gói học tập.",
  COURSE_TYPE_DOWNGRADE_FORBIDDEN: "Không thể chuyển khoá học PACKAGE về LEGACY.",
  COURSE_VALIDATION:
    "Dữ liệu khoá học không hợp lệ — khoá cần có ít nhất một chương trước khi nâng lên PACKAGE.",
  // Gamification console (quests / xp-rules / reward pools / seasons).
  GAMIFICATION_INVALID_CONFIG: "Cấu hình không hợp lệ. Với reward pool, tổng xác suất các phần thưởng phải bằng 1.0 (100%).",
  GAMIFICATION_NOT_FOUND: "Không tìm thấy cấu hình gamification tương ứng.",
  GAMIFICATION_POOL_INACTIVE: "Reward pool đang tắt — hãy bật pool trước khi thao tác.",
  GAMIFICATION_INVALID_GOAL: "Mục tiêu không hợp lệ.",
  CHALLENGE_INVALID_STATE:
    "Chỉ challenge đang hoạt động (PUBLISHED/RUNNING) mới public lên Workplace được.",
  CHALLENGE_COURSE_MISMATCH:
    "Challenge đang thuộc kho của khoá khác — không thể gắn vào bài của khoá này.",
  CHALLENGE_INVALID_PAYLOAD: "Bài học không hợp lệ (không phân giải được ra khoá nào).",
  ADMIN_INVALID_PARAM: "Thiếu hoặc sai tham số yêu cầu.",
  // Console KHO THỬ THÁCH (admin-challenge-bank-console): kho chung + tag + chỗ dùng + đề thi + duyệt.
  //
  // Về cách tra: module challenge ném qua `ChallengeError.X.raise(msg)` → envelope có
  // `data.errorCode = "CHALLENGE_..."` và message KHÔNG mang tiền tố mã; còn `DomainException
  // .badRequest/forbidden("ADMIN_...", msg)` (controller admin dùng) nhét mã vào ĐẦU message
  // ("ADMIN_ACCESS_DENIED: …") và cũng đặt `data.errorCode`. `getAdminErrorMessage` phủ cả hai
  // đường (errorCode + tra theo tiền tố) nên chỉ cần khai mã ở đây là đủ — KHÁC `RESOURCE_*` vốn
  // chỉ có đường tiền tố.
  CHALLENGE_NOT_FOUND: "Không tìm thấy thử thách — có thể đã bị người khác xoá hoặc xử lý.",
  CHALLENGE_FORBIDDEN: "Bạn không có quyền thao tác trên thử thách này.",
  // (Kho gọi KHÔNG kèm courseId trong lúc chỉ quản một khoá ⇒ 403 `ADMIN_ACCESS_DENIED`. Bảng này
  // KHÔNG chạm tới được: interceptor biến mọi 403 thành `ForbiddenError` với message chung trước
  // đó. Vì thế trang kho bắt riêng `ForbiddenError` để chỉ đường "chọn một khoá ở bộ lọc".)
  // --- ASSUMPTION: mã lỗi của đề thi & hàng đợi duyệt (BE đang xây song song, tên mã CHƯA chốt).
  // Khai sẵn là vô hại: mã không khớp thì rơi về message của BE như trước, không che mất lỗi nào.
  CHALLENGE_PAPER_NOT_FOUND: "Thử thách này chưa có tệp đề để thao tác.",
  // CỐ Ý KHÔNG khai `CHALLENGE_PAPER_INVALID_TYPE` / `CHALLENGE_PAPER_TOO_LARGE`: danh sách định
  // dạng và TRẦN DUNG LƯỢNG là hợp đồng của SERVER và đang đổi (change
  // admin-challenge-paper-zip-folder: thêm application/zip, trần theo loại 25/50/100 MB). Hai câu
  // dịch đóng cứng trước đây ("chỉ nhận PDF/PNG/JPEG/WebP", "vượt 25 MB") sẽ nói SAI ngay khi BE
  // lên, và admin đi sửa nhầm việc. Để trống ⇒ message của server đi thẳng ra UI; modal đề thi cắt
  // tiền tố mã bằng `paperServerMessage`.
  CHALLENGE_PAPER_STORAGE_UNAVAILABLE:
    "Kho lưu trữ tệp chưa sẵn sàng — báo kỹ thuật rồi thử lại sau.",
  CHALLENGE_NOT_PENDING:
    "Thử thách không còn ở trạng thái chờ duyệt — hãy làm mới hàng đợi rồi thử lại.",
  CHALLENGE_APPROVAL_FORBIDDEN: "Bạn không có quyền duyệt thử thách của môn này.",
  // Instructor payroll self-service (yêu cầu chi trả kỳ lương của chính mình).
  PAYROLL_BALANCE_NOT_ENOUGH:
    "Số dư thực nhận chưa đạt mức tối thiểu 50.000đ để yêu cầu chi trả.",
  // Admin payroll console (sửa phụ cấp / khoản trừ / đổi trạng thái kỳ lương). Mã KHỚP
  // PayrollError của BE (vn.ftes.aos.payroll) — sai tên → message mặc định, mất bản địa hoá.
  PAYROLL_ILLEGAL_TRANSITION:
    "Chuyển trạng thái lương không hợp lệ theo luồng OPEN → PENDING → CLOSE.",
  PAYROLL_EARNING_NOT_FOUND: "Không tìm thấy bản ghi lương tương ứng.",
  PAYROLL_EARNING_NOT_OPEN:
    "Kỳ lương không ở trạng thái OPEN — chỉ sửa được phụ cấp/khoản trừ khi đang mở.",
  PAYROLL_DEDUCTION_NOT_FOUND: "Không tìm thấy khoản trừ tương ứng.",
  PAYROLL_INVALID_AMOUNT: "Số tiền không hợp lệ (phải là số dương).",
  PAYROLL_NO_OPEN_BATCH: "Không có kỳ lương đang mở cho giảng viên này.",
  PAYROLL_FORBIDDEN: "Bạn không có quyền thao tác trên kỳ lương này.",
  // Kho câu hỏi (question-bank console) — tạo/xoá kho, tải lô ảnh, giải lại/xoá item. Mã KHỚP
  // QuestionBankError của BE (vn.ftes.aos.questionbank) — sai tên → message mặc định, mất bản địa hoá.
  QUESTION_BANK_NOT_FOUND: "Không tìm thấy kho câu hỏi tương ứng.",
  QUESTION_BANK_FORBIDDEN: "Bạn không có quyền thao tác trên kho câu hỏi này.",
  QUESTION_BANK_ITEM_NOT_FOUND: "Không tìm thấy ảnh/câu hỏi tương ứng trong kho.",
  QUESTION_BANK_UPLOAD_INVALID: "Tệp không hợp lệ — chỉ nhận ảnh webp/png/jpg (tối đa 50 ảnh).",
  QUESTION_BANK_AI_FAILED: 'AI chưa giải được ảnh này. Hãy thử "Giải lại".',
  // Kỳ học (terms console) — CRUD kỳ, thêm/gỡ khoá. Mã KHỚP TermError của BE (vn.ftes.aos.term) —
  // sai tên → message mặc định, mất bản địa hoá.
  TERM_NOT_FOUND: "Không tìm thấy kỳ học tương ứng.",
  TERM_CODE_TAKEN: "Mã kỳ đã tồn tại — hãy chọn mã khác.",
  TERM_VALIDATION:
    "Dữ liệu kỳ học không hợp lệ — kiểm tra mã, tên, và thời gian bắt đầu phải trước khi kết thúc.",
  TERM_COURSE_CONFLICT:
    "Khoá học đã thuộc một kỳ khác chưa kết thúc — mỗi khoá chỉ nằm trong tối đa một kỳ đang mở.",
  TERM_OVERLAP: "Kỳ học bị chồng thời gian với một kỳ khác.",
  // Cơ sở cộng đồng (community campuses console) — CRUD danh mục cơ sở. Mã KHỚP lỗi BE
  // (COMMUNITY_CAMPUS_*) — sai tên → message mặc định, mất bản địa hoá.
  COMMUNITY_CAMPUS_CODE_EXISTS: "Mã cơ sở đã tồn tại — hãy chọn mã khác.",
  COMMUNITY_CAMPUS_NOT_FOUND: "Không tìm thấy cơ sở tương ứng.",
  // Hàng đợi duyệt học liệu (`/academic/moderation`). Mã KHỚP ResourceException của BE
  // (vn.ftes.aos.resource) — sai tên → message mặc định, mất bản địa hoá. Hai người cùng dọn một
  // hàng đợi là chuyện thường ngày, nên NOT_FOUND/INVALID_STATE phải nói rõ "hãy làm mới" thay vì
  // để lộ mã thô khiến người duyệt tưởng hệ thống hỏng.
  RESOURCE_NOT_FOUND: "Không tìm thấy học liệu — có thể đã bị người khác xử lý hoặc đã xoá.",
  RESOURCE_INVALID_STATE:
    "Học liệu không còn ở trạng thái chờ duyệt — hãy làm mới hàng đợi rồi thử lại.",
  RESOURCE_FORBIDDEN: "Bạn không có quyền duyệt học liệu của môn này.",
  // Luồng tạo học liệu + nạp album ảnh FE (`POST /api/v1/resources/{id}/images`). Mã KHỚP
  // ResourceException của BE; xem chú thích getAdminErrorMessage về dạng message "MÃ: chi tiết".
  RESOURCE_RATE_LIMITED:
    "Máy chủ giới hạn tần suất tải ảnh (10 ảnh/phút, 60 ảnh/giờ) — chờ ít phút rồi tải tiếp.",
  RESOURCE_VALIDATION: "Dữ liệu không hợp lệ — kiểm tra lại định dạng tệp và số lượng ảnh.",
  RESOURCE_FILE_TOO_LARGE: "Tệp vượt quá giới hạn dung lượng của máy chủ.",
  RESOURCE_ACCESS_DENIED: "Bạn không có quyền thao tác trên học liệu này.",
  RESOURCE_UPLOAD_INCOMPLETE: "Nội dung tải lên không hợp lệ hoặc rỗng.",
  RESOURCE_STORAGE_UNAVAILABLE: "Kho lưu trữ tệp chưa sẵn sàng — báo kỹ thuật rồi thử lại sau.",
};

function getAdminErrorMessage(error: ApiError): string {
  const code = String(error.code);
  const msg = error.message;
  if (ADMIN_ERROR_MESSAGES[msg]) return ADMIN_ERROR_MESSAGES[msg];
  if (ADMIN_ERROR_MESSAGES[code]) return ADMIN_ERROR_MESSAGES[code];
  if (error.errorCode && ADMIN_ERROR_MESSAGES[error.errorCode]) {
    return ADMIN_ERROR_MESSAGES[error.errorCode];
  }
  // Một số handler của BE nhét mã vào ĐẦU message thay vì `data.errorCode` — vd
  // `ResourceExceptionHandler` trả {code, message: "RESOURCE_RATE_LIMITED: Vượt giới hạn tần suất",
  // data: null}. Không tra theo tiền tố thì mọi lỗi resource lộ nguyên mã thô ra UI.
  const prefix = msg.split(":", 1)[0].trim();
  if (prefix && ADMIN_ERROR_MESSAGES[prefix]) return ADMIN_ERROR_MESSAGES[prefix];
  if (msg.startsWith("ADMIN_CTV_EXPIRES_")) {
    return "Quyền CTV đã hết hạn hoặc sắp hết hạn, vui lòng gia hạn hoặc liên hệ quản trị viên.";
  }
  return msg || "Đã có lỗi xảy ra";
}

/**
 * Thông báo tiếng Việt cho MỌI loại lỗi admin (ApiError theo bảng mã, ForbiddenError, Error thường).
 * Export riêng để nơi tự hiển thị lỗi (vd `message.error` trong form khoá học) dùng CHUNG bảng map
 * với `handleAdminMutationError` — kẻo mã BE như COURSE_TYPE_DOWNGRADE_FORBIDDEN lộ nguyên xi ra UI.
 */
export function adminErrorMessage(error: unknown): string {
  if (error instanceof ForbiddenError) return error.message;
  if (error instanceof ApiError) return getAdminErrorMessage(error);
  if (error instanceof Error) return error.message || "Đã có lỗi xảy ra";
  return "Đã có lỗi xảy ra";
}

export function handleAdminMutationError(error: unknown) {
  notification.error({ message: adminErrorMessage(error) });
}
