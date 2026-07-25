# Design — admin-gamification-console

Vite + React 18 + AntD 5 + TanStack Query, feature-folder pattern như
`features/commerce/catalog`. Toàn bộ API là REST `/api/v1/gamification/admin/**` qua `apiClient`
(GraphQL read-gateway admin không có query gamification → đọc bằng REST GET của
`GamificationAdminController`, không mock).

## 1. API module — `src/features/gamification/api/`

`gamification.keys.ts`:

```ts
export const gamificationKeys = {
  all: ["admin", "gamification"] as const,
  quests: () => [...gamificationKeys.all, "quests"] as const,
  xpRules: () => [...gamificationKeys.all, "xp-rules"] as const,
  rewardPools: () => [...gamificationKeys.all, "reward-pools"] as const,
  rewardPoolItems: (poolId: string) => [...gamificationKeys.all, "reward-pools", poolId, "items"] as const,
  seasons: () => [...gamificationKeys.all, "seasons"] as const,
};
```

`gamification.api.ts` — types mirror BE (`QuestEntity`, `XpRuleEntity`, `RewardPoolEntity`,
`RewardItemEntity`, `SeasonEntity`, request records của `GamificationAdminController` +
`QuestUpsertRequest` của change BE) + hooks:

| Hook | Method/Path |
|---|---|
| `useQuests()` | `GET /gamification/admin/quests` |
| `useUpsertQuest()` | `POST /gamification/admin/quests` (invalidate `quests()`) |
| `useXpRules()` / `useUpsertXpRule()` | `GET/POST /gamification/admin/xp-rules` |
| `useRewardPools()` / `useUpsertRewardPool()` | `GET/POST /gamification/admin/reward-pools` |
| `useRewardPoolItems(poolId)` / `useAddRewardPoolItem()` / `useDeleteRewardPoolItem()` | items endpoints |
| `useValidateRewardPool()` | `GET /gamification/admin/reward-pools/{poolId}/validate` |
| `useSeasons()` / `useCreateSeason()` / `useCloseSeason()` | `GET/POST /gamification/admin/seasons`, `POST .../{id}/close` |

Mutation lỗi → `handleAdminMutationError` (map `GAMIFICATION_INVALID_CONFIG` →
notification message BE trả về; `ADMIN_ACCESS_DENIED`/403 → ForbiddenError chung).

Kiểu Quest (khớp BE):

```ts
export interface Quest {
  id: string; code: string; title: string; description: string | null;
  rewardCoin: number; targetCount: number; dailyLimit: number;
  triggerEventType: string; conditionJson: Record<string, unknown> | null;
  active: boolean; sortOrder: number;
}
```

## 2. Pages

### QuestsPage (`/gamification/quests`) — trọng tâm
- AntD `Table` (rowKey `code`), cột: code · title · trigger event · **rewardCoin** (editable) ·
  **targetCount** (editable) · **dailyLimit** (editable) · sortOrder · **active** (`Switch`).
- Inline edit: cell `InputNumber` (pattern editable-cell AntD) — blur/enter → `useUpsertQuest`
  với record đầy đủ (POST upsert theo code); optimistic off, chỉ invalidate.
- Toggle `active`: Switch → nếu TẮT quest đang active → `Modal.confirm` ("Người học sẽ ngừng
  nhận xu từ nhiệm vụ này từ bây giờ") rồi mới POST — mutation nguy hiểm có confirm.
- Cảnh báo kinh tế: rewardCoin nhập ngoài 50–100 → warning màu vàng cạnh cell (không chặn;
  BE chặn ngoài [1,1000]).
- Nút "Thêm nhiệm vụ" → `QuestFormModal` (form đủ field, trigger event type là input tự do +
  hint các type phổ biến; conditionJson là JSON textarea validate parse; cấm
  `gamification.quest.completed` — hiện lỗi BE trả về).

### XpRulesPage (`/gamification/xp-rules`)
- Table xp_rules (ruleKey · amount · dailyCap · reputationAmount · active Switch) + modal
  thêm/sửa (`useUpsertXpRule`). Không delete (BE không có) — chỉ active=false.

### RewardPoolsPage (`/gamification/reward-pools`)
- Table pools (code · type · costType · costAmount · active) + modal upsert; row expand/drawer
  items (`useRewardPoolItems`): list item + thêm (`useAddRewardPoolItem`) + xoá có confirm
  (`useDeleteRewardPoolItem`) + nút "Kiểm tra tổng xác suất" (`useValidateRewardPool`) hiện
  kết quả (BE lỗi nếu tổng ≠ 1.0).

### SeasonsPage (`/gamification/seasons`) — read tối thiểu
- Table seasons (code · startsAt · endsAt · status tag) + modal tạo season (code + RangePicker)
  + action "Đóng season" (chỉ hiện khi status ≠ CLOSED) với `Modal.confirm` ghi rõ
  PENDING_CLOSE → snapshot → CLOSED.

## 3. Route & permission — `src/app/routeRegistry.tsx`

```tsx
{ path: "/gamification/quests",       element: <QuestsPage />,      layout: "admin",
  requiredPermissions: ["gamification.admin.manage"],
  nav: { label: "Nhiệm vụ (Quest)", icon: <TrophyOutlined />, group: "Gamification" } },
{ path: "/gamification/xp-rules",     element: <XpRulesPage />,     layout: "admin",
  requiredPermissions: ["gamification.admin.manage"],
  nav: { label: "XP Rules", icon: <TrophyOutlined />, group: "Gamification" } },
{ path: "/gamification/reward-pools", element: <RewardPoolsPage />, layout: "admin",
  requiredPermissions: ["gamification.admin.manage"],
  nav: { label: "Reward Pools", icon: <TrophyOutlined />, group: "Gamification" } },
{ path: "/gamification/seasons",      element: <SeasonsPage />,     layout: "admin",
  requiredPermissions: ["gamification.admin.manage"],
  nav: { label: "Seasons", icon: <TrophyOutlined />, group: "Gamification" } },
```

Permission `gamification.admin.manage` đã seed BE (V67, gán ADMIN/SUPER_ADMIN) và về client qua
`useMe` — KHÔNG hardcode role. Admin mảng khác thiếu quyền → nav ẩn + route 403 (PermissionRoute
sẵn có).

## 4. Seed data

Admin console không có DB riêng — dữ liệu test đến từ seed BE:
- Change BE `gamification-quest-coin-engine` V213: 6 quest mẫu (kinh tế 50–100 xu) + xp_rules
  community đúng key + REWARDS_POOL 1.000.000 coin — QuestsPage/XpRulesPage có data ngay sau
  migrate.
- Seed BE V66: reward pool `DAILY_BOX` + 4 items (tổng probability 1.0) — RewardPoolsPage có
  data validate PASS ngay.
- Seasons: có thể rỗng trên env mới — SeasonsPage phải render empty-state và tạo được season
  đầu tiên từ UI (không cần seed).
- Acc test: dùng bộ acc 4 role sẵn có trên apitest; chỉ acc role ADMIN/SUPER_ADMIN thấy group
  Gamification.

## 5. Verify

`npm run build` xanh + `tsc --noEmit` sạch; smoke: login ADMIN → 4 trang render data seed;
toggle quest + sửa xu/limit phản ánh ngay ở FE learner (`/quests`); acc thiếu quyền → 403.
