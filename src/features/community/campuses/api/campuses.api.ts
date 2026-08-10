import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import type { Campus, CampusFormValues } from "../types";
import { campusesKeys } from "./campuses.keys";

// Raw CampusView trả về từ endpoint admin. nameEn/region có thể null; map phòng thủ để
// đảm bảo đúng shape `Campus` dù BE thiếu trường tuỳ chọn (giống mapCategory).
interface RawCampus {
  id: string;
  code: string;
  name: string;
  nameEn?: string | null;
  region?: string | null;
  active?: boolean;
  sortOrder?: number;
}

function mapCampus(raw: RawCampus): Campus {
  return {
    id: raw.id,
    code: raw.code,
    name: raw.name,
    nameEn: raw.nameEn ?? null,
    region: raw.region ?? null,
    active: raw.active ?? false,
    sortOrder: raw.sortOrder ?? 0,
  };
}

// List qua endpoint admin (`/api/v1/admin/community/campuses`) để lấy TẤT CẢ cơ sở (cả inactive).
// Envelope được interceptor bóc sẵn nên `r.data` chính là mảng CampusView.
export function useCampuses() {
  return useQuery<Campus[], Error>({
    queryKey: campusesKeys.list(),
    queryFn: () =>
      apiClient.get("/community/campuses").then((r) => {
        const data = r.data as RawCampus[] | { items?: RawCampus[] } | null;
        const rows = Array.isArray(data) ? data : data?.items ?? [];
        return rows.map(mapCampus);
      }),
  });
}

export function useCreateCampus() {
  const qc = useQueryClient();
  return useMutation<Campus, Error, CampusFormValues>({
    mutationFn: (values) =>
      apiClient.post("/community/campuses", values).then((r) => r.data as Campus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campusesKeys.lists() });
    },
  });
}

export function useUpdateCampus(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation<Campus, Error, CampusFormValues>({
    mutationFn: (values) =>
      apiClient.put(`/community/campuses/${id}`, values).then((r) => r.data as Campus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campusesKeys.lists() });
    },
  });
}

export function useDeleteCampus() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (campusId) =>
      apiClient.delete(`/community/campuses/${campusId}`).then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campusesKeys.lists() });
    },
  });
}
