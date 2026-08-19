import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../shared/api/client";
import { handleAdminMutationError } from "../../../shared/api/errors";
import type { IdentityPage } from "./deviceOversight.api";

/**
 * Báo cáo cào đề / lạm dụng (BE change `exam-scrape-guard`).
 *
 * <b>`coreClient`, KHÔNG `apiClient`</b>: endpoint ở `/api/v1/identity/admin/**` — cùng bề mặt với
 * giám sát thiết bị, không phải `/api/v1/admin/**`. Trả `IdentityPage` (`totalElements`), tái dùng
 * type của `deviceOversight.api` chứ không phải `PaginatedResponse` của phần còn lại Admin.
 */

const BASE = "/identity/admin";

/** Một tín hiệu lạm dụng do detector ghi lại (mỗi lần throttle/khoá). */
export interface AbuseSignal {
  id: string;
  userId: string;
  username: string | null;
  /** CRAWL_CONTENT = mở quá nhiều đề; SPAM (dành sẵn). */
  kind: string;
  /** THROTTLED = mới bị chặn 429; LOCKED = đã tự khoá tài khoản. */
  severity: "THROTTLED" | "LOCKED" | string;
  /** Số đề khác nhau trong giờ tại thời điểm ghi. */
  distinctCount: number;
  requestCount: number;
  strikes: number;
  /** Bằng chứng đã parse: { sample, distinctMinute, distinctHour, requestHour }. */
  evidence: Record<string, unknown> | string | null;
  detectedAt: string;
  status: "OPEN" | "RESOLVED" | string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  note: string | null;
}

export const abuseSignalKeys = {
  all: ["admin", "identity", "abuse-signals"] as const,
  list: (status: string, page: number, size: number) =>
    [...abuseSignalKeys.all, "list", status, page, size] as const,
};

export function useAbuseSignals(status: string, page: number, size: number) {
  return useQuery<IdentityPage<AbuseSignal>, Error>({
    queryKey: abuseSignalKeys.list(status, page, size),
    queryFn: () =>
      coreClient
        .get(`${BASE}/abuse-signals`, { params: { status: status || undefined, page, size } })
        .then((r) => r.data as IdentityPage<AbuseSignal>),
  });
}

/**
 * Đánh dấu một tín hiệu đã xử lý. KHÔNG tự mở khoá tài khoản — mở khoá là quyết định riêng (qua đơn
 * kháng nghị hoặc nút khoá/mở ở màn tài khoản), nên BE cố ý tách hai việc.
 */
export function useResolveAbuseSignal() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; note?: string }>({
    mutationFn: ({ id, note }) =>
      coreClient.post(`${BASE}/abuse-signals/${id}/resolve`, { note }).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: abuseSignalKeys.all });
    },
    onError: handleAdminMutationError,
  });
}
