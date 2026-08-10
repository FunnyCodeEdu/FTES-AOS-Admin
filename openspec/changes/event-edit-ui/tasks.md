# Tasks — event-edit-ui

## 1. Mutation sửa sự kiện (`features/operations/api/events.api.ts`)

- [x] 1.1 `UpdateEventInput = { id, next: CreateEventInput, previous: CreateEventInput }` — `previous`
  là mốc so sánh để loại field không đổi, không phải dữ liệu gửi lên.
- [x] 1.2 Hàm thuần `venueOf(values)` (online → `onlineLink`, offline → `location`) và
  `sameInstant(a, b)` (so `Date.parse`, không so chuỗi).
- [x] 1.3 `buildUpdateEventBody(next, previous)`: chỉ gán key khi giá trị thực sự đổi. `type` →
  `toUpperCase()`; `locationType` → `ONLINE`/`ONSITE` và **chỉ khi `mode` đổi**; `venue` theo
  `venueOf`; `description` đổi → gửi `?? ""` (chuỗi rỗng = xoá trắng, khác null = không đổi);
  `capacity` chỉ gửi khi đổi **và** không undefined.
- [x] 1.4 `useUpdateEvent()`: `coreClient.patch(\`/event/admin/events/${id}\`, body)`,
  invalidate `["ops","events",id]` + `["ops","events"]`, `onError: handleAdminMutationError`.
- [x] 1.5 `toUiEventType(raw)` đặt cạnh `toEventStatus`; dùng ở map của `useEvents` và `useEvent`
  thay cast `item.type as OfficialEvent["type"]`.

## 2. Wizard chạy cả chế độ sửa (`features/operations/components/EventWizardModal.tsx`)

- [x] 2.1 Export `EventWizardValues` (đúng khuôn `CreateEventInput`) và dùng cho `onSubmit`.
- [x] 2.2 Prop optional `initial?: EventWizardValues`; `isEdit = initial !== undefined`.
- [x] 2.3 `useEffect` nạp giá trị khi `open` chuyển sang true: có `initial` → `form.setFieldsValue`
  (startAt/endAt bọc `dayjs`), không có → `form.resetFields()`. Deps CHỈ `[open]` +
  `eslint-disable-next-line react-hooks/exhaustive-deps` kèm lý do.
- [x] 2.4 Tiêu đề/`okText` theo chế độ; `handleOk` chỉ `resetFields()` ở chế độ tạo.
- [x] 2.5 Ẩn khối certificate/reward khi `isEdit`.
- [x] 2.6 Export `toEventWizardValues(event: OfficialEvent): EventWizardValues`; `mode` của BE là
  `"hybrid"`/null thì coi như `"online"` (kèm comment vì sao HYBRID không bị hạ cấp).

## 3. Nút Sửa (`features/operations/pages/EventDetailPage.tsx`)

- [x] 3.1 `useUpdateEvent()` + `useState editOpen` + `useMemo editInitial` — useMemo PHẢI nằm trên
  mọi early return (cùng lý do đã ghi ở `estimatedCertCount`).
- [x] 3.2 `handleUpdate(values)` → `updateEvent.mutate({ id, next: values, previous: editInitial })`,
  success đóng modal + `message.success`.
- [x] 3.3 `editableStatus` = draft | pending_approval | published, viết tách khỏi `cancellableStatus`.
- [x] 3.4 Nút "Sửa" trong khối `<Can permissions={["event.manage"]}>` sẵn có.
- [x] 3.5 Render `<EventWizardModal initial={editInitial} …>` cạnh các modal khác.

## 4. Test (`features/operations/api/events.api.test.ts`)

- [x] 4.1 PATCH đúng `"/event/admin/events/e1"` qua `coreClient`, `apiClient` KHÔNG được gọi.
- [x] 4.2 `type` đổi → CHỮ HOA.
- [x] 4.3 offline → `locationType: "ONSITE"` + `venue` là địa điểm; và không trường nào mang `"OFFLINE"`.
- [x] 4.4 Không đổi gì → body rỗng; chỉ đổi tiêu đề → `Object.keys(body) === ["title"]`.
- [x] 4.5 Không dùng `null` để đánh dấu "không đổi".
- [x] 4.6 Cùng mốc thời gian khác định dạng chuỗi → không gửi; đổi giờ thật → gửi mốc mới.
- [x] 4.7 `useEvent` trả `type` chữ thường (điều kiện để prefill khớp option của Select).

Mutation check (làm trong đầu, xác nhận lại khi chạy được test):
`coreClient` → `apiClient` ⇒ 4.1 đỏ · bỏ `toUpperCase()` ⇒ 4.2 đỏ · `"ONSITE"` → `"OFFLINE"` ⇒ 4.3 đỏ ·
gửi cả body thay vì diff ⇒ 4.4 + 4.5 đỏ · so chuỗi thay vì so thời điểm ⇒ 4.6 đỏ · trả cast trần cho
`type` ⇒ 4.7 đỏ.

## 5. Verify (người chạy)

- [ ] 5.1 `npm run build` xanh. (`npx tsc --noEmit` ở repo này là **no-op** — tsconfig solution-style
  `"files": []` nên luôn exit 0, đừng dùng làm bằng chứng.)
- [ ] 5.2 `npx vitest run src/features/operations/api/events.api.test.ts` — 9 test mới xanh, 15 test cũ
  vẫn xanh.
- [ ] 5.3 `npx openspec validate event-edit-ui --strict` in "is valid".
- [ ] 5.4 `grep -rn "OFFLINE" src/features/operations/` → không kết quả.

## 6. Nghiệm thu thật (chờ BE có `PATCH /api/v1/event/admin/events/{id}`)

- [ ] 6.1 Sự kiện DRAFT → nút "Sửa" hiện; mở modal thấy đủ giá trị cũ (loại, tiêu đề, mô tả, hai mốc
  giờ, hình thức, link/địa điểm, sức chứa).
- [ ] 6.2 Chỉ sửa tiêu đề → Network: body PATCH **chỉ có** `title`, không kèm `type`/`locationType`.
- [ ] 6.3 Đổi hình thức sang Offline + nhập địa điểm → body có `locationType: "ONSITE"` + `venue`;
  DB `location_type = 'ONSITE'`.
- [ ] 6.4 Xoá trống "Time kết thúc" → form chặn, không có request nào đi.
- [ ] 6.5 Sự kiện ENDED / CANCELLED → **không** thấy nút "Sửa".
- [ ] 6.6 Sửa xong: trang chi tiết và danh sách hiện giá trị mới ngay (invalidate đúng key).
