import { describe, expect, it } from "vitest";
import { activePackages, packageLabel, pickDefaultPackageId } from "./coursePackagePicker";
import { canSubmitBulkEnroll } from "./bulkEnroll";
import type { CoursePackage } from "../../types";

// course-package-enrollment-parity — chọn gói khi admin cấp học viên vào khoá bán theo gói.

function pkg(over: Partial<CoursePackage> & { id: string }): CoursePackage {
  return {
    name: `Gói ${over.id}`,
    slug: over.id,
    status: "ACTIVE",
    entitlements: [],
    ...over,
  } as CoursePackage;
}

describe("pickDefaultPackageId", () => {
  it("ưu tiên gói mặc định đang bán", () => {
    const list = [pkg({ id: "a" }), pkg({ id: "b", defaultPackage: true }), pkg({ id: "c" })];
    expect(pickDefaultPackageId(list)).toBe("b");
  });

  it("khoá đúng một gói đang bán thì chọn luôn gói đó", () => {
    const list = [pkg({ id: "a" }), pkg({ id: "z", status: "ARCHIVED" })];
    expect(pickDefaultPackageId(list)).toBe("a");
  });

  // Chỗ admin đang mù: nhiều gói, không gói nào mặc định → KHÔNG chọn hộ, bắt admin tự chọn.
  it("nhiều gói không có mặc định thì không chọn hộ", () => {
    expect(pickDefaultPackageId([pkg({ id: "a" }), pkg({ id: "b" })])).toBeUndefined();
  });

  it("gói mặc định đã ngừng bán thì không được chọn", () => {
    const list = [pkg({ id: "old", defaultPackage: true, status: "ARCHIVED" }), pkg({ id: "new" })];
    expect(pickDefaultPackageId(list)).toBe("new");
  });

  it("khoá chưa có gói nào", () => {
    expect(pickDefaultPackageId([])).toBeUndefined();
    expect(pickDefaultPackageId(undefined)).toBeUndefined();
  });
});

describe("activePackages", () => {
  it("chỉ giữ gói ACTIVE (không phân biệt hoa thường)", () => {
    const list = [pkg({ id: "a", status: "active" }), pkg({ id: "b", status: "ARCHIVED" })];
    expect(activePackages(list).map((p) => p.id)).toEqual(["a"]);
  });
});

describe("packageLabel", () => {
  it("kèm giá, dấu mặc định và dấu ngừng bán", () => {
    expect(packageLabel(pkg({ id: "a", name: "Gói Zoom", salePrice: 499000, defaultPackage: true })))
      .toBe("Gói Zoom — 499.000đ · mặc định");
    expect(packageLabel(pkg({ id: "b", name: "Gói cũ", salePrice: 0, status: "ARCHIVED" })))
      .toBe("Gói cũ — 0đ · đã ngừng bán");
    expect(packageLabel(pkg({ id: "c", name: "Chưa giá" }))).toBe("Chưa giá — chưa đặt giá");
  });
});

describe("canSubmitBulkEnroll", () => {
  it("cần có username VÀ (nếu khoá bán theo gói) đã chọn gói", () => {
    expect(canSubmitBulkEnroll(0, false)).toBe(false);
    expect(canSubmitBulkEnroll(2, false)).toBe(true);
    expect(canSubmitBulkEnroll(2, true)).toBe(false);
  });
});
