// Learning Pack catalog — khớp BE AdminLearningPackController (change admin-learning-pack-catalog).
// Base apiClient = /api/v1/admin, interceptor unwrap envelope {code,message,data} -> r.data = data.
//   GET    /packs                 -> { items: Pack[], total, page, pageSize }
//   GET    /packs/{id}            -> PackDetail (Pack + items[])
//   POST   /packs   {name,description,status}  -> Pack
//   PUT    /packs/{id} {name,description,status} -> PackDetail
//   DELETE /packs/{id}            -> null
//   PUT    /packs/{id}/items {items: PackItem[]} -> PackDetail (replace-all; title BE tự resolve)
// status/type gửi lowercase (active|inactive|draft / course|resource) — BE chuẩn hoá 2 chiều.
// LƯU Ý quyền: BE gác endpoint bằng `admin.pack.manage`; route FE (routeRegistry) hiện gác
// `package.manage` — cần thống nhất 1 leaf để nav/route và API cùng mở cho ADMIN (xem TODO).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type {
  Pack,
  PackDetail,
  PackFormValues,
  PackItem,
  PackListParams,
  PaginatedResponse,
} from "../../types";
import { packsKeys } from "./packs.keys";

export function usePacks(params: PackListParams) {
  return useQuery<PaginatedResponse<Pack>, Error>({
    queryKey: packsKeys.list(params),
    queryFn: () => apiClient.get("/packs", { params }).then((r) => r.data as PaginatedResponse<Pack>),
    placeholderData: (previous) => previous,
  });
}

export function usePack(id: string | undefined) {
  return useQuery<PackDetail, Error>({
    queryKey: packsKeys.detail(id),
    queryFn: () => apiClient.get(`/packs/${id}`).then((r) => r.data as PackDetail),
    enabled: !!id,
  });
}

export function useCreatePack() {
  const queryClientLocal = useQueryClient();
  return useMutation<Pack, Error, PackFormValues>({
    mutationFn: (values) => apiClient.post("/packs", values).then((r) => r.data as Pack),
    onSuccess: () => queryClientLocal.invalidateQueries({ queryKey: packsKeys.lists() }),
  });
}

export function useUpdatePack(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<PackDetail, Error, PackFormValues>({
    mutationFn: (values) => apiClient.put(`/packs/${id}`, values).then((r) => r.data as PackDetail),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: packsKeys.detail(id) });
      queryClientLocal.invalidateQueries({ queryKey: packsKeys.lists() });
    },
  });
}

export function useDeletePack() {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (packId) => apiClient.delete(`/packs/${packId}`).then(() => undefined),
    onSuccess: () => queryClientLocal.invalidateQueries({ queryKey: packsKeys.lists() }),
    onError: handleAdminMutationError,
  });
}

export function useUpdatePackItems(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<PackDetail, Error, { items: PackItem[] }>({
    mutationFn: (values) =>
      apiClient.put(`/packs/${id}/items`, values).then((r) => r.data as PackDetail),
    onSuccess: () => queryClientLocal.invalidateQueries({ queryKey: packsKeys.detail(id) }),
  });
}
