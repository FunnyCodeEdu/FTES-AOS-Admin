import type { Course } from "../types";
import type { BankChallenge } from "./api/challengeBank.api";

/**
 * Đánh giá rủi ro lộ nội dung trả phí khi public 1 challenge lên Workplace
 * (đặt visibility WORKSPACE_PUBLIC) — nợ 5.1 của BE change `challenge-lesson-level-access-gate`:
 * BE CỐ TÌNH không gate WORKSPACE_PUBLIC (xem proposal §"Quyết định giữ WORKSPACE_PUBLIC"),
 * nên chốt chặn duy nhất là confirm có cảnh báo ở admin console.
 *
 * Dữ liệu FE có trong view: `BankChallenge.lessonId` + `Course.basePrice/saleMode`.
 * FE KHÔNG có freeLessonIds per-package ở tab này → không biết chính xác bài đó free hay không:
 * - Khoá bán được (PACKAGE, hoặc LEGACY có basePrice > 0) → coi là TRẢ PHÍ (conservative).
 * - Không đủ dữ liệu (basePrice/saleMode đều vắng) → degrade: cảnh báo chung vì challenge CÓ gắn bài.
 * - Khoá LEGACY basePrice = 0 (free) → không có gì để lộ, giữ confirm thường.
 */
export type PublishRiskLevel = "none" | "lesson-attached" | "paid-lesson";

export interface PublishRisk {
  level: PublishRiskLevel;
  /** true → nút OK của Modal.confirm nên là danger. */
  danger: boolean;
  title: string;
  content: string;
}

/** Khoá coi là trả phí? true/false khi đủ dữ liệu, undefined khi FE view không đủ để kết luận. */
export function isPaidCourse(
  course: Pick<Course, "basePrice" | "saleMode">
): boolean | undefined {
  // PACKAGE = bán theo gói; tab này không load freeLessonIds nên coi là trả phí (conservative).
  if (course.saleMode === "PACKAGE") return true;
  if (typeof course.basePrice === "number") return course.basePrice > 0;
  return undefined;
}

const GENERIC_CONFIRM: PublishRisk = {
  level: "none",
  danger: false,
  title: "Public thử thách lên Workplace?",
  content:
    "Thử thách sẽ hiện công khai ở Workplace practice và trang /challenges cho mọi người. Tiếp tục?",
};

export function assessPublishRisk(
  challenge: Pick<BankChallenge, "lessonId">,
  course: Pick<Course, "basePrice" | "saleMode">,
  lessonName?: string
): PublishRisk {
  if (!challenge.lessonId) return GENERIC_CONFIRM;

  const paid = isPaidCourse(course);
  if (paid === false) return GENERIC_CONFIRM;

  const lessonLabel = lessonName ? `"${lessonName}"` : "một bài học";

  if (paid === true) {
    return {
      level: "paid-lesson",
      danger: true,
      title: "Cảnh báo: challenge đang gắn bài học trả phí",
      content:
        `Challenge này đang gắn vào ${lessonLabel} thuộc khoá/gói TRẢ PHÍ. ` +
        "Public lên Workplace sẽ cho MỌI NGƯỜI (kể cả chưa mua) xem đề bài và làm thử thách " +
        "— nguy cơ lộ nội dung trả phí. Backend KHÔNG chặn thêm sau bước này. Vẫn public?",
    };
  }

  // Không đủ dữ liệu để biết bài có trả phí không → cảnh báo chung vì challenge CÓ gắn bài.
  return {
    level: "lesson-attached",
    danger: true,
    title: "Cảnh báo: challenge đang gắn bài học",
    content:
      `Challenge này đang gắn vào ${lessonLabel}. Không xác định được bài đó có thuộc ` +
      "khoá/gói trả phí hay không — nếu có, public lên Workplace sẽ làm lộ nội dung trả phí " +
      "cho người chưa mua. Kiểm tra trước khi tiếp tục. Vẫn public?",
  };
}
