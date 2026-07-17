// Map kết quả job EXAM_GEN (BE ai-service) → shape câu hỏi FE (QuizFormValues) của quiz bank.
//
// Schema result EXAM_GEN (design admin-lecturer-ai-assist §2):
//   { questions: [{ id, type, prompt, options, answer_key, rubric, skill }], model }
// Map `prompt → content`, `answer_key → correct`. `options`/`answer_key` do model sinh nên
// KHÔNG cố định shape — chuẩn hoá phòng thủ (string[] | {key,text}[] | object-map; key chữ cái
// hoặc index hoặc khớp text). Pure/không side-effect để test đơn vị được (khi repo có runner).

import type { QuizDifficulty, QuizFormValues, QuizQuestionType } from "../../types";
import type { AiDifficultyLevel } from "../types";

/** Một câu hỏi thô trong result EXAM_GEN — mọi field optional vì model có thể bỏ sót. */
export interface ExamGenQuestion {
  id?: string;
  type?: string;
  prompt?: string;
  question?: string;
  options?: unknown;
  answer_key?: unknown;
  answerKey?: unknown;
  rubric?: string;
  explanation?: string;
  skill?: string;
}

/** Result đã parse của job EXAM_GEN. `questions` có thể vắng nếu model trả rỗng. */
export interface ExamGenResult {
  questions?: ExamGenQuestion[];
  model?: string;
}

export interface NormalizedOption {
  key: string;
  text: string;
}

/** Câu hỏi đã chuẩn hoá cho preview keep/drop (giữ text đáp án + cờ đúng, sửa inline được). */
export interface PreviewQuestion {
  /** key ổn định để React render + toggle keep. */
  key: string;
  content: string;
  type: QuizQuestionType;
  answers: { id: string; text: string; isCorrect: boolean }[];
  skill?: string;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** index 0..25 → "A".."Z"; ngoài dải → số 1-based (đủ cho quiz thực tế). */
function letterKey(index: number): string {
  return index < LETTERS.length ? LETTERS[index] : String(index + 1);
}

function asText(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  return "";
}

/**
 * Chuẩn hoá `options` về [{key,text}]. Hỗ trợ:
 *  - string[]                        → key chữ cái theo vị trí
 *  - {key|id|label, text|value|content|label}[]
 *  - object map { A: "text", ... }   → entries
 * Bỏ option rỗng text. key trùng/thiếu được thay bằng chữ cái vị trí để correctKeys khớp ổn định.
 */
export function normalizeOptions(rawOptions: unknown): NormalizedOption[] {
  let entries: { key?: string; text: string }[] = [];

  if (Array.isArray(rawOptions)) {
    entries = rawOptions.map((opt) => {
      if (opt != null && typeof opt === "object") {
        const o = opt as Record<string, unknown>;
        const text = asText(o.text ?? o.value ?? o.content ?? o.option ?? o.label);
        const rawKey = o.key ?? o.id ?? o.label;
        return { key: typeof rawKey === "string" ? rawKey : undefined, text };
      }
      return { text: asText(opt) };
    });
  } else if (rawOptions != null && typeof rawOptions === "object") {
    entries = Object.entries(rawOptions as Record<string, unknown>).map(([k, v]) => ({
      key: k,
      text: asText(v),
    }));
  }

  const used = new Set<string>();
  return entries
    .filter((e) => e.text.trim().length > 0)
    .map((e, i) => {
      let key = e.key && e.key.trim() ? e.key.trim() : letterKey(i);
      if (used.has(key)) key = letterKey(i);
      used.add(key);
      return { key, text: e.text };
    });
}

/**
 * Xác định tập key đáp án đúng từ `answer_key` so với options đã chuẩn hoá. Hỗ trợ:
 *  - "A" / "a"            → khớp key (không phân biệt hoa/thường)
 *  - nội dung đáp án      → khớp text
 *  - số (index 0-based)   → options[index]
 *  - mảng các dạng trên
 *  - chuỗi "A,B" / "A;B"  → tách nhiều key
 */
export function normalizeCorrectKeys(
  rawAnswerKey: unknown,
  options: NormalizedOption[]
): string[] {
  const correct = new Set<string>();

  const matchOne = (token: unknown) => {
    if (token == null) return;
    if (typeof token === "number" && Number.isInteger(token)) {
      const opt = options[token];
      if (opt) correct.add(opt.key);
      return;
    }
    const s = asText(token).trim();
    if (!s) return;
    const byKey = options.find((o) => o.key.toLowerCase() === s.toLowerCase());
    if (byKey) {
      correct.add(byKey.key);
      return;
    }
    const byText = options.find((o) => o.text.trim().toLowerCase() === s.toLowerCase());
    if (byText) {
      correct.add(byText.key);
      return;
    }
    // "2" dạng chuỗi = index 0-based.
    const asIndex = Number(s);
    if (Number.isInteger(asIndex) && options[asIndex]) correct.add(options[asIndex].key);
  };

  if (Array.isArray(rawAnswerKey)) {
    rawAnswerKey.forEach(matchOne);
  } else if (typeof rawAnswerKey === "string" && /[,;]/.test(rawAnswerKey)) {
    rawAnswerKey.split(/[,;]/).forEach((part) => matchOne(part));
  } else {
    matchOne(rawAnswerKey);
  }

  return options.filter((o) => correct.has(o.key)).map((o) => o.key);
}

const VALID_TYPES: QuizQuestionType[] = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"];

/** Suy loại câu hỏi: ưu tiên type model trả nếu hợp lệ, else theo số đáp án đúng. */
export function inferQuestionType(
  rawType: string | undefined,
  correctCount: number
): QuizQuestionType {
  const upper = rawType?.toUpperCase().replace(/[\s-]/g, "_");
  if (upper && (VALID_TYPES as string[]).includes(upper)) return upper as QuizQuestionType;
  return correctCount > 1 ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE";
}

/**
 * Map 1 câu EXAM_GEN → PreviewQuestion. Trả null nếu thiếu prompt hoặc <2 đáp án (không dùng được).
 * `idx` để sinh key ổn định khi model không trả id.
 */
export function mapExamQuestion(q: ExamGenQuestion, idx: number): PreviewQuestion | null {
  const content = asText(q.prompt ?? q.question).trim();
  const options = normalizeOptions(q.options);
  if (!content || options.length < 2) return null;

  const correctKeys = normalizeCorrectKeys(q.answer_key ?? q.answerKey, options);
  const type = inferQuestionType(q.type, correctKeys.length);

  return {
    key: q.id && String(q.id).trim() ? String(q.id) : `gen-${idx}`,
    content,
    type,
    answers: options.map((o) => ({
      id: o.key,
      text: o.text,
      isCorrect: correctKeys.includes(o.key),
    })),
    skill: q.skill?.trim() || undefined,
  };
}

/** Map toàn bộ result → danh sách preview (bỏ câu không hợp lệ). */
export function mapExamResult(result: ExamGenResult | undefined): PreviewQuestion[] {
  if (!result?.questions || !Array.isArray(result.questions)) return [];
  return result.questions
    .map((q, i) => mapExamQuestion(q, i))
    .filter((q): q is PreviewQuestion => q !== null);
}

/** Đọc model đã sinh từ result (design: hiển thị model attribution ở preview). */
export function readGeneratingModel(result: ExamGenResult | undefined): string | undefined {
  const m = result?.model;
  return typeof m === "string" && m.trim() ? m.trim() : undefined;
}

/** EASY/MEDIUM/HARD (request AI) → easy/medium/hard (QuizDifficulty của bank). */
export function toQuizDifficulty(level: AiDifficultyLevel): QuizDifficulty {
  switch (level) {
    case "EASY":
      return "easy";
    case "HARD":
      return "hard";
    default:
      return "medium";
  }
}

/**
 * PreviewQuestion (đã keep + sửa inline) → QuizFormValues để append vào quiz bank qua
 * action lưu sẵn có (bulk-import). Câu AI luôn vào trạng thái `draft` để giảng viên rà lại.
 */
export function previewToFormValues(
  q: PreviewQuestion,
  difficulty: QuizDifficulty,
  subjectId?: string
): QuizFormValues {
  return {
    subjectId: subjectId || undefined,
    content: q.content,
    type: q.type,
    answers: q.answers,
    tags: q.skill ? [q.skill] : [],
    difficulty,
    status: "draft",
  };
}
