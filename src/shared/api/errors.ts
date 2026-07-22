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
};

function getAdminErrorMessage(error: ApiError): string {
  const code = String(error.code);
  const msg = error.message;
  if (ADMIN_ERROR_MESSAGES[msg]) return ADMIN_ERROR_MESSAGES[msg];
  if (ADMIN_ERROR_MESSAGES[code]) return ADMIN_ERROR_MESSAGES[code];
  if (error.errorCode && ADMIN_ERROR_MESSAGES[error.errorCode]) {
    return ADMIN_ERROR_MESSAGES[error.errorCode];
  }
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
