import { describe, expect, it } from "vitest";
import { saleModeHint, saleModeOptions } from "./CourseFormModal";
import { validateCourseThumbnail } from "./CourseThumbnailUpload";

// admin-course-management-refinements §5.4 — toggle đổi type: chặn chọn LEGACY khi course đang
// PACKAGE (BE guard COURSE_TYPE_DOWNGRADE_FORBIDDEN), cho phép nâng LEGACY→PACKAGE khi sửa.

function option(options: ReturnType<typeof saleModeOptions>, value: string) {
  const found = options.find((o) => o.value === value);
  if (!found) throw new Error(`missing option ${value}`);
  return found;
}

describe("saleModeOptions", () => {
  it("sửa khoá PACKAGE → LEGACY bị mờ (chặn hạ cấp ngay từ UI)", () => {
    const options = saleModeOptions("PACKAGE", true);
    expect(option(options, "LEGACY").disabled).toBe(true);
    expect(option(options, "PACKAGE").disabled).toBe(false);
  });

  it("sửa khoá LEGACY → được chọn cả hai (nâng cấp LEGACY→PACKAGE là hợp lệ)", () => {
    const options = saleModeOptions("LEGACY", true);
    expect(option(options, "LEGACY").disabled).toBe(false);
    expect(option(options, "PACKAGE").disabled).toBe(false);
  });

  it("tạo mới → PACKAGE bị mờ (BE luôn tạo LEGACY, create body không nhận saleMode)", () => {
    const options = saleModeOptions(undefined, false);
    expect(option(options, "PACKAGE").disabled).toBe(true);
    expect(option(options, "LEGACY").disabled).toBe(false);
  });
});

describe("saleModeHint", () => {
  it("giải thích đúng từng ngữ cảnh", () => {
    expect(saleModeHint(undefined, false)).toContain("LEGACY");
    expect(saleModeHint("PACKAGE", true)).toBe("Khoá PACKAGE không thể chuyển về LEGACY.");
    expect(saleModeHint("LEGACY", true)).toContain("KHÔNG thể chuyển ngược");
  });
});

describe("validateCourseThumbnail", () => {
  it("nhận PNG/JPEG/WebP hợp lệ và chặn file giả loại hoặc quá 10MB", () => {
    expect(validateCourseThumbnail({ size: 1024, type: "image/png" })).toBeNull();
    expect(validateCourseThumbnail({ size: 1024, type: "application/pdf" })).toContain("PNG");
    expect(validateCourseThumbnail({ size: 10 * 1024 * 1024 + 1, type: "image/jpeg" })).toContain(
      "10MB"
    );
  });
});
