import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";

/**
 * Album đề FE của một học liệu `type=FE` (BE change subject-fe-text-exams / subject-fe-image-exams).
 *
 * <b>`coreClient`, KHÔNG `apiClient`</b>: nhóm endpoint này nằm ở `/api/v1/resources/**` — bề mặt
 * CÔNG KHAI dùng chung với FE học viên, không phải `/api/v1/admin/**`. Cùng lý do mà
 * `resources.api.ts` đã gọi `coreClient` cho lượt tạo học liệu. Gọi nhầm client sẽ ra
 * `/api/v1/admin/resources/...` và 404 câm.
 */

/** Một TRANG trong album: scan (`IMAGE`) hoặc chữ đã chuẩn hoá (`TEXT`). */
export interface FeAlbumPage {
  id: string;
  resourceId: string;
  /** null với trang TEXT. */
  imageUrl: string | null;
  sortOrder: number;
  caption?: string | null;
  commentCount: number;
  createdAt?: string;
  /** Vắng mặt = backend cũ ⇒ mọi trang là ảnh, đúng như album cũ vốn có. */
  kind?: "IMAGE" | "TEXT";
  textContent?: string | null;
  sourceFilename?: string | null;
}

export interface FeAlbum {
  resourceId: string;
  images: FeAlbumPage[];
  total: number;
  maxImages: number;
  canManage: boolean;
}

/** Một file KHÔNG nạp được, kèm lý do đọc được (hiện thẳng cho người nạp). */
export interface FeImportFailure {
  filename: string;
  reason: string;
}

export interface FeImportResult {
  created: FeAlbumPage[];
  failed: FeImportFailure[];
  /** Chỗ AI phải đoán — hiện lên, KHÔNG nuốt: đó là lý do người soạn quay lại sửa file gốc. */
  warnings: string[];
}

export const feAlbumKeys = {
  all: ["admin", "fe-album"] as const,
  detail: (resourceId: string | undefined) =>
    resourceId ? ([...feAlbumKeys.all, resourceId] as const) : feAlbumKeys.all,
};

export function useFeAlbum(resourceId: string | undefined) {
  return useQuery<FeAlbum, Error>({
    queryKey: feAlbumKeys.detail(resourceId),
    enabled: Boolean(resourceId),
    queryFn: () =>
      coreClient.get(`/resources/${resourceId}/images`).then((r) => r.data as FeAlbum),
  });
}

/** Kiểu nạp: file văn bản đã có sẵn, hay ẢNH trang đề cần số hoá. */
export type FeImportMode = "TEXT" | "SCAN";

const ENDPOINT: Record<FeImportMode, string> = {
  TEXT: "text-items",
  SCAN: "image-text-items",
};

/**
 * Nạp file vào album — **MỘT file mỗi request, tuần tự**.
 *
 * Không gộp cả lô vào một request: mỗi file là một lượt gọi AI chạy nối tiếp dưới ngân sách 90s ở
 * server. Mười file trong một request là mười lăm phút giữ kết nối — proxy cắt từ lâu, và người
 * nạp nhận một lỗi mạng trống trơn SAU KHI vài trang đã được tạo, nên bấm lại là nhân đôi chúng.
 *
 * Một file hỏng không dừng cả lượt: lý do được gom lại để màn hình nêu đích danh file nào.
 */
export function useImportFeAlbumFiles() {
  const queryClient = useQueryClient();
  return useMutation<
    { imported: number; failed: FeImportFailure[]; warnings: string[] },
    Error,
    { resourceId: string; files: File[]; mode: FeImportMode; onProgress?: (done: number, total: number) => void }
  >({
    mutationFn: async ({ resourceId, files, mode, onProgress }) => {
      const failed: FeImportFailure[] = [];
      const warnings = new Set<string>();
      let imported = 0;

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const form = new FormData();
        form.append("files", file);
        try {
          const res = await coreClient.post(
            `/resources/${resourceId}/${ENDPOINT[mode]}`,
            form,
            { headers: { "Content-Type": "multipart/form-data" } },
          );
          const data = res.data as FeImportResult;
          imported += data.created?.length ?? 0;
          data.failed?.forEach((f) => failed.push(f));
          data.warnings?.forEach((w) => warnings.add(w));
        } catch (error) {
          // Cả request hỏng (403/503/mạng) — quy về ĐÚNG file này để màn hình gọi được tên nó,
          // rồi đi tiếp với những file còn lại.
          failed.push({
            filename: file.name,
            reason: error instanceof Error ? error.message : "Không nạp được file",
          });
        }
        onProgress?.(i + 1, files.length);
      }
      return { imported, failed, warnings: Array.from(warnings) };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: feAlbumKeys.detail(variables.resourceId) });
    },
    onError: handleAdminMutationError,
  });
}
