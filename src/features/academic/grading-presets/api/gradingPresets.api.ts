import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { challengeBankConsoleKeys } from "../../challenge-bank/api/challengeBankConsole.api";
import type {
  ApplyPresetBody,
  ApplyPresetResult,
  GradingPresetInput,
  GradingPresetView,
} from "../types";

/**
 * Hooks cho kho BỘ TIÊU CHÍ CHẤM theo giảng viên (change teacher-grading-preset).
 *
 * `apiClient` có base `/api/v1/admin`; envelope `{code,message,data}` đã được interceptor bóc nên
 * `res.data` chính là payload.
 */

export const gradingPresetKeys = {
  all: ["admin", "grading-presets"] as const,
  list: (params: { subjectId?: string; status?: string; q?: string }) =>
    [...gradingPresetKeys.all, "list", params] as const,
};

export function useGradingPresets(params: {
  subjectId?: string;
  status?: string;
  q?: string;
}) {
  return useQuery<GradingPresetView[], Error>({
    queryKey: gradingPresetKeys.list(params),
    retry: false,
    placeholderData: (previous) => previous,
    queryFn: () =>
      apiClient
        .get("/challenges/grading-presets", {
          params: {
            subjectId: params.subjectId || undefined,
            status: params.status || undefined,
            q: params.q || undefined,
          },
        })
        .then((r) => r.data as GradingPresetView[]),
  });
}

function useInvalidatePresets() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: gradingPresetKeys.all });
    // Áp thang chấm GHI ĐÈ rubric của đề ⇒ kho thử thách đang mở phải đọc lại, nếu không hai màn
    // hiện hai thang khác nhau cho cùng một đề.
    qc.invalidateQueries({ queryKey: challengeBankConsoleKeys.all });
  };
}

/** Import một hoặc nhiều bộ trong cùng một lượt — BE nhận cả `items[]` lẫn `preset`. */
export function useImportGradingPresets() {
  const invalidate = useInvalidatePresets();
  return useMutation<GradingPresetView[], Error, GradingPresetInput[]>({
    mutationFn: (items) =>
      apiClient
        .post("/challenges/grading-presets", { items })
        .then((r) => r.data as GradingPresetView[]),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

export function useUpdateGradingPreset() {
  const invalidate = useInvalidatePresets();
  return useMutation<GradingPresetView, Error, { id: string; input: GradingPresetInput }>({
    mutationFn: ({ id, input }) =>
      apiClient
        .put(`/challenges/grading-presets/${id}`, input)
        .then((r) => r.data as GradingPresetView),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

export function useDeleteGradingPreset() {
  const invalidate = useInvalidatePresets();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiClient.delete(`/challenges/grading-presets/${id}`).then(() => undefined),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

/** Áp bộ tiêu chí: theo danh sách đề chọn tay, hoặc theo cả môn (kèm lọc tag). */
export function useApplyGradingPreset() {
  const invalidate = useInvalidatePresets();
  return useMutation<ApplyPresetResult, Error, { id: string; body: ApplyPresetBody }>({
    mutationFn: ({ id, body }) =>
      apiClient
        .post(`/challenges/grading-presets/${id}/apply`, body)
        .then((r) => r.data as ApplyPresetResult),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}
