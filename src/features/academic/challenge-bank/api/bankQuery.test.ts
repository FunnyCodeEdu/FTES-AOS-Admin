import { describe, expect, it } from "vitest";
import { buildBankQueryParams, buildReviewQueueParams, hasActiveBankFilters } from "./bankQuery";
import type { BankSearchParams } from "../types";

const base: BankSearchParams = { page: 1, pageSize: 20 };

describe("buildBankQueryParams", () => {
  it("hạ page 1-based của UI xuống 0-based của BE", () => {
    expect(buildBankQueryParams({ ...base, page: 1 }).page).toBe(0);
    expect(buildBankQueryParams({ ...base, page: 4 }).page).toBe(3);
  });

  it("không bao giờ gửi page âm (page=0 do state lỗi vẫn ra 0)", () => {
    expect(buildBankQueryParams({ ...base, page: 0 }).page).toBe(0);
  });

  it("bỏ hẳn field rỗng thay vì gửi chuỗi rỗng (status='' là bộ lọc THẬT ở BE)", () => {
    const params = buildBankQueryParams({ ...base, q: "   ", status: "", type: undefined });
    expect(params).not.toHaveProperty("q");
    expect(params).not.toHaveProperty("status");
    expect(params).not.toHaveProperty("type");
  });

  it("giữ tags dạng mảng (axios serialize thành repeated param) và bỏ phần tử rỗng", () => {
    const params = buildBankQueryParams({ ...base, tags: [" pe ", "", "mae101"] });
    expect(params.tags).toEqual(["pe", "mae101"]);
  });

  it("bỏ tags khi mảng rỗng", () => {
    expect(buildBankQueryParams({ ...base, tags: [] })).not.toHaveProperty("tags");
  });

  it("free là ba trạng thái: false vẫn gửi, undefined thì không", () => {
    expect(buildBankQueryParams({ ...base, free: false }).free).toBe(false);
    expect(buildBankQueryParams({ ...base, free: true }).free).toBe(true);
    expect(buildBankQueryParams(base)).not.toHaveProperty("free");
  });

  it("onlyUnattached chỉ gửi khi bật", () => {
    expect(buildBankQueryParams({ ...base, onlyUnattached: true }).onlyUnattached).toBe(true);
    expect(buildBankQueryParams({ ...base, onlyUnattached: false })).not.toHaveProperty(
      "onlyUnattached"
    );
  });

  it("gửi đủ bộ lọc còn lại nguyên vẹn", () => {
    const params = buildBankQueryParams({
      ...base,
      type: "CODE",
      difficulty: "HARD",
      subjectId: "sub-1",
      courseId: "course-1",
      status: "PENDING_APPROVAL",
      pageSize: 50,
    });
    expect(params).toMatchObject({
      type: "CODE",
      difficulty: "HARD",
      subjectId: "sub-1",
      courseId: "course-1",
      status: "PENDING_APPROVAL",
      size: 50,
    });
  });
});

describe("buildReviewQueueParams", () => {
  it("cũng hạ page về 0-based và bỏ subjectId rỗng", () => {
    expect(buildReviewQueueParams({ page: 2, pageSize: 10 })).toEqual({ page: 1, size: 10 });
    expect(buildReviewQueueParams({ page: 1, pageSize: 10, subjectId: "s1" })).toEqual({
      page: 0,
      size: 10,
      subjectId: "s1",
    });
  });
});

describe("hasActiveBankFilters", () => {
  it("phân trang KHÔNG tính là bộ lọc", () => {
    expect(hasActiveBankFilters({ page: 3, pageSize: 50 })).toBe(false);
  });

  it("nhận ra từng loại bộ lọc", () => {
    expect(hasActiveBankFilters({ ...base, q: "pe" })).toBe(true);
    expect(hasActiveBankFilters({ ...base, tags: ["pe"] })).toBe(true);
    expect(hasActiveBankFilters({ ...base, onlyUnattached: true })).toBe(true);
    expect(hasActiveBankFilters({ ...base, free: false })).toBe(true);
    expect(hasActiveBankFilters({ ...base, q: "  " })).toBe(false);
  });
});
