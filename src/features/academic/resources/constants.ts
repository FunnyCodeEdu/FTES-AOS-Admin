import type { ResourceLicense, ResourceType, ResourceVisibility } from "../types";

/**
 * Visibility học liệu (Contract B). Vocab FE map sang enum BE Visibility:
 *   public → PUBLIC, enrolled → ENROLLED_ONLY (CHỈ người đã mua/ghi danh khoá gắn môn), package_only → PRIVATE.
 * `enrolled` là tầng "khoá theo mua": FE learn/subject hiện lock badge khi viewer chưa mua và
 * BE trả `lockedForViewer=true`. ENROLLED_ONLY là enum RIÊNG (khác MEMBERS = mọi user đăng nhập).
 * Dùng chung 1 nguồn để nhãn nhất quán ở form/table/detail.
 */
export const RESOURCE_VISIBILITY_LABELS: Record<ResourceVisibility, string> = {
  public: "Công khai",
  enrolled: "Học viên đã mua",
  package_only: "Theo gói",
};

export const RESOURCE_VISIBILITY_OPTIONS: {
  value: ResourceVisibility;
  label: string;
  description: string;
}[] = [
  { value: "public", label: RESOURCE_VISIBILITY_LABELS.public, description: "Ai cũng xem/tải được." },
  {
    value: "enrolled",
    label: RESOURCE_VISIBILITY_LABELS.enrolled,
    description: "Khoá với người CHƯA mua khoá liên kết — hiện lock badge, bấm vào mở luồng mua.",
  },
  {
    value: "package_only",
    label: RESOURCE_VISIBILITY_LABELS.package_only,
    description: "Chỉ người sở hữu gói tương ứng.",
  },
];

/** Nhãn hiển thị cho từng ResourceType (enum BE — C-3). */
export const RESOURCE_TYPE_OPTIONS: { value: ResourceType; label: string }[] = [
  { value: "PDF", label: "PDF" },
  { value: "SLIDE", label: "Slide" },
  { value: "VIDEO", label: "Video" },
  { value: "BOOK", label: "Sách" },
  { value: "SOURCE_CODE", label: "Mã nguồn" },
  { value: "ASSIGNMENT", label: "Bài tập" },
  { value: "PE", label: "PE" },
  // FE = ALBUM ẢNH (mỗi ảnh một trang, có bình luận riêng), KHÔNG còn là thư mục nén zip.
  { value: "FE", label: "FE (album ảnh)" },
  { value: "NOTES", label: "Ghi chú" },
  { value: "TEMPLATES", label: "Mẫu" },
];

/** Nhãn cho License — value là enum thật BE (C-3), gửi thẳng lên CreateResourceRequest. */
export const RESOURCE_LICENSE_OPTIONS: { value: ResourceLicense; label: string }[] = [
  { value: "ALL_RIGHTS_RESERVED", label: "Giữ toàn quyền" },
  { value: "CC_BY", label: "CC BY" },
  { value: "CC_BY_SA", label: "CC BY-SA" },
  { value: "CC_BY_NC", label: "CC BY-NC" },
  { value: "MIT", label: "MIT" },
  { value: "APACHE_2", label: "Apache 2.0" },
  { value: "PUBLIC_DOMAIN", label: "Phạm vi công cộng" },
];
