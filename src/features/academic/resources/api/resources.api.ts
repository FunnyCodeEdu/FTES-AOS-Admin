import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import { graphqlRequest } from "../../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type {
  PaginatedResponse,
  Resource,
  ResourceDetail,
  ResourceFormValues,
  ResourceListParams,
  ResourceVersion,
} from "../../types";
import { resourcesKeys } from "./resources.keys";

const ADMIN_RESOURCES_QUERY = `query AdminResources($filter: AdminResourceFilter, $page: PageInput) {
  adminResources(filter: $filter, page: $page) {
    items {
      id
      title
      type
      status
      subjectId
      visibility
    }
    total
    page
    size
  }
}`;

export function useResources(params: ResourceListParams) {
  return useQuery<PaginatedResponse<Resource>, Error>({
    queryKey: resourcesKeys.list(params),
    queryFn: () =>
      graphqlRequest<{
        adminResources: {
          items: Array<{
            id: string;
            title: string;
            type: string;
            status: string;
            subjectId?: string;
            visibility?: string;
          }>;
          total: number;
          page: number;
          size: number;
        };
      }>(ADMIN_RESOURCES_QUERY, {
        filter: {
          ...(params.search ? { q: params.search } : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.subjectId ? { subjectId: params.subjectId } : {}),
        },
        page: { page: Math.max(0, params.page - 1), size: params.pageSize },
      }).then((r) => {
        const now = new Date().toISOString();
        return {
          items: r.adminResources.items.map((item) => ({
            id: item.id,
            subjectId: item.subjectId ?? "",
            subjectName: "",
            title: item.title,
            type: item.type as Resource["type"],
            status: item.status as Resource["status"],
            visibility: (item.visibility ?? "public") as Resource["visibility"],
            license: undefined,
            currentVersion: 0,
            createdBy: "",
            createdAt: now,
            updatedAt: now,
          })),
          total: r.adminResources.total,
          page: (r.adminResources.page ?? 0) + 1,
          pageSize: r.adminResources.size,
        };
      }),
    placeholderData: (previous) => previous,
  });
}

export function useResource(id: string | undefined) {
  return useQuery<ResourceDetail, Error>({
    queryKey: resourcesKeys.detail(id),
    queryFn: () => apiClient.get(`/resources/${id}`).then((r) => r.data as ResourceDetail),
    enabled: !!id,
  });
}

export function useResourceVersions(id: string | undefined) {
  return useQuery<{ items: ResourceVersion[] }, Error>({
    queryKey: resourcesKeys.versions(id),
    queryFn: () =>
      apiClient.get(`/resources/${id}/versions`).then((r) => r.data as { items: ResourceVersion[] }),
    enabled: !!id,
  });
}

export function useReviewQueue(params: ResourceListParams) {
  return useQuery<PaginatedResponse<Resource>, Error>({
    queryKey: resourcesKeys.reviewQueue(params),
    queryFn: () =>
      graphqlRequest<{
        adminResources: {
          items: Array<{
            id: string;
            title: string;
            type: string;
            status: string;
            subjectId?: string;
            visibility?: string;
          }>;
          total: number;
          page: number;
          size: number;
        };
      }>(ADMIN_RESOURCES_QUERY, {
        filter: {
          ...(params.search ? { q: params.search } : {}),
          status: "pending",
          ...(params.subjectId ? { subjectId: params.subjectId } : {}),
        },
        page: { page: Math.max(0, params.page - 1), size: params.pageSize },
      }).then((r) => {
        const now = new Date().toISOString();
        return {
          items: r.adminResources.items.map((item) => ({
            id: item.id,
            subjectId: item.subjectId ?? "",
            subjectName: "",
            title: item.title,
            type: item.type as Resource["type"],
            status: item.status as Resource["status"],
            visibility: (item.visibility ?? "public") as Resource["visibility"],
            license: undefined,
            currentVersion: 0,
            createdBy: "",
            createdAt: now,
            updatedAt: now,
          })),
          total: r.adminResources.total,
          page: (r.adminResources.page ?? 0) + 1,
          pageSize: r.adminResources.size,
        };
      }),
    placeholderData: (previous) => previous,
  });
}

export function useCreateResource() {
  const queryClientLocal = useQueryClient();
  return useMutation<Resource, Error, ResourceFormValues>({
    mutationFn: (values) =>
      apiClient.post("/resources", values).then((r) => r.data as Resource),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.lists() });
    },
  });
}

export function useUpdateResource(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<ResourceDetail, Error, ResourceFormValues>({
    mutationFn: (values) =>
      apiClient.put(`/resources/${id}`, values).then((r) => r.data as ResourceDetail),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.detail(id) });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.lists() });
    },
  });
}

export function useDeleteResource() {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (resourceId) => apiClient.delete(`/resources/${resourceId}`).then(() => undefined),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.lists() });
    },
    onError: handleAdminMutationError,
  });
}

export function useApproveResource() {
  const queryClientLocal = useQueryClient();
  return useMutation<ResourceDetail, Error, { resourceId: string; note?: string }>({
    mutationFn: ({ resourceId, note }) =>
      apiClient.post(`/resources/${resourceId}/approve`, { note }).then((r) => r.data as ResourceDetail),
    onSuccess: (_data, vars) => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.detail(vars.resourceId) });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.lists() });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.reviewQueue({ page: 1, pageSize: 10 }) });
    },
    onError: handleAdminMutationError,
  });
}

export function useRejectResource() {
  const queryClientLocal = useQueryClient();
  return useMutation<ResourceDetail, Error, { resourceId: string; reason: string }>({
    mutationFn: ({ resourceId, reason }) =>
      apiClient.post(`/resources/${resourceId}/reject`, { reason }).then((r) => r.data as ResourceDetail),
    onSuccess: (_data, vars) => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.detail(vars.resourceId) });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.lists() });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.reviewQueue({ page: 1, pageSize: 10 }) });
    },
    onError: handleAdminMutationError,
  });
}

export function useRestoreResourceVersion(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<ResourceDetail, Error, number>({
    mutationFn: (version) =>
      apiClient
        .post(`/resources/${id}/versions/${version}/restore`)
        .then((r) => r.data as ResourceDetail),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.detail(id) });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.versions(id) });
    },
    onError: handleAdminMutationError,
  });
}
