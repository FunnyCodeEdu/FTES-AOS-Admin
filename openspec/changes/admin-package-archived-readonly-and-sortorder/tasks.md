# Tasks — admin-package-archived-readonly-and-sortorder

## 1. Kiểm chứng backend (chỉ đọc repo FTES-AOS-Backend)

- [x] 1.1 Xác nhận `PackageService.updatePackage` nhận `status` ∈ {ACTIVE, ARCHIVED}
- [x] 1.2 Xác nhận entitlement chỉ bị xoá-ghi-lại khi `req.entitlements() != null`

## 2. API layer (`courses.api.ts` + `types/index.ts`)

- [x] 2.1 `UpdatePackageRequest` thêm `status?: "ACTIVE" | "ARCHIVED"`
- [x] 2.2 Helper thuần `nextPackageSortOrder(packages)` = max(sortOrder ?? 0) + 1, rỗng → 0
- [x] 2.3 Helper thuần `isPackageArchived(pkg)`
- [x] 2.4 `useReactivateCoursePackage(courseId)` PATCH body chỉ `{ status: "ACTIVE" }`
- [x] 2.5 KHÔNG sửa `buildEntitlementPayload`

## 3. UI (`PricingTab.tsx`)

- [x] 3.1 Card gói ARCHIVED: chip "Ngừng bán", form `disabled`, ẩn nút ghi + "Thêm entitlement"
- [x] 3.2 Card gói ARCHIVED: nút "Kích hoạt lại" có Popconfirm, trong `<Can course.manage>`
- [x] 3.3 Card gói mới: prefill `sortOrder` bằng `nextPackageSortOrder(packages)` tính lúc bấm "Thêm gói"

## 4. Verify

- [x] 4.1 `npx tsc --noEmit` sạch
- [x] 4.2 `npm run build` xanh
- [x] 4.3 `npx vitest run` — 47 test cũ còn xanh + test mới cho `nextPackageSortOrder` / `isPackageArchived`
