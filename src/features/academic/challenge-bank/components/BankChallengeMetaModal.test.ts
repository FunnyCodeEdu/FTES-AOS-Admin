import { describe, expect, it } from "vitest";
import { buildBankMetaPatch } from "./BankChallengeMetaModal";

// PATCH /admin/challenges/{id} là PARTIAL: field null = GIỮ NGUYÊN. Nên chỉ được đính field ĐỔI —
// gửi thừa một field là ghi đè dữ liệu người khác vừa sửa ở màn khác.

const original = { title: "Đề PE số 3", difficulty: "MEDIUM", subjectId: "sub-1" };

describe("buildBankMetaPatch", () => {
  it("không đổi gì → patch rỗng (caller khỏi bắn request)", () => {
    expect(
      buildBankMetaPatch(original, {
        title: "Đề PE số 3",
        difficulty: "MEDIUM",
        subjectId: "sub-1",
      })
    ).toEqual({});
  });

  it("bỏ khoảng trắng thừa của tiêu đề và chỉ gửi khi thực sự khác", () => {
    expect(
      buildBankMetaPatch(original, { title: "  Đề PE số 3  ", difficulty: "MEDIUM" })
    ).toEqual({});
    expect(buildBankMetaPatch(original, { title: "  Đề PE số 4 " })).toEqual({
      title: "Đề PE số 4",
    });
  });

  it("tiêu đề rỗng KHÔNG được gửi (tránh xoá trắng tiêu đề)", () => {
    expect(buildBankMetaPatch(original, { title: "   " })).toEqual({});
  });

  it("đổi độ khó / môn thì đính đúng field đó", () => {
    expect(buildBankMetaPatch(original, { title: original.title, difficulty: "HARD" })).toEqual({
      difficulty: "HARD",
    });
    expect(buildBankMetaPatch(original, { title: original.title, subjectId: "sub-2" })).toEqual({
      subjectId: "sub-2",
    });
  });

  it("challenge chưa phân loại (difficulty/subject null) → chọn giá trị đầu tiên là một thay đổi", () => {
    expect(
      buildBankMetaPatch(
        { title: "X", difficulty: null, subjectId: null },
        { title: "X", difficulty: "EASY", subjectId: "sub-9" }
      )
    ).toEqual({ difficulty: "EASY", subjectId: "sub-9" });
  });

  it("xoá trống ô độ khó KHÔNG gửi gì — PATCH partial không có cách nói 'xoá', tránh no-op giả", () => {
    expect(buildBankMetaPatch(original, { title: original.title, difficulty: undefined })).toEqual(
      {}
    );
  });
});
