# Tasks — event-status-contract

## 1. Chẩn đoán

- [x] 1.1 Đo trên trình duyệt: khối `<Can permissions={["event.manage"]}>` render rỗng, đếm button = 0.
- [x] 1.2 Loại giả thuyết RBAC: BE trả 200 cho POST create (gate cùng leaf) ⇒ allows() = true.
      Và trang chi tiết in `Trạng thái: DRAFT` — CHỮ HOA, ngay trong dữ liệu đã render.
- [x] 1.3 Xác định điểm lệch: `AdminContentReadController:280` hạ chữ thường `mode`, `:285` truyền
      `e.status()` nguyên văn — cùng một lời gọi constructor.
- [x] 1.4 Xác nhận cast `as` ở `events.api.ts` không sinh mã runtime.

## 2. Biên dịch status ở đúng biên

- [x] 2.1 `toEventStatus()` map 6 trạng thái BE; giá trị lạ → `draft` + `console.warn`.
- [x] 2.2 Dùng ở CẢ HAI chỗ map (list + detail), bỏ cast trần.
- [x] 2.3 `toBackendEnum()` cho filter status/type đi ngược lên CHỮ HOA.
- [x] 2.4 Union `OfficialEventStatus` khớp BE 1-1: bỏ `completed`, thêm `pending_approval`, `ended`.

## 3. Hành động admin đúng thực tế

- [x] 3.1 Bỏ nút "Start"/"Complete" (mã chết — `useTransitionEvent` chỉ ánh xạ submit/cancel).
- [x] 3.2 Đổi nhãn "Publish" → "Gửi duyệt" (endpoint là `/submit`, đích là PENDING_APPROVAL).
- [x] 3.3 Nút "Huỷ event" mirror guard BE: disable + tooltip khi `startAt` đã qua.
- [x] 3.4 Vá hook-order crash: `useMemo` phải nằm trên mọi early return.

## 4. Hạ tầng quyền + phiên

- [x] 4.1 `graphqlRequest` refresh 401 một lần rồi retry một lần (mutex dùng chung với axios).
- [x] 4.2 `Can`/`NavMenu`/`PermissionRoute` đọc cờ `superAdmin` từ `me`.
- [x] 4.3 `features/auth/api.ts` lấy thêm field `superAdmin` trong query `me`.

## 5. Test

- [x] 5.1 `toEventStatus` map đủ 6 trạng thái, không bao giờ sinh `completed`, cảnh báo khi lạ.
- [x] 5.2 `useEvents` hạ status BE về domain FE; filter upper-case trước khi gửi.
- [x] 5.3 `graphql.test.ts`: 401→200 refresh đúng 1 lần + retry mang token mới; 401 hai lần thì dừng
      (không lặp vô hạn); refresh hỏng → báo hết phiên; 200 thẳng thì không đụng refresh; nhánh 403 giữ nguyên.
      Mutation check: gỡ nhánh refresh ⇒ đúng 3 test đỏ.
- [x] 5.4 `Can.test.tsx`: superAdmin bypass; user thường vẫn gate theo leaf.
- [x] 5.5 GỠ test quét mã nguồn bằng `node:fs` — làm đỏ `tsc -b` vì project là cấu hình trình duyệt,
      không có type Node. Các test hành vi ở 5.1 đã phủ đúng hợp đồng.

## 6. Nghiệm thu

- [x] 6.1 `npm run build` xanh (KHÔNG dùng `tsc --noEmit` — no-op ở repo này).
- [x] 6.2 `npm test` xanh — 305/305.
- [x] 6.3 Trình duyệt nối apitest: `/operations/events/:id` hiện `Gửi duyệt` + `Huỷ event`,
      `Trạng thái: draft`, `Link/Địa điểm` đúng link Meet.

## 7. Bỏ ngỏ — cần quyết định

- [ ] 7.1 KHÔNG có UI duyệt event ở bất kỳ đâu. Vòng đời là DRAFT → submit → PENDING_APPROVAL →
      review(approve) → PUBLISHED, nhưng màn duyệt duy nhất nằm ở `/community/events` đã bị xoá ở change
      `admin-event-create-repair`. Endpoint BE `POST /api/v1/admin/events/{id}/review` vẫn còn, chỉ mất
      caller. ⇒ Hiện KHÔNG publish được event qua giao diện. Cần thêm nút "Duyệt" vào EventDetailPage
      (gate `admin.event.manage`) hoặc dựng lại màn duyệt riêng.
