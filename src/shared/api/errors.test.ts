import { describe, expect, it } from "vitest";
import { adminErrorMessage } from "./errors";
import { ApiError, ForbiddenError } from "./client";

// admin-course-management-refinements §5.3/§5.4 — mã lỗi course type guard phải ra tiếng Việt
// dễ hiểu, không lộ mã BE thô ra UI.

describe("adminErrorMessage — course type guard", () => {
  it("COURSE_TYPE_NOT_PACKAGE (envelope.message là mã) → giải thích LEGACY không có gói", () => {
    const msg = adminErrorMessage(new ApiError(400, "COURSE_TYPE_NOT_PACKAGE"));
    expect(msg).toBe("Khoá học loại LEGACY không hỗ trợ tạo gói học tập.");
  });

  it("COURSE_TYPE_DOWNGRADE_FORBIDDEN → giải thích không hạ cấp được", () => {
    const msg = adminErrorMessage(new ApiError(400, "COURSE_TYPE_DOWNGRADE_FORBIDDEN"));
    expect(msg).toBe("Không thể chuyển khoá học PACKAGE về LEGACY.");
  });

  it("mã nằm ở errorCode leaf (envelope.data.errorCode) cũng map được", () => {
    const msg = adminErrorMessage(
      new ApiError(400, "Bad Request", false, "COURSE_TYPE_DOWNGRADE_FORBIDDEN")
    );
    expect(msg).toBe("Không thể chuyển khoá học PACKAGE về LEGACY.");
  });
});

describe("adminErrorMessage — các nhánh còn lại", () => {
  it("mã lạ → giữ nguyên message BE (không nuốt thông tin)", () => {
    expect(adminErrorMessage(new ApiError(400, "SOMETHING_ELSE"))).toBe("SOMETHING_ELSE");
  });

  it("ForbiddenError → thông báo thiếu quyền", () => {
    expect(adminErrorMessage(new ForbiddenError([]))).toBe(
      "Bạn không có quyền thực hiện thao tác này"
    );
  });

  it("Error thường → dùng message; message rỗng → fallback", () => {
    expect(adminErrorMessage(new Error("mạng chập chờn"))).toBe("mạng chập chờn");
    expect(adminErrorMessage(new Error(""))).toBe("Đã có lỗi xảy ra");
  });

  it("giá trị không phải Error → fallback chung", () => {
    expect(adminErrorMessage("boom")).toBe("Đã có lỗi xảy ra");
    expect(adminErrorMessage(undefined)).toBe("Đã có lỗi xảy ra");
  });
});

// Nợ quality-loop admin-gamification-console (1.2) + admin-course-challenge-bank (1.3):
// mã lỗi gamification/challenge phải ra tiếng Việt dễ hiểu, không lộ mã BE thô.

describe("adminErrorMessage — gamification + challenge bank", () => {
  it("GAMIFICATION_INVALID_CONFIG → giải thích tổng xác suất = 1.0, không lộ mã thô", () => {
    const msg = adminErrorMessage(new ApiError(400, "GAMIFICATION_INVALID_CONFIG"));
    expect(msg).toContain("tổng xác suất");
    expect(msg).toContain("1.0");
    expect(msg).not.toContain("GAMIFICATION_INVALID_CONFIG");
  });

  it("CHALLENGE_INVALID_STATE qua errorCode leaf (envelope.data.errorCode) → message dễ hiểu", () => {
    const msg = adminErrorMessage(
      new ApiError(400, "Bad Request", false, "CHALLENGE_INVALID_STATE")
    );
    expect(msg).toContain("PUBLISHED/RUNNING");
    expect(msg).not.toContain("CHALLENGE_INVALID_STATE");
  });

  it("CHALLENGE_INVALID_STATE nằm ở envelope.message cũng map được", () => {
    expect(adminErrorMessage(new ApiError(400, "CHALLENGE_INVALID_STATE"))).toContain(
      "public lên Workplace"
    );
  });
});
