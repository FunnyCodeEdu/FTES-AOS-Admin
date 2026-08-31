import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, coreClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import type {
  CtvAssignment,
  Group,
  GroupDetail,
  PaginatedResponse,
  Post,
} from "../shared/types";

const COMMUNITY_POSTS_QUERY = `query CommunityPosts($filter: AdminCommunityPostFilter, $page: PageInput) {
  communityPosts(filter: $filter, page: $page) {
    items {
      id
      authorId
      postType
      title
      status
      groupId
      createdAt
    }
    total
    page
    size
  }
}`;

const ADMIN_GROUPS_QUERY = `query AdminGroups($page: Int, $pageSize: Int, $search: String, $status: String) {
  adminGroups(filter: { q: $search, status: $status }, page: { page: $page, size: $pageSize }) {
    items {
      id
      name
      slug
      status
      memberCount
      createdAt
    }
    total
    page
    size
  }
}`;

const ADMIN_GROUP_QUERY = `query AdminGroup($id: ID!) {
  adminGroup(id: $id) {
    id
    name
    slug
    status
    memberCount
    createdAt
    members { userId userName role joinedAt }
    posts { id title status createdAt }
    ctvAssignments { id userId userName permissions assignedAt }
  }
}`;

export interface PostsListParams {
  search?: string;
  groupId?: string;
  status?: string;
  pinned?: boolean;
  featured?: boolean;
  page?: number;
  pageSize?: number;
}

export function usePosts(params: PostsListParams = {}) {
  return useQuery<PaginatedResponse<Post>, Error>({
    queryKey: ["community", "posts", params],
    queryFn: async () => {
      return graphqlRequest<{
        communityPosts: {
          items: Array<{
            id: string;
            authorId: string;
            postType?: string;
            title?: string;
            status: string;
            groupId?: string;
            createdAt?: string;
          }>;
          total: number;
          page: number;
          size: number;
        };
      }>(COMMUNITY_POSTS_QUERY, {
        filter: {
          ...(params.search ? { q: params.search } : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.groupId ? { groupId: params.groupId } : {}),
        },
        page: { page: Math.max(0, (params.page ?? 1) - 1), size: params.pageSize ?? 10 },
      }).then((r) => ({
        items: r.communityPosts.items.map((item) => ({
          id: item.id,
          title: item.title ?? "",
          authorId: item.authorId,
          authorName: "",
          groupId: item.groupId,
          groupName: "",
          status: item.status as Post["status"],
          pinned: false,
          featured: false,
          hiddenReason: undefined,
          createdAt: item.createdAt ?? "",
        })),
        total: r.communityPosts.total,
        page: (r.communityPosts.page ?? 0) + 1,
        pageSize: r.communityPosts.size,
      }));
    },
  });
}

export function useTogglePostPin() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; value: boolean }>({
    mutationFn: async ({ id, value }) => {
      await apiClient.post(`/community/posts/${id}/pin`, { value });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", "posts"] }),
  });
}

export function useTogglePostFeature() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; value: boolean }>({
    mutationFn: async ({ id, value }) => {
      await apiClient.post(`/community/posts/${id}/feature`, { value });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", "posts"] }),
  });
}

export function useTogglePostHide() {
  const qc = useQueryClient();
  return useMutation<Post, Error, { id: string; hide: boolean; reason?: string }>({
    mutationFn: async ({ id, hide }) => {
      const res = hide
        ? await apiClient.post(`/community/posts/${id}/hide`)
        : await apiClient.post(`/community/posts/${id}/restore`);
      return res.data as Post;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", "posts"] }),
  });
}

export interface ReviewPostInput {
  postId: string;
  decision: "approve" | "reject";
  scopeId: string;
  reason?: string;
}

export function useReviewPost() {
  const qc = useQueryClient();
  return useMutation<Post, Error, ReviewPostInput>({
    mutationFn: async ({ postId, decision, reason }) => {
      const res = await apiClient.post(`/community/posts/${postId}/review`, {
        decision: decision === "approve" ? "APPROVE" : "REJECT",
        reason,
      });
      return res.data as Post;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community", "posts"] });
      qc.invalidateQueries({ queryKey: ["ctv", "me", "todo"] });
    },
  });
}

export interface GroupsListParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

function mapAdminGroup(item: {
  id: string;
  name: string;
  slug?: string;
  status: string;
  memberCount: number;
  createdAt?: string;
}): Group {
  return {
    id: item.id,
    name: item.name,
    ownerId: "",
    ownerName: "",
    memberCount: item.memberCount,
    status: item.status as Group["status"],
    ctvNames: [],
  };
}

export function useGroups(params: GroupsListParams = {}) {
  return useQuery<PaginatedResponse<Group>, Error>({
    queryKey: ["community", "groups", params],
    queryFn: async () => {
      const data = await graphqlRequest<{ adminGroups: { items: Array<{ id: string; name: string; slug?: string; status: string; memberCount: number; createdAt?: string }>; total: number; page?: number; size?: number } }>(ADMIN_GROUPS_QUERY, {
        page: Math.max(0, (params.page ?? 1) - 1),
        pageSize: params.pageSize ?? 10,
        search: params.search,
        status: params.status,
      });
      return {
        items: data.adminGroups.items.map(mapAdminGroup),
        total: data.adminGroups.total,
        page: (data.adminGroups.page ?? 0) + 1,
        pageSize: data.adminGroups.size ?? (params.pageSize ?? 10),
      };
    },
  });
}

export function useGroup(id: string | undefined) {
  return useQuery<GroupDetail, Error>({
    queryKey: ["community", "groups", id],
    queryFn: async () => {
      const data = await graphqlRequest<{
        adminGroup: {
          id: string; name: string; slug?: string; status: string; memberCount: number; createdAt?: string;
          members: Array<{ userId: string; userName: string; role: string; joinedAt: string }>;
          posts: Array<{ id: string; title: string; status: string; createdAt: string }>;
          ctvAssignments: Array<{ id: string; userId: string; userName: string; permissions: string[]; assignedAt: string }>;
        };
      }>(ADMIN_GROUP_QUERY, { id });
      const item = data.adminGroup;
      return {
        id: item.id,
        name: item.name,
        description: "",
        ownerId: "",
        ownerName: "",
        memberCount: item.memberCount,
        status: item.status as GroupDetail["status"],
        members: (item.members ?? []).map((m) => ({
          userId: m.userId,
          userName: m.userName,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        posts: (item.posts ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          authorId: "",
          authorName: "",
          groupId: item.id,
          groupName: item.name,
          status: p.status as Post["status"],
          pinned: false,
          featured: false,
          createdAt: p.createdAt,
        })),
        ctvAssignments: (item.ctvAssignments ?? []).map((c) => ({
          id: c.id,
          userId: c.userId,
          userName: c.userName,
          permissions: c.permissions ?? [],
          assignedAt: c.assignedAt,
        })),
      };
    },
    enabled: !!id,
  });
}

export function useTransferGroupOwner() {
  const qc = useQueryClient();
  return useMutation<GroupDetail, Error, { id: string; newOwnerId: string; reason: string }>({
    mutationFn: async ({ id, newOwnerId, reason }) => {
      const res = await apiClient.post(`/community/groups/${id}/transfer-owner`, { newOwnerId, reason });
      return res.data as GroupDetail;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["community", "groups", id] });
      qc.invalidateQueries({ queryKey: ["community", "groups"] });
    },
  });
}

export function useToggleGroupLock() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; lock: boolean; reason?: string }>({
    mutationFn: async ({ id, lock, reason }) => {
      if (lock) await apiClient.post(`/groups/${id}/lock`, { reason });
      else await apiClient.post(`/groups/${id}/unlock`);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["community", "groups", id] });
      qc.invalidateQueries({ queryKey: ["community", "groups"] });
    },
  });
}

export function useAssignCtv() {
  const qc = useQueryClient();
  return useMutation<CtvAssignment, Error, { id: string; userId: string; userName: string; permissions: string[] }>({
    mutationFn: async ({ id, userId, permissions }) => {
      const res = await apiClient.post(`/community/groups/${id}/ctv-assignments`, { userId, permissions });
      return res.data as CtvAssignment;
    },
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ["community", "groups", id] }),
  });
}

export function useRevokeCtv() {
  const qc = useQueryClient();
  return useMutation<string, Error, { id: string; assignmentId: string }>({
    mutationFn: async ({ id, assignmentId }) => {
      await apiClient.delete(`/community/groups/${id}/ctv-assignments/${assignmentId}`);
      return assignmentId;
    },
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ["community", "groups", id] }),
  });
}

// ===========================================================================
// Sửa thông tin nhóm cộng đồng từ Admin — ảnh đại diện, ảnh bìa, mô tả.
//
// Vì sao KHÔNG đi qua GraphQL `adminGroup` như phần còn lại của trang: query đó không trả
// description lẫn ảnh (mã cũ hardcode `description: ""`), và mở rộng nó phải sửa hợp đồng RPC nằm
// trong `ftes-aos-contracts` — jar dựng sẵn, không có source trong repo nào trên máy này.
//
// Đường REST của community thì đã sẵn sàng: GroupService.requireManage cho phép cả ADMIN toàn cục
// (`hasGlobalModeration`), nên admin nền tảng gọi thẳng được mà không cần là thành viên nhóm.
// ===========================================================================

export interface GroupProfile {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
}

/** Đọc hồ sơ nhóm qua REST community (GraphQL admin không có description/ảnh). */
export function useGroupProfile(id: string | undefined) {
  return useQuery<GroupProfile, Error>({
    queryKey: ["community", "group-profile", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await coreClient.get(`/groups/${id}`);
      const g = (res.data?.data ?? res.data) as GroupProfile;
      return {
        id: g.id,
        name: g.name,
        description: g.description ?? null,
        avatarUrl: g.avatarUrl ?? null,
        coverUrl: g.coverUrl ?? null,
      };
    },
  });
}

export function useUpdateGroupProfile(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, { name?: string; description?: string }>({
    mutationFn: async (body) => {
      await coreClient.patch(`/groups/${id}`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community", "group-profile", id] });
      qc.invalidateQueries({ queryKey: ["community", "groups", id] });
    },
  });
}

/** Trường định danh ảnh mà dịch vụ upload có thể trả — dò theo danh sách vì contract của nó
 *  không nằm trong repo nào trên máy này (mirror FE học viên). */
const UPLOAD_REF_FIELDS = ["id", "imageId", "image_id", "key", "storageKey", "url", "path"];

function readUploadedRef(payload: unknown): string | null {
  if (typeof payload === "string") return payload.trim() || null;
  if (payload === null || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  for (const field of UPLOAD_REF_FIELDS) {
    const value = record[field];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "data" in record ? readUploadedRef(record.data) : null;
}

/**
 * Đổi ảnh nhóm: presign → POST file lên dịch vụ upload → verify.
 *
 * <p>Bước verify PHẢI mang `uploadedRef` (id ảnh THẬT do dịch vụ upload cấp). Thiếu nó thì backend
 * dựng URL đọc từ khoá presign tự sinh, mà dịch vụ upload chưa từng biết khoá đó ⇒ ảnh lưu xong
 * vẫn 404. Đây đúng là lỗi đã làm ảnh nhóm không bao giờ hiện.
 */
export function useUploadGroupMedia(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, { kind: "AVATAR" | "COVER"; file: File }>({
    mutationFn: async ({ kind, file }) => {
      const presignRes = await coreClient.post(`/groups/${id}/media/presign`, {
        kind,
        contentType: file.type,
        sizeBytes: file.size,
      });
      const presign = (presignRes.data?.data ?? presignRes.data) as {
        uploadUrl: string;
        storageKey: string;
      };

      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch(presign.uploadUrl, { method: "POST", body: form });
      if (!uploadRes.ok) {
        throw new Error(`Tải ảnh lên thất bại (${uploadRes.status})`);
      }
      const payload = await uploadRes.json().catch(() => null);
      const uploadedRef = readUploadedRef(payload) ?? uploadRes.headers.get("Location")?.trim();
      if (!uploadedRef) {
        throw new Error("Dịch vụ upload không trả về định danh ảnh");
      }

      await coreClient.post(`/groups/${id}/media/verify`, {
        kind,
        storageKey: presign.storageKey,
        uploadedRef,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community", "group-profile", id] });
    },
  });
}
