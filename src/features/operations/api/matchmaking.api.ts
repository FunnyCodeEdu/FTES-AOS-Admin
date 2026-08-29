import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../shared/api/client";
import { handleAdminMutationError } from "../../../shared/api/errors";

/**
 * API ban tổ chức của chương trình ghép đôi ("Ghép đôi sinh viên FU").
 *
 * <p>Tách khỏi `events.api.ts` vì nó chỉ phục vụ MỘT loại sự kiện: gộp vào file 700 dòng đang lo
 * cho mọi sự kiện là bắt người đọc file đó mang theo một mô hình họ không dùng tới.
 *
 * <p>Mọi endpoint gác bằng `event.manage` theo đúng sự kiện (scope EVENT) ở backend.
 */

/** Hồ sơ người chơi kèm liên lạc — bản CHỈ ban tổ chức đọc được. */
export interface MatchmakingAdminProfile {
  userId: string;
  displayName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  seeking: "MALE" | "FEMALE" | "ANY";
  campus?: string | null;
  birthYear?: number | null;
  photoUrl: string;
  intro?: string | null;
  interests?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  createdAt?: string;
}

/** Một người trong phòng. */
export interface MatchmakingRoomMember {
  userId: string;
  role: "HOST" | "GUEST";
  eliminated: boolean;
  profile: {
    userId: string;
    displayName: string;
    gender: string;
    photoUrl: string;
    campus?: string | null;
    intro?: string | null;
  } | null;
}

/** Một phòng ghép. `meetingUrl` là link RIÊNG của phòng, KHÔNG phải link phát cho khán giả. */
export interface MatchmakingRoom {
  id: string;
  code: string;
  scheduledAt?: string | null;
  meetingUrl?: string | null;
  status: "DRAFT" | "SCHEDULED" | "LIVE" | "DONE" | "CANCELLED";
  /** Lần gửi thư mời gần nhất; `null` = chưa gửi (đừng dội thư hai lần vào hộp người chơi). */
  invitedAt?: string | null;
  members: MatchmakingRoomMember[];
}

/**
 * Kết quả một phòng.
 *
 * `matched` = cả hai đồng ý. `complete` = cả hai đã trả lời — phân biệt hai cờ này vì "chưa ai trả
 * lời" và "một người từ chối" đều cho `matched=false` mà phần quà của hai ca đó khác nhau.
 */
export interface MatchmakingRoomResult {
  roomId: string;
  code: string;
  finalists: Array<{ userId: string; displayName: string; photoUrl: string }>;
  matched: boolean;
  complete: boolean;
}

const keys = {
  profiles: (eventId: string) => ["ops", "events", eventId, "mm", "profiles"] as const,
  unassigned: (eventId: string) => ["ops", "events", eventId, "mm", "unassigned"] as const,
  rooms: (eventId: string) => ["ops", "events", eventId, "mm", "rooms"] as const,
  results: (eventId: string) => ["ops", "events", eventId, "mm", "results"] as const,
};

/** Mọi khoá của một sự kiện — dựng phòng đụng cả bốn danh sách, nên làm mới cả bốn. */
function invalidateAll(qc: ReturnType<typeof useQueryClient>, eventId: string) {
  qc.invalidateQueries({ queryKey: ["ops", "events", eventId, "mm"] });
}

const base = (eventId: string) => `/event/admin/events/${eventId}/matchmaking`;

export function useMatchmakingProfiles(eventId: string | undefined) {
  return useQuery<MatchmakingAdminProfile[], Error>({
    queryKey: keys.profiles(eventId ?? ""),
    queryFn: async () => (await coreClient.get(`${base(eventId!)}/profiles`)).data ?? [],
    enabled: !!eventId,
  });
}

export function useMatchmakingUnassigned(eventId: string | undefined) {
  return useQuery<MatchmakingAdminProfile[], Error>({
    queryKey: keys.unassigned(eventId ?? ""),
    queryFn: async () => (await coreClient.get(`${base(eventId!)}/profiles/unassigned`)).data ?? [],
    enabled: !!eventId,
  });
}

export function useMatchmakingRooms(eventId: string | undefined) {
  return useQuery<MatchmakingRoom[], Error>({
    queryKey: keys.rooms(eventId ?? ""),
    queryFn: async () => (await coreClient.get(`${base(eventId!)}/rooms`)).data ?? [],
    enabled: !!eventId,
  });
}

export function useMatchmakingResults(eventId: string | undefined) {
  return useQuery<MatchmakingRoomResult[], Error>({
    queryKey: keys.results(eventId ?? ""),
    queryFn: async () => (await coreClient.get(`${base(eventId!)}/results`)).data ?? [],
    enabled: !!eventId,
  });
}

/**
 * Dựng phòng tự động từ những người CHƯA được xếp.
 *
 * Bấm lại được: backend chỉ đụng người chưa xếp, nên lần hai (sau khi có thêm đăng ký) là dựng
 * tiếp chứ không phá phòng đã có.
 */
export function useAutoBuildRooms() {
  const qc = useQueryClient();
  return useMutation<MatchmakingRoom[], Error, { eventId: string; guestsPerRoom?: number }>({
    mutationFn: async ({ eventId, guestsPerRoom }) =>
      (await coreClient.post(`${base(eventId)}/rooms/auto-build`, { guestsPerRoom })).data ?? [],
    onSuccess: (_, { eventId }) => invalidateAll(qc, eventId),
    onError: handleAdminMutationError,
  });
}

export function useCreateMatchmakingRoom() {
  const qc = useQueryClient();
  return useMutation<MatchmakingRoom, Error, { eventId: string; code?: string }>({
    mutationFn: async ({ eventId, code }) =>
      (await coreClient.post(`${base(eventId)}/rooms`, { code })).data,
    onSuccess: (_, { eventId }) => invalidateAll(qc, eventId),
    onError: handleAdminMutationError,
  });
}

/** Đặt giờ + link riêng. Đủ cả hai thì backend chuyển phòng sang SCHEDULED (điều kiện gửi thư). */
export function useScheduleMatchmakingRoom() {
  const qc = useQueryClient();
  return useMutation<
    MatchmakingRoom,
    Error,
    { eventId: string; roomId: string; scheduledAt?: string | null; meetingUrl?: string | null }
  >({
    mutationFn: async ({ eventId, roomId, scheduledAt, meetingUrl }) =>
      (await coreClient.put(`${base(eventId)}/rooms/${roomId}/schedule`, { scheduledAt, meetingUrl }))
        .data,
    onSuccess: (_, { eventId }) => invalidateAll(qc, eventId),
    onError: handleAdminMutationError,
  });
}

export function useAddMatchmakingMember() {
  const qc = useQueryClient();
  return useMutation<
    MatchmakingRoom,
    Error,
    { eventId: string; roomId: string; userId: string; role: "HOST" | "GUEST" }
  >({
    mutationFn: async ({ eventId, roomId, userId, role }) =>
      (await coreClient.post(`${base(eventId)}/rooms/${roomId}/members`, { userId, role })).data,
    onSuccess: (_, { eventId }) => invalidateAll(qc, eventId),
    onError: handleAdminMutationError,
  });
}

export function useRemoveMatchmakingMember() {
  const qc = useQueryClient();
  return useMutation<MatchmakingRoom, Error, { eventId: string; roomId: string; userId: string }>({
    mutationFn: async ({ eventId, roomId, userId }) =>
      (await coreClient.delete(`${base(eventId)}/rooms/${roomId}/members/${userId}`)).data,
    onSuccess: (_, { eventId }) => invalidateAll(qc, eventId),
    onError: handleAdminMutationError,
  });
}

/** Gửi thư mời (in-app + email) cho cả phòng. Backend từ chối nếu phòng chưa có giờ hoặc link. */
export function useInviteMatchmakingRoom() {
  const qc = useQueryClient();
  return useMutation<MatchmakingRoom, Error, { eventId: string; roomId: string }>({
    mutationFn: async ({ eventId, roomId }) =>
      (await coreClient.post(`${base(eventId)}/rooms/${roomId}/invite`)).data,
    onSuccess: (_, { eventId }) => invalidateAll(qc, eventId),
    onError: handleAdminMutationError,
  });
}

/** Loại một người chơi phụ (người dẫn bấm trên sóng thay cho người chơi chính). */
export function useEliminateMatchmakingMember() {
  const qc = useQueryClient();
  return useMutation<MatchmakingRoom, Error, { eventId: string; roomId: string; userId: string }>({
    mutationFn: async ({ eventId, roomId, userId }) =>
      (await coreClient.post(`${base(eventId)}/rooms/${roomId}/eliminate/${userId}`)).data,
    onSuccess: (_, { eventId }) => invalidateAll(qc, eventId),
    onError: handleAdminMutationError,
  });
}
