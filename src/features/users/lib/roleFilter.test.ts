import { describe, expect, it } from "vitest";
import { buildUserRoleFilterOptions } from "./roleFilter";

describe("user role filter options", () => {
  it("uses the role code as the backend filter value", () => {
    expect(
      buildUserRoleFilterOptions([
        { code: "STUDENT", name: "Học viên" },
        { code: "LECTURER", name: "Giảng viên" },
      ])
    ).toEqual([
      { label: "Giảng viên (LECTURER)", value: "LECTURER" },
      { label: "Học viên (STUDENT)", value: "STUDENT" },
    ]);
  });

  it("uses only the code when the role name is identical", () => {
    expect(buildUserRoleFilterOptions([{ code: "STUDENT", name: "STUDENT" }])).toEqual([
      { label: "STUDENT", value: "STUDENT" },
    ]);
  });

  it("trims values, ignores blank codes and removes duplicate role codes", () => {
    expect(
      buildUserRoleFilterOptions([
        { code: " STUDENT ", name: " Học viên " },
        { code: "STUDENT", name: "Trùng" },
        { code: " ", name: "Không hợp lệ" },
      ])
    ).toEqual([{ label: "Học viên (STUDENT)", value: "STUDENT" }]);
  });
});
