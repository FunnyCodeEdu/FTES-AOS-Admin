import { describe, expect, it } from "vitest";
import { buildUpdateChallengePayload } from "./ChallengeEditModal";
import type { ChallengeView } from "../types";

// admin-challenge-edit: PATCH partial — chỉ đính field ĐỔI; free đọc từ giá trị hiện tại (không đè).

type Original = Pick<ChallengeView, "title" | "description" | "free">;

const original: Original = {
  title: "Thử thách tuần 1",
  description: "Mô tả cũ",
  free: false,
};

describe("buildUpdateChallengePayload (partial diff)", () => {
  it("không đổi gì → payload rỗng (không bắn request)", () => {
    expect(
      buildUpdateChallengePayload(original, {
        title: "Thử thách tuần 1",
        description: "Mô tả cũ",
        free: false,
      })
    ).toEqual({});
  });

  it("chỉ bật cờ học thử → chỉ gửi free (title/description giữ nguyên, không đính)", () => {
    expect(
      buildUpdateChallengePayload(original, {
        title: "Thử thách tuần 1",
        description: "Mô tả cũ",
        free: true,
      })
    ).toEqual({ free: true });
  });

  it("tắt cờ học thử khi đang bật → gửi free=false (sửa challenge bị đánh dấu nhầm)", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, free: true },
        { title: "Thử thách tuần 1", description: "Mô tả cũ", free: false }
      )
    ).toEqual({ free: false });
  });

  it("free absent ở bản gốc (response cũ) coi như false → không đổi khi form cũng false", () => {
    expect(
      buildUpdateChallengePayload(
        { title: "T", description: null, free: undefined },
        { title: "T", description: "", free: false }
      )
    ).toEqual({});
  });

  it("đổi tiêu đề (trim khoảng trắng) + mô tả cùng lúc", () => {
    expect(
      buildUpdateChallengePayload(original, {
        title: "  Thử thách tuần 2  ",
        description: "Mô tả mới",
        free: false,
      })
    ).toEqual({ title: "Thử thách tuần 2", description: "Mô tả mới" });
  });

  it("tiêu đề rỗng/khoảng trắng → KHÔNG gửi title (tránh xoá trắng title bắt buộc)", () => {
    expect(
      buildUpdateChallengePayload(original, {
        title: "   ",
        description: "Mô tả cũ",
        free: false,
      })
    ).toEqual({});
  });

  it("xoá mô tả (để trống) khi bản gốc có mô tả → gửi description rỗng", () => {
    expect(
      buildUpdateChallengePayload(original, {
        title: "Thử thách tuần 1",
        description: "",
        free: false,
      })
    ).toEqual({ description: "" });
  });

  it("mô tả gốc null, form vẫn trống → không đính description", () => {
    expect(
      buildUpdateChallengePayload(
        { title: "T", description: null, free: false },
        { title: "T", description: "", free: false }
      )
    ).toEqual({});
  });
});
