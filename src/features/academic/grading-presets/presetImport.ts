import type { GradingPresetInput, RubricLine } from "./types";

/**
 * Đọc JSON người dùng dán vào ô import thành `GradingPresetInput[]`.
 *
 * <p><b>Vì sao khoan dung với tên khoá.</b> Bộ tiêu chí ở đây là thứ được SƯU TẦM — chép từ đề
 * cương của trường, từ file chấm của thầy cô, từ export của hệ thống khác — nên cùng một ý xuất
 * hiện dưới nhiều tên: `maxScore`/`max_score`/`score`/`điểm`, `criterion`/`name`/`title`. Bắt đúng
 * một cách viết nghĩa là mỗi lần import lại phải sửa tay file nguồn, và đó chính là công việc mà
 * màn này sinh ra để bỏ đi.
 *
 * <p>KHÔNG khoan dung với thứ không suy ra được: thiếu tên giảng viên hoặc thiếu nội dung tiêu chí
 * thì ném lỗi có chỉ số dòng, chứ không lẳng lặng nhét giá trị mặc định — một bộ tiêu chí rỗng áp
 * lên 54 đề là hỏng im lặng đúng kiểu khó lần ra nhất.
 */

const CRITERION_KEYS = ["criterion", "name", "title", "tieuChi", "tiêu chí"];
const SCORE_KEYS = ["maxScore", "max_score", "score", "points", "diem", "điểm"];
const DESC_KEYS = ["description", "desc", "detail", "note", "moTa", "mô tả"];

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }
  // Thử không phân biệt hoa thường cho file chép tay
  const lower = new Map(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]));
  for (const k of keys) {
    const v = lower.get(k.toLowerCase());
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function toStr(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return String(value);
  return undefined;
}

function parseRubrics(raw: unknown, where: string): RubricLine[] {
  if (!Array.isArray(raw)) return [];
  const out: RubricLine[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const criterion = toStr(pick(row, CRITERION_KEYS));
    if (!criterion) {
      throw new Error(`${where}: tiêu chí thứ ${i + 1} thiếu tên`);
    }
    const maxScore = toNumber(pick(row, SCORE_KEYS));
    if (maxScore < 0) {
      throw new Error(`${where}: tiêu chí "${criterion}" có điểm âm`);
    }
    out.push({
      criterion,
      description: toStr(pick(row, DESC_KEYS)) ?? null,
      maxScore,
      // orderNo do BE đánh lại theo thứ tự mảng; giữ chỗ để kiểu khớp.
      orderNo: out.length + 1,
    });
  });
  return out;
}

/**
 * Dựng `criteria` (chuỗi gửi xuống model) từ bảng rubric khi file nguồn không có sẵn.
 *
 * <p>Bắt buộc phải có: BE fallback `criteria` về MÔ TẢ ĐỀ BÀI khi đề không khai, tức bảo model
 * "hãy chấm theo đề bài" và nhận lại lời khen chung chung.
 */
export function criteriaFromRubrics(rubrics: RubricLine[]): string {
  if (rubrics.length === 0) return "";
  const total = rubrics.reduce((s, r) => s + r.maxScore, 0);
  const lines = rubrics.map(
    (r, i) => `${i + 1}. ${r.criterion} (${r.maxScore} điểm)${r.description ? ` — ${r.description}` : ""}`,
  );
  return [
    `Chấm bài trên thang ${total} điểm theo ${rubrics.length} tiêu chí:`,
    ...lines,
    "",
    "Yêu cầu khi chấm: đối chiếu với đặc tả trong đề, nêu rõ phần nào thiếu hoặc sai, trích dẫn "
      + "chỗ có vấn đề, và kết luận điểm từng tiêu chí kèm tổng điểm.",
  ].join("\n");
}

export function parsePresetJson(text: string): GradingPresetInput[] {
  const trimmed = (text ?? "").trim();
  if (!trimmed) throw new Error("Chưa có nội dung để import");

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Nội dung không phải JSON hợp lệ");
  }

  // Chấp nhận: một bộ, mảng bộ, hoặc bọc trong {items:[...]} / {presets:[...]}
  const wrapper = parsed as Record<string, unknown>;
  const list: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(wrapper?.items)
      ? (wrapper.items as unknown[])
      : Array.isArray(wrapper?.presets)
        ? (wrapper.presets as unknown[])
        : [parsed];

  if (list.length === 0) throw new Error("Không có bộ tiêu chí nào trong nội dung");

  return list.map((item, i) => {
    const where = `Bộ thứ ${i + 1}`;
    if (!item || typeof item !== "object") throw new Error(`${where}: không phải một đối tượng`);
    const row = item as Record<string, unknown>;

    const teacherName = toStr(pick(row, ["teacherName", "teacher_name", "teacher", "giangVien", "giảng viên"]));
    if (!teacherName) throw new Error(`${where}: thiếu tên giảng viên (teacherName)`);

    const rubrics = parseRubrics(pick(row, ["rubrics", "criteriaList", "items", "tieuChi"]), where);
    const criteria = toStr(pick(row, ["criteria", "prompt", "instruction", "huongDan"]))
      ?? criteriaFromRubrics(rubrics);
    if (!criteria) {
      throw new Error(`${where}: thiếu cả criteria lẫn rubrics — không có gì để chấm`);
    }

    return {
      id: toStr(row.id) ?? null,
      name: toStr(pick(row, ["name", "title", "presetName"])) ?? `${teacherName} — bộ ${i + 1}`,
      teacherName,
      teacherId: toStr(pick(row, ["teacherId", "teacher_id"])) ?? null,
      subjectId: toStr(pick(row, ["subjectId", "subject_id"])) ?? null,
      subjectCode: toStr(pick(row, ["subjectCode", "subject_code", "subject", "monHoc"])) ?? null,
      description: toStr(pick(row, DESC_KEYS)) ?? null,
      criteria,
      rubrics,
      status: null,
    } satisfies GradingPresetInput;
  });
}
