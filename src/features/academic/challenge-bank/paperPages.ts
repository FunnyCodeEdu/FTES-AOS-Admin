/**
 * Soạn ĐỀ DẠNG CHỮ phía client — soi gương đúng ràng buộc của BE
 * (`PUT /api/v1/admin/challenges/{id}/paper-pages`, change `challenge-paper-text` / V388).
 *
 * Đề PE hôm nay là PDF nhúng iframe: học viên không bôi đen được chữ, mở trên điện thoại thì trình
 * duyệt tải cả tệp rồi thu nhỏ vừa khung, và không tìm được câu nào trong đề. Bản chữ giữ CÙNG đề đó
 * dưới dạng markdown từng trang, ảnh minh hoạ nhúng ngay trong markdown bằng `![](url)` — đúng mô
 * hình mà album đề FE đã chạy tốt từ V346.
 *
 * Mọi hàm ở đây là HÀM THUẦN trên một mảng markdown, tách khỏi component vì đó là LUẬT chứ không
 * phải markup: "trang trắng có được lưu không", "đổi chỗ hai trang ra cái gì", "bản nháp này đã khác
 * bản đã lưu chưa" là ba câu hỏi phải có đúng một câu trả lời, và câu trả lời phải test được mà
 * không dựng cả modal.
 *
 * <b>Client chỉ là TẤM GƯƠNG, không phải quan toà</b> — cùng nguyên tắc với `paperFile.ts`: khi
 * server từ chối thì UI hiện NGUYÊN VĂN message của server, không thay bằng con số trần đóng cứng ở
 * đây. Hai trần bên dưới chỉ để chặn SỚM một lượt gửi biết chắc sẽ hỏng.
 */

import type { ChallengePaperPageView } from "./types";

/** Trần SỐ TRANG mỗi đề — khớp `ChallengePaperApi.MAX_PAPER_PAGES`. */
export const PAPER_PAGES_MAX = 200;

/** Trần KÝ TỰ mỗi trang — khớp `ChallengePaperApi.MAX_PAGE_CHARS`. */
export const PAPER_PAGE_MAX_CHARS = 100_000;

/**
 * Bản chữ server trả về → mảng nháp để soạn.
 *
 * Sắp lại theo `pageNo` dù BE đã sắp: thứ tự LÀ nội dung ở đây (phần tử thứ i sẽ được lưu thành
 * trang i+1), nên một mảng đến sai thứ tự không được phép trở thành một lượt lưu đảo trang.
 */
export function toDraftPages(
  views: readonly ChallengePaperPageView[] | null | undefined,
): string[] {
  return [...(views ?? [])]
    .sort((a, b) => (a.pageNo ?? 0) - (b.pageNo ?? 0))
    .map((page) => page.contentMarkdown ?? "");
}

/**
 * Chuẩn hoá xuống dòng về `\n`.
 *
 * `\r\n` của Windows lọt vào markdown làm hỏng khối code (dòng cuối mang ký tự thừa) và làm phép so
 * "đã sửa gì chưa" bên dưới báo BẨN cho một trang không ai đụng tới — người soạn mở modal rồi đóng
 * lại cũng bị hỏi "bỏ thay đổi?". BE chuẩn hoá đúng như vậy, nên làm ở đây là để hai bên nói cùng
 * một chuyện, không phải để thay BE.
 */
function normalizeEol(markdown: string): string {
  return markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Mảng nháp → payload gửi lên: bỏ trang trắng, chuẩn hoá xuống dòng, cắt khoảng trắng hai đầu.
 *
 * Bỏ trang trắng chứ không từ chối cả lượt lưu: trình soạn nhiều trang bao giờ cũng để lại vài ô rỗng
 * ở cuối khi người soạn bấm "Thêm trang" quá tay, và bắt họ đi dọn thứ mà client dọn được là làm khó
 * không vì lý do gì. BE làm ĐÚNG bước này lần nữa; làm sớm ở đây để con số "sẽ lưu N trang" trên nút
 * là con số THẬT chứ không phải con số trước khi server dọn.
 */
export function normalizePagesForSave(pages: readonly string[]): string[] {
  return pages
    .map((page) => normalizeEol(page ?? "").trim())
    .filter((page) => page !== "");
}

/**
 * Lý do KHÔNG lưu được, hoặc `null` khi lưu được.
 *
 * Đo trên mảng ĐÃ chuẩn hoá — đúng thứ sẽ nằm trong request — nên thông báo không bao giờ nói "vượt
 * 200 trang" cho một đề 199 trang cộng vài ô rỗng. Nói rõ trang THỨ MẤY quá dài: một câu "nội dung
 * quá dài" cho đề 40 trang là bắt người soạn đi dò từng trang.
 */
export function validateDraftPages(pages: readonly string[]): string | null {
  const normalized = normalizePagesForSave(pages);
  if (normalized.length > PAPER_PAGES_MAX) {
    return `Đề dạng chữ tối đa ${PAPER_PAGES_MAX} trang (đang có ${normalized.length}).`;
  }
  const over = normalized.findIndex((page) => page.length > PAPER_PAGE_MAX_CHARS);
  if (over >= 0) {
    return `Trang ${over + 1} dài ${normalized[over].length.toLocaleString("vi-VN")} ký tự, vượt trần ${PAPER_PAGE_MAX_CHARS.toLocaleString("vi-VN")} ký tự mỗi trang. Hãy tách thành hai trang.`;
  }
  return null;
}

/**
 * Bản nháp đã khác bản đã lưu chưa? So trên mảng ĐÃ chuẩn hoá của cả hai bên, vì đó chính là thứ sẽ
 * (hoặc đã) nằm trong DB — so trên bản thô thì một dấu `\r` hay một dòng trống cuối trang cũng làm
 * màn hình nói "chưa lưu" mãi mãi.
 */
export function isPaperPagesDirty(
  draft: readonly string[],
  saved: readonly string[],
): boolean {
  const a = normalizePagesForSave(draft);
  const b = normalizePagesForSave(saved);
  return a.length !== b.length || a.some((page, i) => page !== b[i]);
}

/**
 * Đổi chỗ một trang lên/xuống một bậc. Trả MẢNG MỚI khi có đổi, CHÍNH mảng cũ khi không đổi được
 * (đầu bấm "lên", cuối bấm "xuống", chỉ số sai) — mirror `movePaperFile`, để nơi gọi so tham chiếu
 * là biết có phải set state hay không.
 */
export function movePaperPage(pages: readonly string[], index: number, direction: -1 | 1): string[] {
  const target = index + direction;
  if (index < 0 || index >= pages.length || target < 0 || target >= pages.length) {
    return pages as string[];
  }
  const next = [...pages];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

/**
 * Chèn một trang TRỐNG ngay sau `index` (`index < 0` ⇒ chèn vào đầu).
 *
 * Chèn SAU chứ không nối vào cuối: người soạn bấm "Thêm trang" khi đang ở trang 3 là vì họ muốn một
 * trang 4, không phải một trang 41 ở tận cuối đề.
 */
export function insertPageAfter(pages: readonly string[], index: number): string[] {
  const at = Math.min(Math.max(index + 1, 0), pages.length);
  const next = [...pages];
  next.splice(at, 0, "");
  return next;
}

/** Bỏ một trang khỏi bản nháp. Chỉ số sai ⇒ trả CHÍNH mảng cũ (mirror {@link movePaperPage}). */
export function removePageAt(pages: readonly string[], index: number): string[] {
  if (index < 0 || index >= pages.length) {
    return pages as string[];
  }
  return pages.filter((_, i) => i !== index);
}

/**
 * Nhãn một dòng cho ô chọn trang: số trang + mấy chữ đầu của nội dung.
 *
 * Vì sao cần: một đề 12 trang mà danh sách chỉ ghi "Trang 1…12" thì người soát đề phải bấm từng
 * trang mới biết mình đang tìm ở đâu. Lấy dòng chữ THẬT đầu tiên (bỏ tiêu đề markdown, bỏ dòng
 * trống) — nó gần như luôn là "Câu 1: …" hoặc tên phần, tức đúng thứ người soạn dùng để định vị.
 */
export function pageSummary(markdown: string, maxChars = 48): string {
  const firstLine = normalizeEol(markdown ?? "")
    .split("\n")
    .map((line) => line.replace(/^#{1,6}\s*/, "").replace(/^[*_>\-\s]+/, "").trim())
    .find((line) => line !== "");
  if (!firstLine) {
    return "(trang trống)";
  }
  return firstLine.length > maxChars ? `${firstLine.slice(0, maxChars)}…` : firstLine;
}
