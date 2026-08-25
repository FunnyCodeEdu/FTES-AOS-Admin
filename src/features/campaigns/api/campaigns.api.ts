import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../shared/api/client";
import { handleAdminMutationError } from "../../../shared/api/errors";

/** Trạng thái chương trình: DRAFT (soạn) → ACTIVE (đang phát) → ENDED (dừng). */
export type CampaignStatus = "DRAFT" | "ACTIVE" | "ENDED";

/** AdminCampaignView của BE (CampaignDtos). */
export interface AdminCampaign {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  coinAmount: number;
  startsAt?: string | null;
  endsAt?: string | null;
  status: CampaignStatus;
  maxClaims?: number | null;
  claimCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignFormValues {
  code: string;
  title: string;
  description?: string;
  coinAmount: number;
  startsAt?: string | null;
  endsAt?: string | null;
  maxClaims?: number | null;
  status?: CampaignStatus;
}

export const campaignKeys = {
  all: ["admin", "campaigns"] as const,
  list: () => [...campaignKeys.all, "list"] as const,
};

/*
 * Chương trình nhận thưởng Xu — BE `CampaignAdminController` nằm ở module campaign nên đường dẫn là
 * `/api/v1/admin/campaigns` NHƯNG không đi qua `apiClient` (base `/api/v1/admin`) được vì client đó
 * dành cho module admin; ở đây dùng `coreClient` (base `/api/v1`) + path đầy đủ, cùng khuôn với
 * payroll (`/payroll/admin/...`). Quyền: `campaign.manage` (seed V383).
 */

export function useCampaigns() {
  return useQuery<AdminCampaign[], Error>({
    queryKey: campaignKeys.list(),
    queryFn: () => coreClient.get("/admin/campaigns").then((r) => r.data as AdminCampaign[]),
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation<AdminCampaign, Error, CampaignFormValues>({
    mutationFn: (values) =>
      coreClient.post("/admin/campaigns", values).then((r) => r.data as AdminCampaign),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.all }),
    onError: handleAdminMutationError,
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation<AdminCampaign, Error, { id: string; values: Partial<CampaignFormValues> }>({
    mutationFn: ({ id, values }) =>
      coreClient.patch(`/admin/campaigns/${id}`, values).then((r) => r.data as AdminCampaign),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.all }),
    onError: handleAdminMutationError,
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => coreClient.delete(`/admin/campaigns/${id}`).then(() => undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.all }),
    onError: handleAdminMutationError,
  });
}
