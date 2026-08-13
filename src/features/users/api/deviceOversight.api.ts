import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../shared/api/client";
import { handleAdminMutationError } from "../../../shared/api/errors";

/**
 * Giám sát thiết bị + đơn xin mở khoá (BE change `identity-device-ban-appeal`).
 *
 * <b>Dùng `coreClient`, KHÔNG `apiClient`.</b> `apiClient` cắm sẵn base `/api/v1/admin`, còn nhóm
 * endpoint này nằm ở `/api/v1/identity/admin/**` — đây là hai bề mặt admin KHÁC NHAU (module
 * identity có controller admin riêng, gác bằng permission riêng). Gọi nhầm client sẽ ra
 * `/api/v1/admin/identity/...` và 404 câm.
 */

const BASE = "/identity/admin";

/**
 * Trang dữ liệu của module identity — KHÁC `PaginatedResponse` dùng ở phần còn lại của Admin.
 * BE `SecurityDtos.PageResponse` trả `{items, page, size, totalElements}`, không phải
 * `{items, total, pageSize}`; tái dùng type kia sẽ làm `total` thành `undefined` và phân trang
 * câm lặng chỉ hiện đúng một trang.
 */
export interface IdentityPage<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
}

/** Một tài khoản đăng nhập từ nhiều thiết bị trong cửa sổ. */
export interface MultiDeviceAccount {
  userId: string;
  username: string | null;
  email: string | null;
  /** Số thiết bị PHÂN BIỆT còn hoạt động trong cửa sổ (đã trừ thiết bị bị thu hồi). */
  deviceCount: number;
  /** Mô tả gọn vài thiết bị gần nhất, do BE soạn ("Windows·Chrome, Android·Chrome"). */
  devices: string;
  /** Số lần đã bị admin khoá — đây là "tag đã vi phạm N lần". */
  violationCount: number;
  locked: boolean;
  lastSeenAt: string | null;
}

export interface MultiDeviceParams {
  minDevices: number;
  days: number;
  page: number;
  size: number;
}

export interface UnlockAppeal {
  id: string;
  userId: string;
  username: string | null;
  email: string | null;
  message: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  /** Lý do của lần khoá đang bị khiếu nại (BE soạn từ thiết bị thật). */
  lockReason: string | null;
  lockedAt: string | null;
  violationCount: number;
  decidedAt: string | null;
  decisionNote: string | null;
}

export const deviceOversightKeys = {
  all: ["admin", "identity", "device-oversight"] as const,
  multiDevice: (params: MultiDeviceParams) =>
    [...deviceOversightKeys.all, "multi-device", params] as const,
  appeals: (status: string, page: number, size: number) =>
    [...deviceOversightKeys.all, "appeals", status, page, size] as const,
};

export function useMultiDeviceAccounts(params: MultiDeviceParams) {
  return useQuery<IdentityPage<MultiDeviceAccount>, Error>({
    queryKey: deviceOversightKeys.multiDevice(params),
    queryFn: () =>
      coreClient
        .get(`${BASE}/users/multi-device`, { params })
        .then((r) => r.data as IdentityPage<MultiDeviceAccount>),
  });
}

/**
 * Khoá vì dùng chung tài khoản. KHÔNG gửi `reason`: BE soạn lý do từ thiết bị có thật trong cửa
 * sổ, nên câu người bị khoá đọc được luôn khớp dữ liệu thay vì phụ thuộc admin gõ tay.
 */
export function useLockForDeviceSharing() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { userId: string; windowDays: number }>({
    mutationFn: ({ userId, windowDays }) =>
      coreClient.post(`${BASE}/users/${userId}/lock-devices`, { windowDays }).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceOversightKeys.all });
    },
    onError: handleAdminMutationError,
  });
}

export function useUnlockAppeals(status: string, page: number, size: number) {
  return useQuery<IdentityPage<UnlockAppeal>, Error>({
    queryKey: deviceOversightKeys.appeals(status, page, size),
    queryFn: () =>
      coreClient
        .get(`${BASE}/appeals`, { params: { status: status || undefined, page, size } })
        .then((r) => r.data as IdentityPage<UnlockAppeal>),
  });
}

export function useDecideAppeal() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; approve: boolean; note?: string }>({
    mutationFn: ({ id, approve, note }) =>
      coreClient
        .post(`${BASE}/appeals/${id}/${approve ? "approve" : "reject"}`, { note })
        .then(() => undefined),
    onSuccess: () => {
      // Duyệt đơn ĐỔI CẢ trạng thái khoá của tài khoản → làm mới luôn bảng thiết bị, nếu không
      // admin vừa mở khoá xong quay lại bảng vẫn thấy "Đang khoá".
      queryClient.invalidateQueries({ queryKey: deviceOversightKeys.all });
    },
    onError: handleAdminMutationError,
  });
}
