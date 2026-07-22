import { describe, expect, it } from "vitest";
import { assessPublishRisk, isPaidCourse } from "./publishRisk";

// Task 5.1 — BE change `challenge-lesson-level-access-gate`: cảnh báo confirm khi public
// WORKSPACE_PUBLIC challenge đang gắn bài thuộc khoá/gói trả phí (degrade: cảnh báo chung
// khi chỉ biết challenge CÓ gắn bài).

describe("isPaidCourse", () => {
  it("PACKAGE luôn coi là trả phí (FE không có freeLessonIds ở tab này)", () => {
    expect(isPaidCourse({ saleMode: "PACKAGE" })).toBe(true);
    expect(isPaidCourse({ saleMode: "PACKAGE", basePrice: 0 })).toBe(true);
  });

  it("LEGACY có basePrice > 0 là trả phí, basePrice = 0 là free", () => {
    expect(isPaidCourse({ saleMode: "LEGACY", basePrice: 500000 })).toBe(true);
    expect(isPaidCourse({ saleMode: "LEGACY", basePrice: 0 })).toBe(false);
  });

  it("thiếu cả basePrice lẫn saleMode → không kết luận được (undefined)", () => {
    expect(isPaidCourse({})).toBeUndefined();
    expect(isPaidCourse({ saleMode: "LEGACY" })).toBeUndefined();
  });
});

describe("assessPublishRisk", () => {
  const paidCourse = { saleMode: "LEGACY" as const, basePrice: 700000 };

  it("challenge KHÔNG gắn bài → confirm thường, không danger", () => {
    const risk = assessPublishRisk({ lessonId: null }, paidCourse);
    expect(risk.level).toBe("none");
    expect(risk.danger).toBe(false);
    expect(risk.title).toContain("Public thử thách");
  });

  it("gắn bài + khoá trả phí (basePrice > 0) → cảnh báo lộ nội dung trả phí, danger", () => {
    const risk = assessPublishRisk({ lessonId: "l1" }, paidCourse, "Phần 1 / Bài 1");
    expect(risk.level).toBe("paid-lesson");
    expect(risk.danger).toBe(true);
    expect(risk.content).toContain("TRẢ PHÍ");
    expect(risk.content).toContain("lộ nội dung trả phí");
    expect(risk.content).toContain('"Phần 1 / Bài 1"');
  });

  it("gắn bài + khoá PACKAGE → cũng là paid-lesson (conservative)", () => {
    const risk = assessPublishRisk({ lessonId: "l1" }, { saleMode: "PACKAGE" });
    expect(risk.level).toBe("paid-lesson");
    expect(risk.danger).toBe(true);
  });

  it("gắn bài nhưng thiếu dữ liệu giá → degrade cảnh báo chung (lesson-attached)", () => {
    const risk = assessPublishRisk({ lessonId: "l1" }, {});
    expect(risk.level).toBe("lesson-attached");
    expect(risk.danger).toBe(true);
    expect(risk.content).toContain("Không xác định được");
  });

  it("gắn bài + khoá LEGACY free (basePrice = 0) → không có gì để lộ, confirm thường", () => {
    const risk = assessPublishRisk(
      { lessonId: "l1" },
      { saleMode: "LEGACY", basePrice: 0 }
    );
    expect(risk.level).toBe("none");
    expect(risk.danger).toBe(false);
  });

  it("không truyền lessonName → nói chung chung 'một bài học', không kẹp ngoặc kép rỗng", () => {
    const risk = assessPublishRisk({ lessonId: "l-ngoai-khoa" }, paidCourse);
    expect(risk.content).toContain("một bài học");
    expect(risk.content).not.toContain('""');
  });
});
