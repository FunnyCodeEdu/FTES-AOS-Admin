## 1. API layer

- [x] 1.1 `types/index.ts`: `CoursePackage` khớp `PackageView` của BE (id, name, slug, status,
      salePrice, originalPrice, descriptions, sortOrder, defaultPackage, entitlements[]) +
      `PackageEntitlement` (id, type, sectionId, lessonId, selectedLessonIds, freeLessonIds,
      selectedExerciseIds, freeExerciseIds). Bỏ shape cũ `{name, price, entitlements: string}`.
- [x] 1.2 `courses.api.ts`: `useCoursePackages(courseId)` (GET `/courses/{id}/packages/admin`),
      `useCreateCoursePackage`, `useUpdateCoursePackage`, `useArchiveCoursePackage`. Dùng cùng client
      + `handleAdminMutationError` như các hook khác; key riêng `coursesKeys.packages(courseId)`.
- [x] 1.3 `useUpdateCoursePricing`: bỏ tham số `packages` khỏi type, chỉ còn `{ basePrice }`; xoá
      comment "no BE counterpart". Mapper detail: bỏ `packages: []` hardcode (gói đọc từ hook riêng).

## 2. PricingTab

- [x] 2.1 Tách khu vực gói khỏi `Form` pricing: mỗi gói là một `Card` có form + nút "Lưu gói" và
      "Ngừng bán" (`Popconfirm`), nút "Thêm gói" tạo gói mới qua POST.
- [x] 2.2 Editor entitlement: `Form.List` trong từng gói — Select `type` (PART/LESSON), Select
      section (khi PART), Select nhiều bài (khi LESSON), Select nhiều bài cho `freeLessonIds`.
      Options dựng từ `course.tree`.
- [x] 2.3 Khoá LEGACY: giữ Alert, toàn bộ khu vực gói read-only + chỉ dẫn sang tab Tổng quan.
- [x] 2.4 Mọi nút ghi bọc `<Can permissions={["course.manage"]}>` + tôn trọng `readOnly`.
- [x] 2.5 (thêm) `CourseDetailPage`: label tab đổi "Pricing & Packages" → "Giá & gói" cho khớp spec.

## 3. CourseInfoTab

- [x] 3.1 Chọn `PACKAGE` khi đang `LEGACY` → `Modal.confirm` cảnh báo một chiều; huỷ thì revert select.

## 4. Verify

- [ ] 4.1 `npm run build` xanh + `tsc --noEmit` sạch. (`tsc -b --noEmit` sạch cho code app; 4 lỗi
      TS2307 "Cannot find module 'vitest'" là do `node_modules/vitest` chưa được cài — có sẵn từ
      trước change này, cả 2 test blog cũ cũng dính. Chạy `npm install` rồi verify lại.)
- [x] 4.2 Vitest: helper payload/option viết test thuần (repo không có @testing-library nên không
      render được component): `courses.api.test.ts` (entitlement PART/LESSON/EXERCISE + payload gói),
      `PricingTab.test.ts` (`isPackageAreaReadOnly` chứng minh LEGACY/thiếu quyền không có nút ghi,
      options dựng từ `course.tree`). CHƯA chạy được vì vitest chưa cài (xem 4.1).
- [ ] 4.3 E2E tay trên apitest sau khi BE lên: tạo gói → sửa giá → ngừng bán → gói biến mất khỏi
      `GET /courses/{id}/packages` công khai.
