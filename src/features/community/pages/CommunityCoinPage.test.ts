import { describe, expect, it } from "vitest";
import { shouldSearchMembers } from "./CommunityCoinPage";

describe("shouldSearchMembers", () => {
  it("không tải danh sách hàng nghìn user khi chưa nhập đủ", () => {
    expect(shouldSearchMembers("")).toBe(false);
    expect(shouldSearchMembers(" a ")).toBe(false);
  });

  it("tìm từ 2 ký tự, kể cả email hoặc tên có khoảng trắng ngoài", () => {
    expect(shouldSearchMembers(" An ")).toBe(true);
    expect(shouldSearchMembers("ha@example.com")).toBe(true);
  });
});
