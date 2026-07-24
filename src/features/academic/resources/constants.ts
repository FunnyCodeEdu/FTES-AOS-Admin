import type { ResourceLicense, ResourceType } from "../types";

/** Nhãn hiển thị cho từng ResourceType (enum BE — C-3). */
export const RESOURCE_TYPE_OPTIONS: { value: ResourceType; label: string }[] = [
  { value: "PDF", label: "PDF" },
  { value: "SLIDE", label: "Slide" },
  { value: "VIDEO", label: "Video" },
  { value: "BOOK", label: "Sách" },
  { value: "SOURCE_CODE", label: "Mã nguồn" },
  { value: "ASSIGNMENT", label: "Bài tập" },
  { value: "PE", label: "PE" },
  { value: "FE", label: "FE (thư mục)" },
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
