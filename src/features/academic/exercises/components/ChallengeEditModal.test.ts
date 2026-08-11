import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import {
  buildUpdateChallengePayload,
  challengeScheduleToRange,
  resolveOriginalSeedSql,
  resolveOriginalStarterCode,
  starterCodeMapsEqual,
} from "./ChallengeEditModal";
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

  // admin-challenge-unified-form §④: CODE (bài NỘP) sửa được cách nộp + đuôi file (partial diff).
  it("type != CODE → bỏ qua submissionMethod/fileExtension dù form có giá trị", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "MULTIPLE_CHOICE" },
        { title: "Thử thách tuần 1", description: "Mô tả cũ", free: false, submissionMethod: "FILE", fileExtension: ".zip" }
      )
    ).toEqual({});
  });

  it("CODE: đổi cách nộp GITHUB→BOTH + thêm đuôi file → đính cả hai", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE", submissionMethod: "GITHUB", fileExtension: null },
        { title: "Thử thách tuần 1", description: "Mô tả cũ", free: false, submissionMethod: "BOTH", fileExtension: ".zip,.sql" }
      )
    ).toEqual({ submissionMethod: "BOTH", fileExtension: ".zip,.sql" });
  });

  it("CODE: chuyển về GITHUB → xoá whitelist đuôi file (gửi fileExtension rỗng)", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE", submissionMethod: "FILE", fileExtension: ".zip" },
        { title: "Thử thách tuần 1", description: "Mô tả cũ", free: false, submissionMethod: "GITHUB", fileExtension: ".zip" }
      )
    ).toEqual({ submissionMethod: "GITHUB", fileExtension: "" });
  });

  it("CODE: không đổi cách nộp/đuôi file → không đính", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE", submissionMethod: "BOTH", fileExtension: ".zip" },
        { title: "Thử thách tuần 1", description: "Mô tả cũ", free: false, submissionMethod: "BOTH", fileExtension: ".zip" }
      )
    ).toEqual({});
  });

  // code-sandbox-assignment §2C: seedSql (flat field, BE merge vào grading_config) — chỉ khi whitelist .sql.
  it("§2C CODE whitelist .sql: nạp seed mới khác seed cũ → đính seedSql (flat)", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE", submissionMethod: "FILE", fileExtension: ".sql", seedSql: "OLD;" },
        {
          title: "Thử thách tuần 1",
          description: "Mô tả cũ",
          free: false,
          submissionMethod: "FILE",
          fileExtension: ".sql",
          seedSql: "  NEW;  ",
        }
      )
    ).toEqual({ seedSql: "NEW;" });
  });

  it("§2C CODE whitelist .sql: seed không đổi (khớp seed cũ) → không đính", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE", submissionMethod: "BOTH", fileExtension: ".zip,.sql", seedSql: "SELECT 1;" },
        {
          title: "Thử thách tuần 1",
          description: "Mô tả cũ",
          free: false,
          submissionMethod: "BOTH",
          fileExtension: ".zip,.sql",
          seedSql: "SELECT 1;",
        }
      )
    ).toEqual({});
  });

  it("§2C CODE whitelist KHÔNG có .sql → bỏ seedSql dù form có giá trị", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE", submissionMethod: "FILE", fileExtension: ".py" },
        {
          title: "Thử thách tuần 1",
          description: "Mô tả cũ",
          free: false,
          submissionMethod: "FILE",
          fileExtension: ".py",
          seedSql: "SELECT 1;",
        }
      )
    ).toEqual({});
  });

  it("§2C GITHUB (không nộp file) → bỏ seedSql dù form có giá trị", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE", submissionMethod: "GITHUB", fileExtension: null },
        {
          title: "Thử thách tuần 1",
          description: "Mô tả cũ",
          free: false,
          submissionMethod: "GITHUB",
          fileExtension: ".sql",
          seedSql: "SELECT 1;",
        }
      )
    ).toEqual({});
  });

  it("§2C seed cũ đọc fallback từ gradingConfig (không có top-level seedSql) → khớp thì không đính", () => {
    expect(
      buildUpdateChallengePayload(
        {
          ...original,
          type: "CODE",
          submissionMethod: "FILE",
          fileExtension: ".sql",
          gradingConfig: JSON.stringify({ question: "q", seedSql: "SELECT 1;" }),
        },
        {
          title: "Thử thách tuần 1",
          description: "Mô tả cũ",
          free: false,
          submissionMethod: "FILE",
          fileExtension: ".sql",
          seedSql: "SELECT 1;",
        }
      )
    ).toEqual({});
  });

  // algo-testcase-starter §3: starterCode (flat map, BE merge vào grading_config) — áp cho mọi bài CODE.
  it("§3 CODE: thêm sườn ngôn ngữ (chưa có) → đính starterCode (flat map)", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE" },
        {
          title: "Thử thách tuần 1",
          description: "Mô tả cũ",
          free: false,
          starterCode: [{ language: "python", code: "def solve():\n    pass" }],
        }
      )
    ).toEqual({ starterCode: { python: "def solve():\n    pass" } });
  });

  it("§3 CODE: sườn không đổi (khớp gradingConfig.starterCode, khác thứ tự) → không đính", () => {
    expect(
      buildUpdateChallengePayload(
        {
          ...original,
          type: "CODE",
          gradingConfig: JSON.stringify({ starterCode: { python: "p", java: "j" } }),
        },
        {
          title: "Thử thách tuần 1",
          description: "Mô tả cũ",
          free: false,
          starterCode: [
            { language: "java", code: "j" },
            { language: "python", code: "p" },
          ],
        }
      )
    ).toEqual({});
  });

  it("§3 CODE: sửa nội dung 1 sườn → đính map mới", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE", gradingConfig: JSON.stringify({ starterCode: { python: "old" } }) },
        {
          title: "Thử thách tuần 1",
          description: "Mô tả cũ",
          free: false,
          starterCode: [{ language: "python", code: "new" }],
        }
      )
    ).toEqual({ starterCode: { python: "new" } });
  });

  it("§3 CODE: xoá hết sườn (trước có) → đính map rỗng để BE xoá", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE", gradingConfig: JSON.stringify({ starterCode: { python: "p" } }) },
        { title: "Thử thách tuần 1", description: "Mô tả cũ", free: false, starterCode: [] }
      )
    ).toEqual({ starterCode: {} });
  });

  it("§3 type != CODE → bỏ qua starterCode dù form có giá trị", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "MULTIPLE_CHOICE" },
        {
          title: "Thử thách tuần 1",
          description: "Mô tả cũ",
          free: false,
          starterCode: [{ language: "python", code: "x" }],
        }
      )
    ).toEqual({});
  });
});

// challenge-testcase-editor §4 (BE challenge-testcase-judge §7): PATCH null = GIỮ NGUYÊN, nên GỠ mốc
// đã đặt phải gửi cờ clearStartsAt/clearEndsAt — không có cờ thì "mở vô hạn" là trạng thái KHÔNG THỂ
// tới được sau khi challenge đã có hạn đóng.
describe("§4 buildUpdateChallengePayload — lịch mở → đóng", () => {
  const base = { title: "Thử thách tuần 1", description: "Mô tả cũ", free: false };
  const scheduled = {
    ...original,
    startsAt: "2026-07-01T00:00:00.000Z",
    endsAt: "2026-08-01T00:00:00.000Z",
  };

  it("KHÔNG đụng lịch (range undefined) → không đính startsAt/endsAt/cờ clear", () => {
    expect(buildUpdateChallengePayload(scheduled, { ...base })).toEqual({});
  });

  it("giữ nguyên đúng 2 mốc đang lưu → không đính (so theo epoch, không so chuỗi)", () => {
    expect(
      buildUpdateChallengePayload(scheduled, {
        ...base,
        range: [dayjs(scheduled.startsAt), dayjs(scheduled.endsAt)],
      })
    ).toEqual({});
  });

  it("ĐẶT hạn đóng (challenge đang vô hạn) → gửi endsAt ISO, không gửi cờ clear", () => {
    const patch = buildUpdateChallengePayload(
      { ...original, startsAt: "2026-07-01T00:00:00.000Z", endsAt: null },
      { ...base, range: [dayjs("2026-07-01T00:00:00.000Z"), dayjs("2026-09-01T00:00:00.000Z")] }
    );
    expect(patch).toEqual({ endsAt: "2026-09-01T00:00:00.000Z" });
    expect(patch.clearEndsAt).toBeUndefined();
  });

  it("ĐỔI hạn đóng sang mốc khác → gửi endsAt mới", () => {
    expect(
      buildUpdateChallengePayload(scheduled, {
        ...base,
        range: [dayjs(scheduled.startsAt), dayjs("2026-08-15T10:30:00.000Z")],
      })
    ).toEqual({ endsAt: "2026-08-15T10:30:00.000Z" });
  });

  it("XOÁ hạn đóng đã đặt → gửi clearEndsAt:true (KHÔNG gửi endsAt null — BE hiểu là giữ nguyên)", () => {
    const patch = buildUpdateChallengePayload(scheduled, {
      ...base,
      range: [dayjs(scheduled.startsAt), null],
    });
    expect(patch).toEqual({ clearEndsAt: true });
    expect("endsAt" in patch).toBe(false);
  });

  it("challenge vốn đã vô hạn + vẫn để trống → không gửi cờ clear (không có gì đổi)", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, startsAt: null, endsAt: null },
        { ...base, range: [null, null] }
      )
    ).toEqual({});
  });

  it("sentinel 2999 = vô hạn: để trống vế đóng KHÔNG phải thay đổi", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, startsAt: "2026-07-01T00:00:00.000Z", endsAt: "2999-12-31T00:00:00.000Z" },
        { ...base, range: [dayjs("2026-07-01T00:00:00.000Z"), null] }
      )
    ).toEqual({});
  });

  it("vế MỞ: xoá mốc đã đặt → clearStartsAt:true; đặt mốc khác → startsAt", () => {
    expect(
      buildUpdateChallengePayload(scheduled, { ...base, range: [null, dayjs(scheduled.endsAt)] })
    ).toEqual({ clearStartsAt: true });
    expect(
      buildUpdateChallengePayload(scheduled, {
        ...base,
        range: [dayjs("2026-07-05T00:00:00.000Z"), dayjs(scheduled.endsAt)],
      })
    ).toEqual({ startsAt: "2026-07-05T00:00:00.000Z" });
  });

  it("RangePicker xoá sạch (range = null) → gỡ CẢ HAI mốc bằng cờ clear", () => {
    expect(buildUpdateChallengePayload(scheduled, { ...base, range: null })).toEqual({
      clearStartsAt: true,
      clearEndsAt: true,
    });
  });

  it("đổi lịch cùng lúc với field khác → đính đủ cả hai (partial-diff không loại trừ nhau)", () => {
    expect(
      buildUpdateChallengePayload(scheduled, {
        ...base,
        free: true,
        range: [dayjs(scheduled.startsAt), null],
      })
    ).toEqual({ free: true, clearEndsAt: true });
  });
});

describe("§4 challengeScheduleToRange (pre-fill RangePicker)", () => {
  it("mốc đóng vắng → ô trống (Không giới hạn); mốc mở giữ nguyên", () => {
    const [opensAt, closesAt] = challengeScheduleToRange({
      startsAt: "2026-07-01T00:00:00.000Z",
      endsAt: null,
    });
    expect(opensAt?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(closesAt).toBeNull();
  });

  it("sentinel 2999 → ô trống thay vì in ra năm 2999", () => {
    expect(
      challengeScheduleToRange({ startsAt: null, endsAt: "2999-12-31T00:00:00.000Z" })[1]
    ).toBeNull();
  });

  it("cả hai mốc hợp lệ → 2 dayjs; mốc mở hỏng/vắng → null", () => {
    const [opensAt, closesAt] = challengeScheduleToRange({
      startsAt: "2026-07-01T00:00:00.000Z",
      endsAt: "2026-08-01T00:00:00.000Z",
    });
    expect(opensAt?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(closesAt?.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(challengeScheduleToRange({ startsAt: "khong-phai-ngay", endsAt: null })[0]).toBeNull();
  });
});

describe("§2C resolveOriginalSeedSql (pre-fill + diff nguồn seed)", () => {
  it("ưu tiên top-level seedSql, trim", () => {
    expect(resolveOriginalSeedSql({ seedSql: "  A;  ", gradingConfig: '{"seedSql":"B;"}' })).toBe("A;");
  });

  it("fallback parse gradingConfig khi thiếu top-level", () => {
    expect(resolveOriginalSeedSql({ gradingConfig: '{"seedSql":"B;"}' })).toBe("B;");
  });

  it("gradingConfig không có key seedSql / JSON hỏng / rỗng → ''", () => {
    expect(resolveOriginalSeedSql({ gradingConfig: '{"question":"q"}' })).toBe("");
    expect(resolveOriginalSeedSql({ gradingConfig: "not-json" })).toBe("");
    expect(resolveOriginalSeedSql({})).toBe("");
    expect(resolveOriginalSeedSql({ seedSql: null, gradingConfig: null })).toBe("");
  });
});

describe("§3 resolveOriginalStarterCode + starterCodeMapsEqual", () => {
  it("resolveOriginalStarterCode: đọc map từ gradingConfig.starterCode (giữ string, bỏ non-string)", () => {
    expect(
      resolveOriginalStarterCode({
        gradingConfig: JSON.stringify({ starterCode: { python: "p", bad: 5 } }),
      })
    ).toEqual({ python: "p" });
  });

  it("resolveOriginalStarterCode: thiếu key / JSON hỏng / null / rỗng → {}", () => {
    expect(resolveOriginalStarterCode({ gradingConfig: '{"question":"q"}' })).toEqual({});
    expect(resolveOriginalStarterCode({ gradingConfig: "not-json" })).toEqual({});
    expect(resolveOriginalStarterCode({ gradingConfig: null })).toEqual({});
    expect(resolveOriginalStarterCode({})).toEqual({});
  });

  it("starterCodeMapsEqual: khớp không phụ thuộc thứ tự key; khác value / số key → false", () => {
    expect(starterCodeMapsEqual({ a: "1", b: "2" }, { b: "2", a: "1" })).toBe(true);
    expect(starterCodeMapsEqual({ a: "1" }, { a: "2" })).toBe(false);
    expect(starterCodeMapsEqual({ a: "1" }, { a: "1", b: "2" })).toBe(false);
    expect(starterCodeMapsEqual({}, {})).toBe(true);
  });
});
