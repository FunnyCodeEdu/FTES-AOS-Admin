import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../shared/api/client";
import { payrollMeKeys } from "./payrollMe.keys";
import type { Earning } from "../shared/types";

/**
 * Payroll self-service qua `coreClient` (`/api/v1`, KHÔNG `apiClient` `/api/v1/admin`).
 * Owner của mọi endpoint bị ép theo JWT ở BE — FE chỉ thấy lương của chính người đăng nhập.
 */

export function useMyEarnings() {
  return useQuery<Earning[], Error>({
    queryKey: payrollMeKeys.earnings(),
    queryFn: async () => {
      const res = await coreClient.get<Earning[]>("/payroll/me/earnings");
      return res.data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useMyCurrentEarning() {
  return useQuery<Earning, Error>({
    queryKey: payrollMeKeys.current(),
    queryFn: async () => {
      const res = await coreClient.get<Earning>("/payroll/me/earnings/current");
      return res.data;
    },
  });
}

/**
 * Yêu cầu chi trả kỳ hiện tại: OPEN → PENDING. BE tự lấy batch OPEN của owner (không cần id).
 * 400 `PAYROLL_BALANCE_NOT_ENOUGH` khi `netPayable < 50000` → normalizeError giữ errorCode,
 * caller dùng handleAdminMutationError để hiện message tiếng Việt.
 */
export function useRequestPayout() {
  const qc = useQueryClient();
  return useMutation<Earning, Error, void>({
    mutationFn: async () => {
      const res = await coreClient.post<Earning>("/payroll/me/earnings/request-payout");
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollMeKeys.earnings() });
      qc.invalidateQueries({ queryKey: payrollMeKeys.current() });
    },
  });
}
