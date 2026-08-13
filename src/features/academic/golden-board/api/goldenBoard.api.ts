import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import type { GoldenBoardEntry, GoldenBoardEntryUpsertRequest } from "../types";
import { goldenBoardKeys } from "./goldenBoard.keys";

/**
 * Bảng vàng theo kỳ. Endpoint nằm dưới `/api/v1/admin/golden-board/**` → dùng `apiClient` (base
 * `/api/v1/admin`); envelope `{code,message,data}` đã được interceptor bóc nên `r.data` chính là
 * payload. Cả đọc lẫn ghi gate MỘT leaf `goldenboard.manage`.
 *
 * Mutation KHÔNG gắn `onError: handleAdminMutationError` như terms: trang cần bắt riêng 409
 * GOLDEN_BOARD_DUPLICATE_USER để gắn lỗi lên đúng ô tài khoản (khuôn CampusListPage với
 * COMMUNITY_CAMPUS_CODE_EXISTS), rồi mới rơi về bảng thông báo chung.
 */

// AdminGoldenBoardEntryView thô: map phòng thủ để `lines` luôn là mảng và các field tuỳ chọn luôn
// là null thay vì undefined (form phân biệt "chưa nhập" với "đã xoá").
interface RawGoldenBoardEntry {
  id: string;
  termId?: string | null;
  rank?: number;
  userId?: string | null;
  linkedUsername?: string | null;
  linkedDisplayName?: string | null;
  linkedAvatarUrl?: string | null;
  displayName?: string | null;
  photoUrl?: string | null;
  headline?: string | null;
  badgeLabel?: string | null;
  lines?: string[] | null;
  active?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function mapEntry(raw: RawGoldenBoardEntry): GoldenBoardEntry {
  return {
    id: raw.id,
    termId: raw.termId ?? "",
    rank: raw.rank ?? 0,
    userId: raw.userId ?? null,
    linkedUsername: raw.linkedUsername ?? null,
    linkedDisplayName: raw.linkedDisplayName ?? null,
    linkedAvatarUrl: raw.linkedAvatarUrl ?? null,
    displayName: raw.displayName ?? null,
    photoUrl: raw.photoUrl ?? null,
    headline: raw.headline ?? null,
    badgeLabel: raw.badgeLabel ?? null,
    lines: Array.isArray(raw.lines) ? raw.lines : [],
    active: raw.active ?? false,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

/**
 * Toàn bộ dòng của một kỳ, KỂ CẢ dòng đã tắt (khác đường công khai chỉ lấy active) — console phải
 * thấy hết thì mới bật lại được người đã gỡ khỏi bảng.
 * `termIdOrCode` nhận cả id kỳ lẫn mã kỳ; picker luôn gửi id.
 */
export function useGoldenBoardEntries(termIdOrCode: string | undefined) {
  return useQuery<GoldenBoardEntry[], Error>({
    queryKey: goldenBoardKeys.list(termIdOrCode),
    queryFn: () =>
      apiClient.get(`/golden-board/terms/${termIdOrCode}/entries`).then((r) => {
        const data = r.data as RawGoldenBoardEntry[] | { items?: RawGoldenBoardEntry[] } | null;
        const rows = Array.isArray(data) ? data : data?.items ?? [];
        return rows.map(mapEntry);
      }),
    enabled: !!termIdOrCode,
  });
}

export function useCreateGoldenBoardEntry(termIdOrCode: string | undefined) {
  const qc = useQueryClient();
  return useMutation<GoldenBoardEntry, Error, GoldenBoardEntryUpsertRequest>({
    mutationFn: (body) =>
      apiClient
        .post(`/golden-board/terms/${termIdOrCode}/entries`, body)
        .then((r) => mapEntry(r.data as RawGoldenBoardEntry)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goldenBoardKeys.list(termIdOrCode) });
    },
  });
}

/**
 * Sửa một dòng. Đường ghi neo theo ENTRY id (không có termId trên URL) nhưng cache neo theo kỳ,
 * nên hook nhận thêm kỳ đang xem để invalidate đúng list.
 */
export function useUpdateGoldenBoardEntry(
  entryId: string | undefined,
  termIdOrCode: string | undefined
) {
  const qc = useQueryClient();
  return useMutation<GoldenBoardEntry, Error, GoldenBoardEntryUpsertRequest>({
    mutationFn: (body) =>
      apiClient
        .put(`/golden-board/entries/${entryId}`, body)
        .then((r) => mapEntry(r.data as RawGoldenBoardEntry)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goldenBoardKeys.list(termIdOrCode) });
    },
  });
}

export function useDeleteGoldenBoardEntry(termIdOrCode: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (entryId) =>
      apiClient.delete(`/golden-board/entries/${entryId}`).then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goldenBoardKeys.list(termIdOrCode) });
    },
  });
}
