import type { BroadcastSegment } from "./types";

/**
 * Luật kiểm tra broadcast, tách khỏi component để test được thẳng.
 *
 * Backend vẫn kiểm lại tất cả những điều dưới đây — đây KHÔNG phải lớp bảo vệ. Lý do tồn tại là
 * thời điểm báo lỗi: luồng gửi là nhập → Preview → modal xác nhận → gửi, nên nếu chỉ dựa vào
 * backend thì admin gõ sai link ở bước 1 mà tới bước 4 mới biết. Bắt sớm ngay chỗ nhập.
 */

export const DEEP_LINK_MAX_LENGTH = 512;

/** Chế độ chọn người nhận. Xem {@link BroadcastSegment} về việc vì sao hai chế độ phải tách bạch. */
export type SegmentMode = "all" | "roles";

export function segmentModeOf(segment: BroadcastSegment): SegmentMode {
  return segment.allUsers ? "all" : "roles";
}

/**
 * Segment tương ứng một chế độ, đã xoá sạch dữ liệu của chế độ kia.
 *
 * Xoá là chủ ý: nếu để sót `roles` cũ khi đã bật `allUsers`, backend coi payload đó là mơ hồ và trả
 * 400 BROADCAST_SEGMENT_AMBIGUOUS — cố tình chặn thay vì tự đoán, vì đoán sai ở đây là gửi nhầm tệp.
 */
export function segmentForMode(mode: SegmentMode): BroadcastSegment {
  return mode === "all" ? { allUsers: true } : { allUsers: false, roles: [] };
}

/**
 * Link đích chỉ được là đường dẫn NỘI BỘ.
 *
 * Chặn URL tuyệt đối vì broadcast là kênh đáng tin nhất trong sản phẩm: thông báo mang tên hệ
 * thống, gửi cho toàn bộ người dùng, và người ta bấm vì tin nó. Cho dán http(s) vào đây là biến nó
 * thành công cụ phát tán link ngoài.
 *
 * "//host" bị chặn riêng: trình duyệt hiểu đó là protocol-relative URL và vẫn đi ra ngoài, dù nhìn
 * qua thì vẫn "bắt đầu bằng /" như đường dẫn nội bộ.
 *
 * @returns thông báo lỗi tiếng Việt, hoặc null nếu hợp lệ (bỏ trống cũng là hợp lệ).
 */
export function deepLinkProblem(raw: string | undefined | null): string | null {
  const link = (raw ?? "").trim();
  if (!link) return null;
  if (!link.startsWith("/") || link.startsWith("//")) {
    return "Link đích phải là đường dẫn nội bộ bắt đầu bằng '/' (không nhận http/https).";
  }
  if (link.length > DEEP_LINK_MAX_LENGTH) {
    return `Link đích tối đa ${DEEP_LINK_MAX_LENGTH} ký tự.`;
  }
  return null;
}

/**
 * Phải nói rõ gửi cho ai. Danh sách vai trò rỗng KHÔNG được hiểu ngầm là "tất cả": ô trống cũng là
 * trạng thái mặc định lúc vừa mở trang, nên hiểu ngầm như vậy thì một cú bấm nhầm thành vài nghìn
 * thông báo không thu hồi được.
 */
export function segmentProblem(segment: BroadcastSegment): string | null {
  if (segment.allUsers) return null;
  if ((segment.roles ?? []).length === 0) {
    return "Chọn ít nhất một vai trò, hoặc chuyển sang 'Tất cả người dùng'.";
  }
  return null;
}
