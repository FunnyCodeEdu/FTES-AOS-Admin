import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../shared/api/client";
import { handleAdminMutationError } from "../../../shared/api/errors";
import { payrollKeys } from "./payroll.keys";
import type { DeductionInput, Earning, EarningStatus } from "../types";

/**
 * Admin payroll console qua `coreClient` (`/api/v1`, KHÔNG `apiClient` `/api/v1/admin` —
 * payroll nằm trực tiếp dưới `/api/v1/payroll`). Envelope `{code,message,data}` đã được
 * interceptor bóc, nên `res.data` chính là payload.
 */

/** Danh sách lương của MỌI giảng viên; BE lazily đảm bảo mỗi giảng viên có 1 batch OPEN. */
export function usePayrollList() {
  return useQuery<Earning[], Error>({
    queryKey: payrollKeys.lists(),
    queryFn: async () => {
      const res = await coreClient.get<Earning[]>("/payroll/admin/earnings");
      return res.data;
    },
    placeholderData: (previous) => previous,
  });
}

export function usePayrollDetail(id: string | undefined) {
  return useQuery<Earning, Error>({
    queryKey: payrollKeys.detail(id),
    queryFn: async () => {
      const res = await coreClient.get<Earning>(`/payroll/admin/earnings/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

/** Invalidate cả detail của batch lẫn danh sách sau mỗi mutation ghi. */
function useInvalidatePayroll(id: string | undefined) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: payrollKeys.lists() });
    if (id) qc.invalidateQueries({ queryKey: payrollKeys.detail(id) });
  };
}

/** PUT allowance — chỉ hợp lệ khi batch OPEN; BE trả Earning mới (netPayable đã tính lại). */
export function useUpdateAllowance(id: string | undefined) {
  const invalidate = useInvalidatePayroll(id);
  return useMutation<Earning, Error, { allowance: number }>({
    mutationFn: async ({ allowance }) => {
      const res = await coreClient.put<Earning>(
        `/payroll/admin/earnings/${id}/allowance`,
        { allowance }
      );
      return res.data;
    },
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

export function useAddDeduction(id: string | undefined) {
  const invalidate = useInvalidatePayroll(id);
  return useMutation<unknown, Error, DeductionInput>({
    mutationFn: async (body) => {
      const res = await coreClient.post(
        `/payroll/admin/earnings/${id}/deductions`,
        body
      );
      return res.data;
    },
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

export function useUpdateDeduction(earningId: string | undefined) {
  const invalidate = useInvalidatePayroll(earningId);
  return useMutation<unknown, Error, { deductionId: string; body: Partial<DeductionInput> }>({
    mutationFn: async ({ deductionId, body }) => {
      const res = await coreClient.put(
        `/payroll/admin/deductions/${deductionId}`,
        body
      );
      return res.data;
    },
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

export function useDeleteDeduction(earningId: string | undefined) {
  const invalidate = useInvalidatePayroll(earningId);
  return useMutation<void, Error, { deductionId: string }>({
    mutationFn: async ({ deductionId }) => {
      await coreClient.delete(`/payroll/admin/deductions/${deductionId}`);
    },
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

/** POST status — luồng OPEN → PENDING → CLOSE; PENDING→CLOSE = mark-paid (set paidAt). */
export function useUpdateStatus(id: string | undefined) {
  const invalidate = useInvalidatePayroll(id);
  return useMutation<Earning, Error, { status: EarningStatus }>({
    mutationFn: async ({ status }) => {
      const res = await coreClient.post<Earning>(
        `/payroll/admin/earnings/${id}/status`,
        { status }
      );
      return res.data;
    },
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}
