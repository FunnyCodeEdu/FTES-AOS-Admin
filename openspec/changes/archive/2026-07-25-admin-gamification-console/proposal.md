# admin-gamification-console — Khu quản trị Gamification (quests, xp-rules, reward pools, seasons)

## Why

Admin CMS hiện **chưa có khu gamification** nào, trong khi backend đã có đủ API quản trị dưới
quyền `gamification.admin.manage`: CRUD xp-rules / seasons / reward-pools (change `gamification`
BE, sẵn từ lâu) và — mới từ BE change `gamification-quest-coin-engine` — CRUD **quests** (nhiệm
vụ hằng ngày cấp FTES Coin). Yêu cầu sản phẩm: admin phải bật/tắt nhiệm vụ, chỉnh số xu
(reward_coin 50–100) và chỉnh daily limit ngay trên console; đồng thời có chỗ xem/chỉnh xp-rules
(vừa fix rule-key community), xem reward pools + seasons tối thiểu.

## What Changes

- **Feature mới `src/features/gamification/`** theo đúng cấu trúc feature hiện có
  (`api/*.api.ts` + `api/*.keys.ts` + `pages/*`):
  - **QuestsPage** (`/gamification/quests`): bảng tất cả quest (kể cả inactive) — toggle
    `active` (Switch inline), sửa `rewardCoin`/`dailyLimit`/`targetCount` inline, sửa đầy đủ qua
    modal; upsert qua `POST /api/v1/gamification/admin/quests`.
  - **XpRulesPage** (`/gamification/xp-rules`): bảng xp_rules — CRUD wire endpoint sẵn có
    `GET/POST /api/v1/gamification/admin/xp-rules` (amount, dailyCap, reputationAmount, active).
  - **RewardPoolsPage** (`/gamification/reward-pools`): list pool + drawer items + validate
    probability (`GET .../reward-pools`, `POST .../reward-pools`, items, validate).
  - **SeasonsPage** (`/gamification/seasons`): read tối thiểu (list + tạo season + nút đóng
    season có confirm).
- **routeRegistry**: 4 route mới group `"Gamification"` (icon `TrophyOutlined`), tất cả
  `requiredPermissions: ["gamification.admin.manage"]` — nav ẩn tự động với admin thiếu quyền
  (permission-driven, không role check).
- Mutation nguy hiểm (tắt quest đang chạy, đóng season) → confirm modal theo chuẩn repo.

## Capabilities

### New Capabilities
- `gamification-console`: các trang quản trị quest/xp-rule/reward-pool/season với quyền
  `gamification.admin.manage`.

## Impact

- Files mới: `src/features/gamification/api/gamification.api.ts`, `api/gamification.keys.ts`,
  `pages/QuestsPage.tsx`, `pages/XpRulesPage.tsx`, `pages/RewardPoolsPage.tsx`,
  `pages/SeasonsPage.tsx`, components modal/drawer kèm theo; sửa `src/app/routeRegistry.tsx`.
- API: REST `/api/v1/gamification/admin/**` qua `apiClient` (envelope `{code,message,data}`) —
  đọc CŨNG bằng REST GET vì gateway GraphQL admin chưa có query gamification (ghi chú trong
  design; nhất quán với các admin-controller REST-read khác).
- Không dependency mới; `npm run build` + `tsc --noEmit` phải xanh.
- Phụ thuộc BE change `gamification-quest-coin-engine` cho phần quests (xp-rules/seasons/pools
  dùng endpoint đã deploy).
