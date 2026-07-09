import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import type {
  CommunityEvent,
  CtvAssignment,
  EventReviewStatus,
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

const ADMIN_EVENTS_QUERY = `query AdminEvents($filter: AdminEventFilter, $page: PageInput) {
  adminEvents(filter: $filter, page: $page) {
    items {
      id
      type
      title
      slug
      status
      startAt
      endAt
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
  }
}`;

const mockPosts: Post[] = [
  {
    id: "post-1",
    title: "Chia sẻ cách học Toán 12",
    authorId: "u-1",
    authorName: "User A",
    groupId: "g-1",
    groupName: "Học Toán 12",
    status: "active",
    pinned: false,
    featured: false,
    createdAt: "2026-07-04T08:00:00Z",
  },
];

const mockGroups: Group[] = [
  {
    id: "g-1",
    name: "Học Toán 12",
    ownerId: "u-1",
    ownerName: "User A",
    memberCount: 120,
    status: "active",
    ctvNames: ["CTV A"],
  },
];

const mockGroupDetails = new Map<string, GroupDetail>();
function getGroupDetail(id: string): GroupDetail {
  if (!mockGroupDetails.has(id)) {
    const group = mockGroups.find((g) => g.id === id)!;
    mockGroupDetails.set(id, {
      ...group,
      description: "Group học tập",
      members: [{ userId: "u-1", userName: "User A", role: "owner", joinedAt: "2026-01-01T00:00:00Z" }],
      posts: mockPosts.filter((p) => p.groupId === id),
      ctvAssignments: [{ id: "ctv-1", userId: "u-5", userName: "CTV A", permissions: ["community.report.view"], assignedAt: "2026-06-01T00:00:00Z" }],
    });
  }
  return mockGroupDetails.get(id)!;
}

const mockEvents: CommunityEvent[] = [
  {
    id: "evt-1",
    title: "Offline ôn thi",
    description: "Gặp mặt ôn thi cuối tuần",
    groupId: "g-1",
    groupName: "Học Toán 12",
    organizerName: "User A",
    location: "Hà Nội",
    startAt: "2026-07-20T08:00:00Z",
    status: "pending",
    reviewHistory: [],
  },
];

export interface PostsListParams {
  search?: string;
  groupId?: string;
  status?: string;
  pinned?: boolean;
  featured?: boolean;
  page?: number;
  pageSize?: number;
}

const MOCK_ENABLED_POSTS = false;

export function usePosts(params: PostsListParams = {}) {
  return useQuery<PaginatedResponse<Post>, Error>({
    queryKey: ["community", "posts", params],
    queryFn: async () => {
      if (MOCK_ENABLED_POSTS) {
        let items = [...mockPosts];
        if (params.groupId) items = items.filter((p) => p.groupId === params.groupId);
        if (params.status) items = items.filter((p) => p.status === params.status);
        if (params.pinned !== undefined) items = items.filter((p) => p.pinned === params.pinned);
        if (params.featured !== undefined) items = items.filter((p) => p.featured === params.featured);
        if (params.search) {
          const q = params.search.toLowerCase();
          items = items.filter((p) => p.title.toLowerCase().includes(q) || p.authorName.toLowerCase().includes(q));
        }
        const page = params.page ?? 1;
        const pageSize = params.pageSize ?? 10;
        const start = (page - 1) * pageSize;
        return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
      }
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

const MOCK_ENABLED_GROUPS = false;

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
      if (MOCK_ENABLED_GROUPS) {
        let items = [...mockGroups];
        if (params.status) items = items.filter((g) => g.status === params.status);
        if (params.search) {
          const q = params.search.toLowerCase();
          items = items.filter((g) => g.name.toLowerCase().includes(q));
        }
        const page = params.page ?? 1;
        const pageSize = params.pageSize ?? 10;
        const start = (page - 1) * pageSize;
        return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
      }
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
      if (MOCK_ENABLED_GROUPS) {
        if (!id) throw new Error("Missing group id");
        return getGroupDetail(id);
      }
      const data = await graphqlRequest<{ adminGroup: { id: string; name: string; slug?: string; status: string; memberCount: number; createdAt?: string } }>(ADMIN_GROUP_QUERY, { id });
      const item = data.adminGroup;
      return {
        id: item.id,
        name: item.name,
        description: "",
        ownerId: "",
        ownerName: "",
        memberCount: item.memberCount,
        status: item.status as GroupDetail["status"],
        members: [],
        posts: [],
        ctvAssignments: [],
      };
    },
    enabled: !!id,
  });
}

export function useTransferGroupOwner() {
  const qc = useQueryClient();
  return useMutation<GroupDetail, Error, { id: string; newOwnerId: string; reason: string }>({
    mutationFn: async ({ id, newOwnerId, reason }) => {
      // MOCK: replace with apiClient.post(`/community/groups/${id}/transfer-owner`, { newOwnerId, reason }) when BE ready
      void apiClient;
      void reason;
      const detail = getGroupDetail(id);
      const newOwner = detail.members.find((m) => m.userId === newOwnerId);
      detail.ownerId = newOwnerId;
      detail.ownerName = newOwner?.userName ?? newOwnerId;
      return detail;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["community", "groups", id] });
      qc.invalidateQueries({ queryKey: ["community", "groups"] });
    },
  });
}

export function useToggleGroupLock() {
  const qc = useQueryClient();
  return useMutation<GroupDetail, Error, { id: string; lock: boolean; reason?: string }>({
    mutationFn: async ({ id, lock, reason }) => {
      // MOCK: replace with apiClient.post(`/community/groups/${id}/lock`, { reason }) or `/unlock` when BE ready
      void apiClient;
      const detail = getGroupDetail(id);
      detail.status = lock ? "locked" : "active";
      detail.lockedReason = lock ? reason : undefined;
      const group = mockGroups.find((g) => g.id === id);
      if (group) {
        group.status = detail.status;
        group.lockedReason = detail.lockedReason;
      }
      return detail;
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
    mutationFn: async ({ id, userId, userName, permissions }) => {
      // MOCK: replace with apiClient.post(`/community/groups/${id}/ctv-assignments`, { userId, permissions }) when BE ready
      void apiClient;
      const detail = getGroupDetail(id);
      const assignment: CtvAssignment = {
        id: `ctv-${Date.now()}`,
        userId,
        userName,
        permissions,
        assignedAt: new Date().toISOString(),
      };
      detail.ctvAssignments.push(assignment);
      return assignment;
    },
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ["community", "groups", id] }),
  });
}

export function useRevokeCtv() {
  const qc = useQueryClient();
  return useMutation<string, Error, { id: string; assignmentId: string }>({
    mutationFn: async ({ id, assignmentId }) => {
      // MOCK: replace with apiClient.delete(`/community/groups/${id}/ctv-assignments/${assignmentId}`) when BE ready
      void apiClient;
      const detail = getGroupDetail(id);
      detail.ctvAssignments = detail.ctvAssignments.filter((a) => a.id !== assignmentId);
      return assignmentId;
    },
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ["community", "groups", id] }),
  });
}

export interface EventsListParams {
  status?: EventReviewStatus;
  groupId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

const MOCK_ENABLED_EVENTS = false;

export function useCommunityEvents(params: EventsListParams = {}) {
  return useQuery<PaginatedResponse<CommunityEvent>, Error>({
    queryKey: ["community", "events", params],
    queryFn: async () => {
      if (MOCK_ENABLED_EVENTS) {
        let items = [...mockEvents];
        if (params.status) items = items.filter((e) => e.status === params.status);
        if (params.groupId) items = items.filter((e) => e.groupId === params.groupId);
        if (params.search) {
          const q = params.search.toLowerCase();
          items = items.filter((e) => e.title.toLowerCase().includes(q));
        }
        const page = params.page ?? 1;
        const pageSize = params.pageSize ?? 10;
        const start = (page - 1) * pageSize;
        return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
      }
      return graphqlRequest<{
        adminEvents: {
          items: Array<{
            id: string;
            type: string;
            title: string;
            slug?: string;
            status: string;
            startAt?: string;
            endAt?: string;
          }>;
          total: number;
          page: number;
          size: number;
        };
      }>(ADMIN_EVENTS_QUERY, {
        filter: {
          ...(params.search ? { q: params.search } : {}),
          ...(params.status ? { status: params.status } : {}),
        },
        page: { page: Math.max(0, (params.page ?? 1) - 1), size: params.pageSize ?? 10 },
      }).then((r) => ({
        items: r.adminEvents.items.map((item) => ({
          id: item.id,
          title: item.title,
          description: undefined,
          groupId: "",
          groupName: "",
          organizerName: "",
          location: undefined,
          onlineLink: undefined,
          startAt: item.startAt ?? "",
          endAt: item.endAt,
          status: item.status as CommunityEvent["status"],
          reviewHistory: [],
        })),
        total: r.adminEvents.total,
        page: (r.adminEvents.page ?? 0) + 1,
        pageSize: r.adminEvents.size,
      }));
    },
  });
}

export function useReviewEvent() {
  const qc = useQueryClient();
  return useMutation<CommunityEvent, Error, { id: string; decision: "approve" | "reject"; reason?: string }>({
    mutationFn: async ({ id, decision, reason }) => {
      // MOCK: replace with apiClient.post(`/community/events/${id}/review`, { decision, reason }) when BE ready
      void apiClient;
      const event = mockEvents.find((e) => e.id === id);
      if (!event) throw new Error("Event not found");
      if (event.status !== "pending") throw new Error("409: Event already reviewed");
      event.status = decision === "approve" ? "approved" : "rejected";
      event.reviewHistory.push({ decision, reason, actorName: "Current User", occurredAt: new Date().toISOString() });
      return event;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", "events"] }),
  });
}
