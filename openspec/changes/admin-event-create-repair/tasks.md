# Tasks — admin-event-create-repair

## 1. Payload tạo sự kiện (`features/operations/api/events.api.ts`)

- [ ] 1.1 Thêm 2 hàm thuần đặt cạnh `slugify`/`stableSuffix`: `toBackendType(t: OfficialEventType)`
  → chữ HOA, và `toUiType(raw: string)` → chữ thường ép về `OfficialEventType`. Comment ngắn tiếng
  Việt nêu lý do (DB `CHECK` chữ HOA, BE không chuẩn hoá).
- [ ] 1.2 `useCreateEvent.mutationFn`: `type: toBackendType(input.type)` (thay `input.type` ở dòng
  ~268).
- [ ] 1.3 `useCreateEvent.mutationFn`: `locationType: input.mode === "online" ? "ONLINE" : "ONSITE"`
  (dòng ~275). Giữ nguyên comment quy ước `venue` phía dưới.
- [ ] 1.4 `useEvents`: filter gửi `type: toBackendType(params.type)`; map kết quả
  `type: toUiType(item.type)` thay `item.type as OfficialEvent["type"]`.
- [ ] 1.5 `useEvent`: map `type: toUiType(item.type)`.
- [ ] 1.6 Rà `grep -rn "OFFLINE" src/` — không còn chuỗi này trên đường ghi của module operations.

## 2. Form bắt buộc giờ kết thúc (`features/operations/components/EventWizardModal.tsx`)

- [ ] 2.1 `Form.Item name="endAt"` (dòng ~71): thêm `rules` gồm `{ required: true, message: "Vui lòng
  chọn time kết thúc" }` và một validator so `endAt` với `getFieldValue("startAt")` bằng
  `dayjs.isAfter` — sai thì reject với "Time kết thúc phải sau time bắt đầu".
- [ ] 2.2 Thêm `dependencies={["startAt"]}` cho `Form.Item` đó để đổi giờ bắt đầu thì ô kết thúc
  validate lại.
- [ ] 2.3 Kiểm tra `handleOk` không cần đổi: `values.endAt?.toISOString()` nay luôn có giá trị.

## 3. Xoá trang `/community/events`

- [ ] 3.1 Xoá file `src/features/community/pages/CommunityEventsPage.tsx`.
- [ ] 3.2 `src/app/routeRegistry.tsx`: xoá import `CommunityEventsPage` (dòng ~73) và entry route
  `/community/events` + nav "Events" (dòng ~449-455). Kiểm tra icon `TeamOutlined` vẫn còn dùng ở
  route `/community/groups` → **không** xoá import icon.
- [ ] 3.3 `src/features/community/api/community.api.ts`: xoá `ADMIN_EVENTS_QUERY`, `EventsListParams`,
  `MOCK_ENABLED_EVENTS`, `mockEvents`, `useCommunityEvents`, `useReviewEvent`; gỡ `CommunityEvent`
  và `EventReviewStatus` khỏi khối `import type`.
- [ ] 3.4 `src/features/community/shared/types.ts`: xoá `EventReviewStatus` và `CommunityEvent`
  (dòng ~142-157).
- [ ] 3.5 `grep -rn "CommunityEventsPage\|useCommunityEvents\|useReviewEvent\|EventReviewStatus\|CommunityEvent\b\|community.moderate" src/`
  → không còn kết quả nào (kể cả file test).

## 4. Verify

- [ ] 4.1 `npx tsc --noEmit` sạch — bắt được import mồ côi và biến chết sau khi xoá.
- [ ] 4.2 `npm run build` xanh.
- [ ] 4.3 `npx vitest run src/app/routeRegistry.test.tsx` xanh (test hiện chỉ assert nhóm route
  `/academic/packs`, nhưng chạy để chắc registry còn import được).
- [ ] 4.4 `npx openspec validate admin-event-create-repair --strict` in "is valid".
- [ ] 4.5 Lúc `/opsx:archive`: capability `community-events-moderation` bị gỡ hết requirement →
  nếu tooling từ chối spec rỗng, xoá luôn thư mục `openspec/specs/community-events-moderation/`
  thay vì để lại file không có requirement nào.

## 5. Nghiệm thu thật (sau khi deploy, cần BE `event-write-path-repair` cho phần onsite)

- [ ] 5.1 `/operations/events` → "Tạo event": Webinar + Online + link Meet + đủ 2 mốc giờ → `200`,
  sự kiện hiện trong bảng. Đối chiếu DB: `type = 'WEBINAR'`, `location_type = 'ONLINE'`,
  `venue` đúng link.
- [ ] 5.2 Tạo sự kiện Offline → DB `location_type = 'ONSITE'`. **Trang chi tiết còn hiện
  "Hình thức: —"** cho tới khi BE vá `AdminContentReadController` — kiểm chứng bằng DB/REST,
  đừng kết luận theo màn hình.
- [ ] 5.3 Bỏ trống "Time kết thúc" → form chặn, tab Network **không** có request nào đi.
- [ ] 5.4 Lọc "Loại" = Webinar → ra đúng sự kiện vừa tạo (trước đây luôn rỗng).
- [ ] 5.5 Vào thẳng `/community/events` → không còn trang events; nav "Cộng đồng" không còn mục
  "Events"; `/community/posts` và `/community/groups` vẫn vào được.
