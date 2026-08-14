import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import {
  buildUpdateChallengePayload,
  challengeScheduleToRange,
  resolveOriginalAiFeedbackLimit,
  resolveOriginalSeedSql,
  resolveOriginalStarterCode,
  starterCodeMapsEqual,
  supportsAiFeedbackLimit,
  tagSetChanged,
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

  // ── Gắn MÔN cho thử thách cũ (subject_id = NULL) ngay trong khoá — xem javadoc field subjectId ──
  it("gắn môn cho thử thách chưa có môn → gửi subjectId", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, subjectId: null },
        { title: original.title, description: "Mô tả cũ", free: false, subjectId: "subject-jpd113" }
      )
    ).toEqual({ subjectId: "subject-jpd113" });
  });

  it("đổi sang môn khác → gửi subjectId mới", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, subjectId: "subject-csd201" },
        { title: original.title, description: "Mô tả cũ", free: false, subjectId: "subject-jpd113" }
      )
    ).toEqual({ subjectId: "subject-jpd113" });
  });

  it("môn không đổi → KHÔNG đính subjectId (partial diff)", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, subjectId: "subject-jpd113" },
        { title: original.title, description: "Mô tả cũ", free: false, subjectId: "subject-jpd113" }
      )
    ).toEqual({});
  });

  it("bỏ trống ô môn → KHÔNG gửi gì (PATCH partial: null = giữ nguyên, không phải GỠ môn)", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, subjectId: "subject-jpd113" },
        { title: original.title, description: "Mô tả cũ", free: false, subjectId: undefined }
      )
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

  // challenge-testcase-sample-ui §3: aiFeedbackLimit (flat field, BE merge vào grading_config).
  it("§3.1 CODE test-case: đổi số lần AI nhận xét → đính aiFeedbackLimit", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE" },
        { title: "Thử thách tuần 1", description: "Mô tả cũ", free: false, aiFeedbackLimit: 3 }
      )
    ).toEqual({ aiFeedbackLimit: 3 });
  });

  it("§3.1 chưa từng đặt (mặc định 1) + form vẫn 1 → không đính", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE" },
        { title: "Thử thách tuần 1", description: "Mô tả cũ", free: false, aiFeedbackLimit: 1 }
      )
    ).toEqual({});
  });

  it("§3.1 khớp giá trị đang lưu (top-level hoặc trong gradingConfig) → không đính", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE", aiFeedbackLimit: 4 },
        { title: "Thử thách tuần 1", description: "Mô tả cũ", free: false, aiFeedbackLimit: 4 }
      )
    ).toEqual({});
    expect(
      buildUpdateChallengePayload(
        {
          ...original,
          type: "CODE",
          gradingConfig: JSON.stringify({ aiFeedbackLimit: 2 }),
        },
        { title: "Thử thách tuần 1", description: "Mô tả cũ", free: false, aiFeedbackLimit: 2 }
      )
    ).toEqual({});
  });

  it("§3.1 kẹp 1..5: nhập 9 → gửi 5; nhập 0 → gửi 1 (khi đang lưu giá trị khác)", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE", aiFeedbackLimit: 1 },
        { title: "Thử thách tuần 1", description: "Mô tả cũ", free: false, aiFeedbackLimit: 9 }
      )
    ).toEqual({ aiFeedbackLimit: 5 });
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE", aiFeedbackLimit: 4 },
        { title: "Thử thách tuần 1", description: "Mô tả cũ", free: false, aiFeedbackLimit: 0 }
      )
    ).toEqual({ aiFeedbackLimit: 1 });
  });

  it("§3.1 kẹp: đang lưu 5, mentor gõ 7 → sau khi kẹp vẫn là 5 ⇒ KHÔNG đính (không request thừa)", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE", aiFeedbackLimit: 5 },
        { title: "Thử thách tuần 1", description: "Mô tả cũ", free: false, aiFeedbackLimit: 7 }
      )
    ).toEqual({});
  });

  it("§3.2 CODE bài NỘP (có submissionMethod) / type != CODE → KHÔNG đính aiFeedbackLimit", () => {
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "CODE", submissionMethod: "GITHUB" },
        {
          title: "Thử thách tuần 1",
          description: "Mô tả cũ",
          free: false,
          submissionMethod: "GITHUB",
          aiFeedbackLimit: 4,
        }
      )
    ).toEqual({});
    expect(
      buildUpdateChallengePayload(
        { ...original, type: "ESSAY" },
        { title: "Thử thách tuần 1", description: "Mô tả cũ", free: false, aiFeedbackLimit: 4 }
      )
    ).toEqual({});
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

describe("§3 resolveOriginalAiFeedbackLimit + supportsAiFeedbackLimit", () => {
  it("ưu tiên field top-level; fallback gradingConfig.aiFeedbackLimit", () => {
    expect(
      resolveOriginalAiFeedbackLimit({
        aiFeedbackLimit: 3,
        gradingConfig: JSON.stringify({ aiFeedbackLimit: 5 }),
      })
    ).toBe(3);
    expect(
      resolveOriginalAiFeedbackLimit({ gradingConfig: JSON.stringify({ aiFeedbackLimit: 2 }) })
    ).toBe(2);
  });

  it("giá trị lưu ngoài biên → kẹp về 1..5 (khớp trần BE, tránh diff giả)", () => {
    expect(resolveOriginalAiFeedbackLimit({ aiFeedbackLimit: 99 })).toBe(5);
    expect(resolveOriginalAiFeedbackLimit({ aiFeedbackLimit: 0 })).toBe(1);
  });

  it("chưa đặt / JSON hỏng / kiểu sai → undefined (caller rơi về mặc định 1)", () => {
    expect(resolveOriginalAiFeedbackLimit({})).toBeUndefined();
    expect(resolveOriginalAiFeedbackLimit({ aiFeedbackLimit: null })).toBeUndefined();
    expect(resolveOriginalAiFeedbackLimit({ gradingConfig: "not-json" })).toBeUndefined();
    expect(resolveOriginalAiFeedbackLimit({ gradingConfig: '{"question":"q"}' })).toBeUndefined();
    expect(
      resolveOriginalAiFeedbackLimit({ gradingConfig: '{"aiFeedbackLimit":"3"}' })
    ).toBeUndefined();
  });

  it("supportsAiFeedbackLimit: chỉ CODE chấm bằng test case (không có submissionMethod)", () => {
    expect(supportsAiFeedbackLimit({ type: "CODE" })).toBe(true);
    expect(supportsAiFeedbackLimit({ type: "CODE", submissionMethod: "FILE" })).toBe(false);
    expect(supportsAiFeedbackLimit({ type: "MULTIPLE_CHOICE" })).toBe(false);
    expect(supportsAiFeedbackLimit({ type: "ESSAY" })).toBe(false);
    expect(supportsAiFeedbackLimit(null)).toBe(false);
    expect(supportsAiFeedbackLimit(undefined)).toBe(false);
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

// admin-challenge-bank-console §3.3: tag lưu bằng lệnh RIÊNG (PUT replace-set) nên phải biết chắc
// "có đổi không" — so theo TẬP HỢP, vì AntD mode="tags" giữ thứ tự người dùng gõ.
describe("tagSetChanged", () => {
  it("cùng tập, khác thứ tự → KHÔNG đổi (không bắn PUT thừa)", () => {
    expect(tagSetChanged(["pe", "mae101"], ["mae101", "pe"])).toBe(false);
  });

  it("thêm / bớt / thay tag → có đổi", () => {
    expect(tagSetChanged(["pe"], ["pe", "mae101"])).toBe(true);
    expect(tagSetChanged(["pe", "mae101"], ["pe"])).toBe(true);
    expect(tagSetChanged(["pe"], ["fe"])).toBe(true);
  });

  it("hai tập rỗng → không đổi", () => {
    expect(tagSetChanged([], [])).toBe(false);
  });

  it("xoá hết tag đang có → có đổi (đây là thao tác hợp lệ, phải gửi)", () => {
    expect(tagSetChanged(["pe"], [])).toBe(true);
  });
});

// ---- Regression: sửa bài CHẤM BẰNG TEST CASE không được âm thầm biến nó thành bài NỘP ----
// Bài CODE KHÔNG có `submissionMethod` chính là bài chấm tự động bằng test case (BE đòi
// `submission_method IS NULL`). Modal từng pre-fill `?? "GITHUB"`, nên chỉ sửa TIÊU ĐỀ cũng gửi kèm
// submissionMethod="GITHUB" ⇒ BE ghi vào ⇒ bài mất chế độ chấm tự động mà không ai hay.
describe("buildUpdateChallengePayload — không tự ý gán cách nộp", () => {
  const codeOriginal = { ...original, type: "CODE" as const };

  it("bài CODE chưa có cách nộp, chỉ đổi tiêu đề → KHÔNG đính submissionMethod", () => {
    const patch = buildUpdateChallengePayload(codeOriginal, {
      title: "Tên mới",
      description: "Mô tả cũ",
      free: false,
      submissionMethod: undefined,
    });
    expect(patch).not.toHaveProperty("submissionMethod");
    expect(patch.title).toBe("Tên mới");
  });

  it("tác giả CHỦ ĐỘNG chọn cách nộp → vẫn đính (chuyển đổi có chủ đích, UI đã cảnh báo)", () => {
    const patch = buildUpdateChallengePayload(codeOriginal, {
      title: "Thử thách tuần 1",
      description: "Mô tả cũ",
      free: false,
      submissionMethod: "GITHUB",
    });
    expect(patch.submissionMethod).toBe("GITHUB");
  });
});
