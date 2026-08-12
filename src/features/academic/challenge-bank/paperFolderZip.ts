import JSZip from "jszip";
import {
  PAPER_ZIP_CANONICAL_MIME,
  folderArchiveName,
  type PaperFolderItem,
  type PaperFolderPlan,
} from "./paperFile";

/**
 * Nén THƯ MỤC admin chọn thành một `.zip` ngay trong trình duyệt, để đề PE (starter code + dữ liệu
 * + mô tả, nằm ở nhiều thư mục con) nạp được mà admin không phải rời màn hình đi nén tay.
 *
 * Tách khỏi `paperFile.ts` có chủ đích: file kia THUẦN và test được bằng vitest thuần; file này
 * chạm `jszip` + `Blob` + Web Worker nội bộ của JSZip.
 *
 * `jszip` đã nằm sẵn trong `package.json` (còn lại từ luồng FE-album cũ đã gỡ ở
 * `de21758` — hình dạng hàm dưới đây khôi phục từ `zipFolder` trong
 * `src/features/academic/resources/components/ResourceFormModal.tsx` ở commit đó).
 */

/**
 * Mức nén DEFLATE. 6 là điểm cân: mức 9 chậm hơn đáng kể trên thư mục vài trăm tệp mà chỉ hơn vài
 * phần trăm dung lượng, còn phần nặng nhất của đề (ảnh, pdf, jar) vốn đã nén rồi, ép thêm vô ích.
 */
const DEFLATE_LEVEL = 6;

export interface ZipPaperFolderResult {
  /** Archive đã nén — cỡ thật, để UI nói trước "sắp gửi 82,4 MB" cho admin. */
  blob: Blob;
  filename: string;
  /** Số tệp thật sự nằm trong archive. */
  fileCount: number;
}

/**
 * Nén danh sách tệp đã lập kế hoạch, GIỮ NGUYÊN đường dẫn tương đối (`item.path`) để cấu trúc thư
 * mục sống sót sang phía người chấm.
 *
 * `onProgress` nhận phần trăm 0–100 do JSZip báo. LƯU Ý: `generateAsync` KHÔNG huỷ được giữa chừng
 * — nơi gọi phải tự bỏ kết quả cũ (token/ref) khi admin chọn lại hoặc đóng modal.
 */
export async function zipPaperFolder(
  plan: Pick<PaperFolderPlan<Blob>, "items" | "rootName">,
  options: { fallbackName?: string; onProgress?: (percent: number) => void } = {}
): Promise<ZipPaperFolderResult> {
  const zip = new JSZip();
  for (const item of plan.items as readonly PaperFolderItem<Blob>[]) {
    zip.file(item.path, item.file);
  }

  const blob = await zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: DEFLATE_LEVEL },
      mimeType: PAPER_ZIP_CANONICAL_MIME,
    },
    (metadata) => options.onProgress?.(metadata.percent)
  );

  return {
    blob,
    filename: folderArchiveName(plan.rootName, options.fallbackName),
    fileCount: plan.items.length,
  };
}
