import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../shared/api/client";
import { handleAdminMutationError } from "../../../shared/api/errors";
import { gamificationKeys } from "./gamification.keys";

// ---------------------------------------------------------------------------
// Types — mirror BE entities/records của GamificationAdminController + change
// `gamification-quest-coin-engine`. Toàn bộ endpoint nằm ở /api/v1/gamification/admin/**
// (KHÔNG dưới /admin) → dùng `coreClient` (base /api/v1), giống các module commerce
// wire /commerce/admin/** ; apiClient (base /api/v1/admin) sẽ 404.
// Envelope {code,message,data} đã được interceptor unwrap → res.data là payload thật.
// ---------------------------------------------------------------------------

/**
 * QuestEntity (BE). `conditionJson` là cột jsonb map sang String ở BE nên trên dây là **chuỗi JSON
 * thô** (vd `"{\"minDays\":3}"`), KHÔNG phải object — QuestUpsertRequest.conditionJson cũng là String.
 * FE giữ nguyên chuỗi; QuestFormModal validate JSON.parse trước khi gửi. (Design §1 phác `Record` chỉ
 * là ý niệm; nguồn sự thật là kiểu String của BE.)
 */
export interface Quest {
  id: string;
  code: string;
  title: string;
  description: string | null;
  rewardCoin: number;
  targetCount: number;
  dailyLimit: number;
  triggerEventType: string;
  conditionJson: string | null;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Body POST /quests (BE `QuestRequest`) — upsert theo `code`, gửi record đầy đủ. */
export interface QuestUpsertRequest {
  code: string;
  title: string;
  description?: string | null;
  rewardCoin: number;
  targetCount: number;
  dailyLimit: number;
  triggerEventType: string;
  conditionJson?: string | null;
  active: boolean;
  sortOrder: number;
}

/**
 * Body PATCH /quests/{code} (BE `QuestPatchRequest`) — CHỈ field khác `undefined` được áp (bán phần).
 * BE dựng riêng cho thao tác nhanh của console: toggle `active`, sửa `rewardCoin`/`dailyLimit`/
 * `targetCount` inline mà KHÔNG phải gửi lại toàn bộ record → tránh clobber (last-writer-wins cả bản
 * ghi) khi 2 admin sửa song song. `code` nằm ở path, KHÔNG trong body. Lưu ý bất đối xứng của BE:
 * `conditionJson=null` ở PATCH = GIỮ NGUYÊN điều kiện — muốn XOÁ điều kiện phải dùng POST upsert với
 * `conditionJson=null` tường minh. PATCH KHÔNG tạo mới (404 nếu code chưa tồn tại, khác POST).
 */
export interface QuestPatchRequest {
  title?: string;
  description?: string | null;
  rewardCoin?: number;
  targetCount?: number;
  dailyLimit?: number;
  triggerEventType?: string;
  conditionJson?: string | null;
  active?: boolean;
  sortOrder?: number;
}

/** XpRuleEntity (BE). `dailyCap` nullable (không giới hạn ngày). */
export interface XpRule {
  ruleKey: string;
  amount: number;
  dailyCap: number | null;
  reputationAmount: number;
  active: boolean;
}

/** Body POST /xp-rules (BE `XpRuleRequest`) — upsert theo `ruleKey`. */
export interface XpRuleUpsertRequest {
  ruleKey: string;
  amount: number;
  dailyCap?: number | null;
  reputationAmount: number;
  active: boolean;
}

/** RewardPoolEntity (BE). */
export interface RewardPool {
  id: string;
  code: string;
  type: string;
  costType: string;
  costAmount: number;
  active: boolean;
}

/** Body POST /reward-pools (BE `RewardPoolRequest`) — upsert theo `code`. */
export interface RewardPoolUpsertRequest {
  code: string;
  type: string;
  costType: string;
  costAmount: number;
  active: boolean;
}

/**
 * RewardItemEntity (BE). `probability` là BigDecimal → Jackson serialize thành số (vd 0.25).
 * `badgeId`/`stock` nullable.
 */
export interface RewardItem {
  id: string;
  poolId: string;
  rewardType: string;
  amount: number;
  badgeId: string | null;
  probability: number;
  stock: number | null;
}

/** Body POST /reward-pools/{poolId}/items (BE `RewardItemRequest`). */
export interface RewardItemRequest {
  rewardType: string;
  amount: number;
  badgeId?: string | null;
  probability: number;
  stock?: number | null;
}

/** SeasonEntity (BE). `status`: DRAFT | RUNNING | PENDING_CLOSE | CLOSED. `startsAt`/`endsAt` ISO. */
export interface Season {
  id: string;
  code: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

/** Body POST /seasons (BE `SeasonRequest`) — `startsAt`/`endsAt` là Instant → gửi ISO-8601. */
export interface SeasonCreateRequest {
  code: string;
  startsAt: string;
  endsAt: string;
}

// ---------------------------------------------------------------------------
// Quests — GET list (kể cả inactive, sort theo sortOrder) + POST upsert theo code.
// ---------------------------------------------------------------------------

export function useQuests() {
  return useQuery<Quest[], Error>({
    queryKey: gamificationKeys.quests(),
    queryFn: async () => {
      const res = await coreClient.get("/gamification/admin/quests");
      return res.data as Quest[];
    },
  });
}

export function useUpsertQuest() {
  const qc = useQueryClient();
  return useMutation<Quest, Error, QuestUpsertRequest>({
    mutationFn: async (body) => {
      const res = await coreClient.post("/gamification/admin/quests", body);
      return res.data as Quest;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: gamificationKeys.quests() }),
    onError: handleAdminMutationError,
  });
}

/**
 * PATCH bán phần theo `code` — chỉ gửi field cần đổi (toggle active, sửa xu/limit inline). `code` đi
 * ở path (encode để an toàn với ký tự lạ), phần còn lại là body. Invalidate `quests()` như upsert.
 */
export function usePatchQuest() {
  const qc = useQueryClient();
  return useMutation<Quest, Error, { code: string; patch: QuestPatchRequest }>({
    mutationFn: async ({ code, patch }) => {
      const res = await coreClient.patch(
        `/gamification/admin/quests/${encodeURIComponent(code)}`,
        patch
      );
      return res.data as Quest;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: gamificationKeys.quests() }),
    onError: handleAdminMutationError,
  });
}

// ---------------------------------------------------------------------------
// XP rules — GET list + POST upsert theo ruleKey (không delete; retire = active:false).
// ---------------------------------------------------------------------------

export function useXpRules() {
  return useQuery<XpRule[], Error>({
    queryKey: gamificationKeys.xpRules(),
    queryFn: async () => {
      const res = await coreClient.get("/gamification/admin/xp-rules");
      return res.data as XpRule[];
    },
  });
}

export function useUpsertXpRule() {
  const qc = useQueryClient();
  return useMutation<XpRule, Error, XpRuleUpsertRequest>({
    mutationFn: async (body) => {
      const res = await coreClient.post("/gamification/admin/xp-rules", body);
      return res.data as XpRule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: gamificationKeys.xpRules() }),
    onError: handleAdminMutationError,
  });
}

// ---------------------------------------------------------------------------
// Reward pools — GET list + POST upsert theo code; items list/add/delete;
// validate tổng probability = 1.0 (±0.001).
// ---------------------------------------------------------------------------

export function useRewardPools() {
  return useQuery<RewardPool[], Error>({
    queryKey: gamificationKeys.rewardPools(),
    queryFn: async () => {
      const res = await coreClient.get("/gamification/admin/reward-pools");
      return res.data as RewardPool[];
    },
  });
}

export function useUpsertRewardPool() {
  const qc = useQueryClient();
  return useMutation<RewardPool, Error, RewardPoolUpsertRequest>({
    mutationFn: async (body) => {
      const res = await coreClient.post("/gamification/admin/reward-pools", body);
      return res.data as RewardPool;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: gamificationKeys.rewardPools() }),
    onError: handleAdminMutationError,
  });
}

export function useRewardPoolItems(poolId: string | undefined) {
  return useQuery<RewardItem[], Error>({
    queryKey: gamificationKeys.rewardPoolItems(poolId ?? ""),
    queryFn: async () => {
      const res = await coreClient.get(`/gamification/admin/reward-pools/${poolId}/items`);
      return res.data as RewardItem[];
    },
    enabled: !!poolId,
  });
}

export function useAddRewardPoolItem(poolId: string) {
  const qc = useQueryClient();
  return useMutation<RewardItem, Error, RewardItemRequest>({
    mutationFn: async (body) => {
      // BE saveAndFlush rồi validate tổng probability — tổng ≠ 1.0 ⇒ rollback +
      // GAMIFICATION_INVALID_CONFIG (message BE hiện qua handleAdminMutationError).
      const res = await coreClient.post(
        `/gamification/admin/reward-pools/${poolId}/items`,
        body
      );
      return res.data as RewardItem;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: gamificationKeys.rewardPoolItems(poolId) }),
    onError: handleAdminMutationError,
  });
}

export function useDeleteRewardPoolItem(poolId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (itemId) => {
      // BE: DELETE /reward-pools/items/{itemId} — xoá theo itemId (không nested theo poolId).
      await coreClient.delete(`/gamification/admin/reward-pools/items/${itemId}`);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: gamificationKeys.rewardPoolItems(poolId) }),
    onError: handleAdminMutationError,
  });
}

/**
 * Kiểm tra tổng probability của pool = 1.0. BE trả `true` khi hợp lệ, hoặc ném
 * GAMIFICATION_INVALID_CONFIG (400) khi tổng ≠ 1.0 → mô hình hoá bằng mutation để trang gọi theo
 * yêu cầu và bắt lỗi qua onError. Không invalidate cache (chỉ đọc-kiểm tra).
 */
export function useValidateRewardPool() {
  return useMutation<boolean, Error, string>({
    mutationFn: async (poolId) => {
      const res = await coreClient.get(
        `/gamification/admin/reward-pools/${poolId}/validate`
      );
      return res.data as boolean;
    },
    onError: handleAdminMutationError,
  });
}

// ---------------------------------------------------------------------------
// Seasons — GET list + POST create + POST {id}/close (đánh dấu PENDING_CLOSE).
// ---------------------------------------------------------------------------

export function useSeasons() {
  return useQuery<Season[], Error>({
    queryKey: gamificationKeys.seasons(),
    queryFn: async () => {
      const res = await coreClient.get("/gamification/admin/seasons");
      return res.data as Season[];
    },
  });
}

export function useCreateSeason() {
  const qc = useQueryClient();
  return useMutation<Season, Error, SeasonCreateRequest>({
    mutationFn: async (body) => {
      const res = await coreClient.post("/gamification/admin/seasons", body);
      return res.data as Season;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: gamificationKeys.seasons() }),
    onError: handleAdminMutationError,
  });
}

export function useCloseSeason() {
  const qc = useQueryClient();
  return useMutation<Season, Error, string>({
    mutationFn: async (id) => {
      // BE không set CLOSED trực tiếp: đánh dấu PENDING_CLOSE → scheduler snapshot → CLOSED.
      const res = await coreClient.post(`/gamification/admin/seasons/${id}/close`);
      return res.data as Season;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: gamificationKeys.seasons() }),
    onError: handleAdminMutationError,
  });
}
