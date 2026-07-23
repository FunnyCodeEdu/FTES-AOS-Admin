/**
 * Domain types cho "Kho câu hỏi" — mirror BE DTO của `/api/v1/question-banks`
 * (envelope `{code,message,data}` đã được interceptor bóc).
 */

/** Vòng đời một ảnh sau khi tải lên: PENDING (đang giải AI) → SOLVED | FAILED (terminal). */
export type QuestionItemStatus = "PENDING" | "SOLVED" | "FAILED";

/** Một câu hỏi AI bóc được từ ảnh: đề + đáp án + giải thích. */
export interface SolvedQuestion {
  question: string;
  answer: string;
  explanation: string;
}

/**
 * Một kho câu hỏi (owner-scoped — GET list chỉ trả kho caller quản lý).
 * `status` là chuỗi mở của BE (vd tổng hợp tình trạng kho); FE chỉ hiển thị Tag.
 */
export interface QuestionBankView {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  itemCount: number;
  status: string;
  createdAt: string;
}

/** Một ảnh đề bài + kết quả giải AI. `questions` rỗng khi PENDING/FAILED. */
export interface QuestionItemView {
  id: string;
  bankId: string;
  imageUrl: string;
  mime: string;
  status: QuestionItemStatus;
  questions: SolvedQuestion[];
  rawText?: string;
  model?: string;
  sortOrder: number;
  createdAt: string;
}

/** Chi tiết kho: metadata kho + danh sách ảnh/câu hỏi. */
export interface QuestionBankDetail {
  bank: QuestionBankView;
  items: QuestionItemView[];
}

/** Body tạo kho mới. */
export interface CreateBankInput {
  title: string;
  description?: string;
}
