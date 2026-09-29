import { describe, expect, it } from "vitest";
import {
  DEFAULT_LESSON_COLUMN_WIDTH,
  MAX_LESSON_COLUMN_WIDTH,
  MIN_LESSON_COLUMN_WIDTH,
  normalizeLessonColumnWidth,
} from "./lessonColumnResize";

describe("normalizeLessonColumnWidth", () => {
  it("dùng độ rộng mặc định khi chưa có giá trị hợp lệ", () => {
    expect(normalizeLessonColumnWidth(null)).toBe(DEFAULT_LESSON_COLUMN_WIDTH);
    expect(normalizeLessonColumnWidth("không-phải-số")).toBe(DEFAULT_LESSON_COLUMN_WIDTH);
  });

  it("giữ độ rộng trong giới hạn để bảng không bị vỡ", () => {
    expect(normalizeLessonColumnWidth(100)).toBe(MIN_LESSON_COLUMN_WIDTH);
    expect(normalizeLessonColumnWidth(520)).toBe(520);
    expect(normalizeLessonColumnWidth(2_000)).toBe(MAX_LESSON_COLUMN_WIDTH);
  });
});
