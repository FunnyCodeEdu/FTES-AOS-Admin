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

- [x] 4.1 `npx tsc --noEmit` sạch (exit 0) + `npm run build` xanh. (Ghi chú cũ "vitest chưa cài" đã
      lỗi thời — `node_modules/vitest` đã có, 4 lỗi TS2307 không còn.)
- [x] 4.2 Vitest: helper payload/option viết test thuần (repo không có @testing-library nên không
      render được component): `courses.api.test.ts` (entitlement PART/LESSON/EXERCISE + payload gói),
      `PricingTab.test.ts` (`isPackageAreaReadOnly` chứng minh LEGACY/thiếu quyền không có nút ghi,
      options dựng từ `course.tree`). `npx vitest run` → 47 test / 4 file PASS.
- [x] 4.3 E2E qua trình duyệt trên apitest (2026-07-20): **7/7 PASS, không bước ĐỎ**. Tạo gói qua UI
      (`POST …/packages` entitlement PART + `freeLessonIds` → 200) → sửa giá 150k→175k (PATCH GIỮ
      `sectionId`+`freeLessonIds`, product `priceVnd` 175000) → "Ngừng bán" (Popconfirm → DELETE 200)
      → gói biến mất khỏi `GET /courses/{id}/packages` công khai, còn ARCHIVED ở `/packages/admin`.
      Thêm: rename gói "Trọn khoá" giữ `entitlements:[{type:"COURSE"}]` (2 vòng), `/me/access`
      `fullAccess:true`; khoá LEGACY read-only đúng; modal một chiều huỷ → revert, 0 request ghi.
      Bằng chứng: `C:\Users\hahuy\Desktop\cc\E2E-ADMIN-PACKAGE-UI-2026-07-20.md`
      (screenshot không chụp được do preview headless — thay bằng dump `innerText` + body request
      thật bắt qua hook `XMLHttpRequest.prototype.send` + đọc lại bằng REST).
