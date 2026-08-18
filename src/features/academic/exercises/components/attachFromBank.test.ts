import { describe, expect, it } from "vitest";
import { bankParamsForLesson, isAlreadyInLesson } from "./AttachFromBankModal";
import { buildBankQueryParams } from "../../challenge-bank/api/bankQuery";
import type { BankChallengeRow } from "../../challenge-bank/types";

/**
 * "Thêm từ kho" — đường DÙNG LẠI một thử thách của môn/khoá khác trong một bài học.
 *
 * Hai quyết định của màn này hỏng theo kiểu IM LẶNG (không lỗi, không log, chỉ là kết quả sai),
 * nên chúng được tách ra thành hàm thuần và ghim ở đây:
 *
 *  1. Bộ lọc gửi lên kho KHÔNG được mang `onlyUnattached` / `subjectId` / `courseId`. Bài cần tìm
 *     gần như luôn là bài đã gắn ở đâu đó — lọc mất đúng tập đó thì màn hình hiện "không có thử
 *     thách nào khớp" như thể kho rỗng, và người dùng kết luận tính năng không chạy.
 *  2. Bài đã nằm trong CHÍNH bài học này thì không mời bấm nữa (BE idempotent nên bấm cũng vô hại,
 *     nhưng một cái nút không làm gì là một cái nút nói dối).
 */

const row = (placements: Array<{ lessonId: string }>): BankChallengeRow => ({
  id: "c1",
  title: "Tổng hai số",
  slug: "tong-hai-so",
  type: "CODING",
  status: "PUBLISHED",
  placements: placements.map((p, i) => ({
    id: `p${i}`,
    lessonId: p.lessonId,
    courseId: null,
    orderNo: i,
  })),
});

describe("bankParamsForLesson", () => {
  it("tìm trong kho CHUNG: không ghim môn/khoá, không lọc chưa-gắn", () => {
    const params = bankParamsForLesson({ q: "", tags: [], page: 1 });

    expect(params.onlyUnattached).toBeUndefined();
    expect(params.subjectId).toBeUndefined();
    expect(params.courseId).toBeUndefined();
  });

  it("bỏ trống thì không gửi bộ lọc rỗng lên server", () => {
    const params = bankParamsForLesson({ q: "   ", tags: [], type: undefined, page: 1 });

    expect(params.q).toBeUndefined();
    expect(params.tags).toBeUndefined();
    expect(params.type).toBeUndefined();
  });

  it("giữ nguyên từ khoá, tag và loại khi có", () => {
    const params = bankParamsForLesson({ q: "  tổng  ", tags: ["pe", "mae101"], type: "SQL", page: 3 });

    expect(params.q).toBe("tổng");
    expect(params.tags).toEqual(["pe", "mae101"]);
    expect(params.type).toBe("SQL");
    expect(params.page).toBe(3);
  });

  it("đi qua buildBankQueryParams ra đúng query của kho (page hạ về 0-based)", () => {
    // Ghim luôn chỗ nối: trang ở tầng UI là 1-based, BE nhận 0-based.
    const query = buildBankQueryParams(bankParamsForLesson({ q: "x", tags: ["pe"], page: 2 }));

    expect(query.page).toBe(1);
    expect(query.tags).toEqual(["pe"]);
    expect(query).not.toHaveProperty("onlyUnattached");
    expect(query).not.toHaveProperty("courseId");
  });
});

describe("isAlreadyInLesson", () => {
  it("bài đang dùng ở bài học KHÁC thì vẫn nhặt được — đó là cả mục đích", () => {
    expect(isAlreadyInLesson(row([{ lessonId: "lesson-mon-a" }]), "lesson-mon-b")).toBe(false);
  });

  it("bài đã nằm trong chính bài này thì thôi mời bấm", () => {
    expect(isAlreadyInLesson(row([{ lessonId: "lesson-b" }]), "lesson-b")).toBe(true);
  });

  it("bài chưa gắn đâu cả vẫn nhặt được", () => {
    expect(isAlreadyInLesson(row([]), "lesson-b")).toBe(false);
  });

  it("thiếu hẳn trường placements (backend cũ) không làm vỡ", () => {
    const legacy = { ...row([]), placements: undefined } as BankChallengeRow;

    expect(isAlreadyInLesson(legacy, "lesson-b")).toBe(false);
  });
});
