import type { ResourceType } from "../types";

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
