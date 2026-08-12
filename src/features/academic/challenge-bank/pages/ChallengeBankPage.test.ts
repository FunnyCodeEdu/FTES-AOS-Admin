import { describe, expect, it } from "vitest";

// jsdom không có window.matchMedia, nhưng chain import của trang (uiStore) gọi nó ngay lúc import.
// Polyfill TRƯỚC rồi mới dynamic-import (import tĩnh bị hoist lên trên polyfill).
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

const { placementCount } = await import("./ChallengeBankPage");

// Cột "Đang dùng" nói challenge đang phục vụ bao nhiêu BÀI. `placements` là nguồn thật (nhiều-nhiều);
// `lessonId` chỉ là placement CHÍNH và là thứ duy nhất response cũ có.
describe("placementCount", () => {
  it("đếm theo placements khi BE trả mảng", () => {
    expect(
      placementCount({
        id: "c1",
        title: "t",
        slug: "s",
        type: "CODE",
        status: "DRAFT",
        placements: [
          { id: "p1", lessonId: "l1", courseId: "co1", orderNo: 1 },
          { id: "p2", lessonId: "l2", courseId: "co2", orderNo: 1 },
        ],
      })
    ).toBe(2);
  });

  it("mảng placements RỖNG là 'chưa gắn' — kể cả khi lessonId còn sót giá trị cũ", () => {
    expect(
      placementCount({
        id: "c1",
        title: "t",
        slug: "s",
        type: "CODE",
        status: "DRAFT",
        lessonId: "l1",
        placements: [],
      })
    ).toBe(0);
  });

  it("response cũ không có placements → suy từ lessonId", () => {
    const base = { id: "c1", title: "t", slug: "s", type: "CODE", status: "DRAFT" };
    expect(placementCount({ ...base, lessonId: "l1" })).toBe(1);
    expect(placementCount({ ...base, lessonId: null })).toBe(0);
    expect(placementCount(base)).toBe(0);
  });
});
