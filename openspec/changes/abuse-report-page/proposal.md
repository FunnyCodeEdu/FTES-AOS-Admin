# Trang admin "Báo cáo cào đề / lạm dụng"

## Why

BE change `exam-scrape-guard` ghi mỗi lần detector chặn (429) hoặc tự khoá một tài khoản cào đề vào
`identity.abuse_signals`, và mở endpoint `GET /identity/admin/abuse-signals`. Chưa có màn nào cho
admin nhìn thấy danh sách đó — yêu cầu "list được tổng hợp báo cáo qua trang admin".

## What Changes

- Trang **Báo cáo cào đề** (`/users/abuse`) đặt cạnh "Tài khoản dùng chung" và "Đơn xin mở khoá"
  (đợt B), nhóm "Hệ thống": bảng tín hiệu + lọc theo trạng thái (Đang mở / Đã xử lý / Tất cả), cột
  tài khoản (link), loại, mức (THROTTLED/LOCKED), số đề khác nhau/giờ, thời điểm.
- Nút **"Đã xử lý"** (gác `user.lock`) đánh dấu một tín hiệu — dọn khỏi danh sách việc cần xem,
  **KHÔNG** mở khoá tài khoản (mở khoá là quyết định riêng qua đơn kháng nghị / màn tài khoản, đúng
  như BE tách hai việc).
- API `coreClient` tại `/identity/admin/**`, tái dùng `IdentityPage` (`totalElements`).

## Impact

- Affected specs: `admin-security-console`
- Affected code: `features/users/api/abuseSignals.api.ts` (mới), `features/users/pages/AbuseSignalsPage.tsx`
  (mới), `app/routeRegistry.tsx`.
- Không đổi BE — dùng endpoint đã có ở PR `exam-scrape-guard`.
