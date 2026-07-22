# Tasks — admin-gamification-console

## 1. API module
- [ ] 1.1 `src/features/gamification/api/gamification.keys.ts` + `gamification.api.ts`: types (Quest, XpRule, RewardPool, RewardItem, Season + request bodies) + hooks TanStack Query cho toàn bộ endpoint `/api/v1/gamification/admin/**` (design §1), lỗi qua `handleAdminMutationError`
- [x] 1.2 Quality loop tính năng API module: unit test + e2e test (parse envelope, invalidate keys sau mutation, map GAMIFICATION_INVALID_CONFIG) → đánh giá vòng 1 → fix → đánh giá vòng 2 — unit PASS 2026-07-22 (`gamification.api.test.tsx` + `errors.test.ts`); e2e apitest còn nợ

## 2. QuestsPage
- [ ] 2.1 Table quest (kể cả inactive): cột code/title/trigger/rewardCoin/targetCount/dailyLimit/sortOrder/active
- [ ] 2.2 Inline edit InputNumber (rewardCoin/targetCount/dailyLimit) → upsert full record; warning vàng khi rewardCoin ngoài 50–100
- [ ] 2.3 Switch active + Modal.confirm khi tắt quest đang active; `QuestFormModal` tạo/sửa đủ field (conditionJson validate JSON parse)
- [x] 2.4 Quality loop tính năng QuestsPage: unit test + e2e test (inline edit gửi record đầy đủ, confirm chặn tắt nhầm, lỗi BE hiện notification) → đánh giá vòng 1 → fix → đánh giá vòng 2 — unit PASS 2026-07-22 (`QuestsPage.test.ts` + `gamification.api.test.tsx`; LƯU Ý: impl đã đổi sang PATCH bán phần theo BE `QuestPatchRequest` để tránh clobber — test khẳng định body CHỈ chứa field đổi, upsert full record vẫn test cho QuestFormModal); e2e còn nợ

## 3. XpRulesPage
- [ ] 3.1 Table xp_rules + Switch active + modal upsert (wire `GET/POST /xp-rules` sẵn có; không delete)
- [ ] 3.2 Quality loop tính năng XpRulesPage: unit test + e2e test (upsert rule community hiển thị giá trị mới) → đánh giá vòng 1 → fix → đánh giá vòng 2

## 4. RewardPoolsPage + SeasonsPage
- [ ] 4.1 RewardPoolsPage: table pools + modal upsert + drawer items (add/delete-confirm) + nút validate probability
- [ ] 4.2 SeasonsPage: table + modal tạo (code + RangePicker) + action đóng season confirm (ẩn khi CLOSED), empty-state env mới
- [x] 4.3 Quality loop tính năng pools/seasons: unit test + e2e test (validate DAILY_BOX pass, đóng season gọi đúng endpoint, empty-state) → đánh giá vòng 1 → fix → đánh giá vòng 2 — unit PASS 2026-07-22 (`RewardPoolItemsDrawer.test.ts` tổng probability khớp epsilon BE + `SeasonsPage.test.ts` + `gamification.api.test.tsx` close/validate endpoint); e2e (DAILY_BOX seed thật) còn nợ

## 5. Route & permission
- [ ] 5.1 `routeRegistry.tsx`: 4 route group "Gamification" (TrophyOutlined), `requiredPermissions: ["gamification.admin.manage"]`
- [x] 5.2 Quality loop tính năng route/permission: unit test + e2e test (acc thiếu quyền: nav ẩn + 403; acc ADMIN thấy đủ 4 trang) → đánh giá vòng 1 → fix → đánh giá vòng 2 — unit PASS 2026-07-22 (`NavMenu.test.tsx`: 4 route guard đúng leaf + nav ẩn/hiện theo quyền); e2e 2 acc thật còn nợ

## 6. Verify tổng
- [ ] 6.1 `npm run build` xanh + `tsc --noEmit` sạch
- [ ] 6.2 Smoke apitest acc ADMIN: sửa xu/limit quest → FE learner `/quests` phản ánh sau revalidate
- [ ] 6.3 `openspec validate admin-gamification-console --strict` sạch
