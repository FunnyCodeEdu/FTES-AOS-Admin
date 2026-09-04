import { describe, expect, it } from "vitest";
import { criteriaFromRubrics, parsePresetJson } from "./presetImport";

describe("parsePresetJson", () => {
  it("đọc một bộ đơn lẻ", () => {
    const [p] = parsePresetJson(
      JSON.stringify({
        name: "LAB211 chuẩn",
        teacherName: "Thầy Trần Đình Trí",
        criteria: "Chấm theo 2 tiêu chí",
        rubrics: [{ criterion: "Đúng chức năng", maxScore: 70 }],
      }),
    );
    expect(p.teacherName).toBe("Thầy Trần Đình Trí");
    expect(p.rubrics).toHaveLength(1);
    expect(p.rubrics[0].maxScore).toBe(70);
  });

  it("nhận mảng, {items} và {presets} như nhau", () => {
    const one = { teacherName: "Cô A", rubrics: [{ criterion: "X", maxScore: 10 }] };
    expect(parsePresetJson(JSON.stringify([one, one]))).toHaveLength(2);
    expect(parsePresetJson(JSON.stringify({ items: [one] }))).toHaveLength(1);
    expect(parsePresetJson(JSON.stringify({ presets: [one] }))).toHaveLength(1);
  });

  it("chấp nhận snake_case và tên khoá tiếng Việt của file sưu tầm", () => {
    const [p] = parsePresetJson(
      JSON.stringify({
        teacher_name: "Thầy B",
        subject_code: "LAB211",
        rubrics: [{ name: "Thiết kế lớp", max_score: "25", desc: "tách lớp hợp lý" }],
      }),
    );
    expect(p.subjectCode).toBe("LAB211");
    expect(p.rubrics[0].criterion).toBe("Thiết kế lớp");
    expect(p.rubrics[0].maxScore).toBe(25);
    expect(p.rubrics[0].description).toBe("tách lớp hợp lý");
  });

  it("thiếu criteria thì dựng từ rubric chứ không để rỗng", () => {
    // BE fallback criteria về MÔ TẢ ĐỀ khi rỗng ⇒ model được bảo "chấm theo đề bài".
    const [p] = parsePresetJson(
      JSON.stringify({
        teacherName: "Cô C",
        rubrics: [
          { criterion: "Đúng chức năng", maxScore: 60 },
          { criterion: "Chất lượng code", maxScore: 40 },
        ],
      }),
    );
    expect(p.criteria).toContain("thang 100 điểm");
    expect(p.criteria).toContain("Đúng chức năng (60 điểm)");
  });

  it("báo lỗi có chỉ số khi thiếu thứ không suy ra được", () => {
    expect(() => parsePresetJson("{}")).toThrow(/thiếu tên giảng viên/);
    expect(() => parsePresetJson(JSON.stringify({ teacherName: "A" }))).toThrow(/không có gì để chấm/);
    expect(() =>
      parsePresetJson(JSON.stringify({ teacherName: "A", rubrics: [{ maxScore: 5 }] })),
    ).toThrow(/thứ 1 thiếu tên/);
    expect(() => parsePresetJson("khong phai json")).toThrow(/không phải JSON/);
    expect(() => parsePresetJson("   ")).toThrow(/Chưa có nội dung/);
  });

  it("điểm âm bị chặn", () => {
    expect(() =>
      parsePresetJson(JSON.stringify({ teacherName: "A", rubrics: [{ criterion: "X", maxScore: -1 }] })),
    ).toThrow(/điểm âm/);
  });
});

describe("criteriaFromRubrics", () => {
  it("rỗng trả chuỗi rỗng để nơi gọi tự quyết", () => {
    expect(criteriaFromRubrics([])).toBe("");
  });

  it("cộng đúng thang điểm", () => {
    const text = criteriaFromRubrics([
      { criterion: "A", maxScore: 30, orderNo: 1, description: null },
      { criterion: "B", maxScore: 20, orderNo: 2, description: null },
    ]);
    expect(text).toContain("thang 50 điểm");
  });
});
