# admin-package-archived-readonly-and-sortorder — gói đã ngừng bán chỉ đọc + sortOrder mặc định khi tạo gói

## Why

Hai lỗi trong tab "Giá & gói" (`PricingTab`):

1. **Gói ARCHIVED vẫn render y hệt gói đang bán.** Card gói đã "Ngừng bán" vẫn còn form ghi được,
   nút "Lưu gói", "Ngừng bán" và "Thêm entitlement"; trạng thái chỉ hiện bằng một `<Tag>` xám ghi
   chữ `ARCHIVED` (nguyên văn giá trị BE). Admin dễ sửa nhầm một gói không còn bán, và tệ hơn: PATCH
   gói **ghi đè toàn bộ mảng entitlement** (`PackageService.updatePackage` xoá sạch rồi insert lại),
   nên một lần bấm nhầm trên gói ARCHIVED vẫn có thể đổi quyền của khách đã mua gói đó — gói ARCHIVED
   vẫn cấp quyền cho purchase cũ (`findByCourseId` không lọc status).

2. **`sortOrder` bỏ trống khi tạo gói.** `buildPackagePayload` chỉ gửi `sortOrder` khi `!= null`, mà
   form gói mới không prefill ô này → BE mặc định `0`, trùng `sortOrder` của gói "Trọn khoá" cũng `0`
   → thứ tự hiển thị gói trên trang bán thành tuỳ tiện (phụ thuộc thứ tự trả về của DB).

## What Changes

- **Gói ARCHIVED ở chế độ đọc**: chip trạng thái tiếng Việt "Ngừng bán" thay cho tag `ARCHIVED` thô;
  toàn bộ form bị `disabled`; ẩn "Thêm entitlement", icon xoá dòng entitlement, "Lưu gói" và
  "Ngừng bán".
- **Nút "Kích hoạt lại"** thay cho cụm nút ghi. BE có đường bật lại: `PackageService.updatePackage`
  nhận `status` ∈ {`ACTIVE`,`ARCHIVED`}. Mutation kích hoạt lại gửi **duy nhất** `{ status: "ACTIVE" }`
  — KHÔNG kèm `entitlements`, vì BE chỉ xoá-ghi-lại entitlement khi `req.entitlements() != null`; gửi
  thiếu là mất quyền của khách đã mua.
- **`sortOrder` mặc định khi tạo gói**: card gói mới prefill `sortOrder = max(sortOrder gói hiện có) + 1`
  (không có gói nào → `0`), và luôn gửi field này lên BE.

## Impact

- Affected specs: `academic-course-console` (MODIFIED).
- Affected code: `features/academic/courses/components/PricingTab.tsx`,
  `features/academic/courses/api/courses.api.ts`, `features/academic/types/index.ts`.
- KHÔNG chạm `buildEntitlementPayload` (đường code từng suýt xoá quyền khách trả tiền).

## Non-goals

- Kéo-thả sắp xếp gói: vẫn nhập số `sortOrder` bằng tay.
- Sửa entitlement của gói ARCHIVED: muốn sửa thì kích hoạt lại trước.
