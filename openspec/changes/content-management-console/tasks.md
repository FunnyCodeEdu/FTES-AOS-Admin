# Tasks — content-management-console

## 1. Banner slider admin (mở rộng)
- [x] 1.1 `modules/api/rest/admin/types.ts`: banner type/body +`subtitle?`, `ctaText?`, `theme?`. (Thực tế Banner type ở `features/operations/shared/types.ts` — module đó không tồn tại; đã sửa nơi thật.)
- [x] 1.2 `features/operations/components/BannerFormModal.tsx`: thêm field subtitle (TextArea), ctaText (Input), theme (Input + ô preview) + preview slide mini.
- [x] 1.3 `features/operations/api/banners.api.ts`: `toBannerBody` map 3 field mới.
- [x] 1.4 Ảnh banner: giữ Input URL (đã chốt — không làm upload trong change này).

## 2. Course category admin (mới)
- [x] 2.1 `features/academic/categories/api/{categories.keys.ts,categories.api.ts}`: hooks list/create/update/delete (`/course-categories`); list lấy `courseCount` từ `/courses/categories`.
- [x] 2.2 `pages/CategoryListPage.tsx` + `components/{CategoryTable,CategoryFormModal}.tsx` (clone `subjects`).
- [x] 2.3 Xử lý 409 `COURSE_CATEGORY_IN_USE` / `SLUG_TAKEN` trong `onError`.
- [x] 2.4 `routeRegistry.tsx`: route `/academic/categories` + menu "Danh mục khoá học" nhóm "Học thuật", `requiredPermissions:["course.category.manage"]`.

## 3. Blog editorial admin (mới)
- [x] 3.1 Thêm dependency `@uiw/react-md-editor` (editor + preview markdown; bật `rehype-sanitize`).
- [x] 3.2 `features/content/blog/api/{blog.keys.ts,blog.api.ts}`: posts (list/detail/create/update/publish/unpublish/delete) + categories CRUD (`coreClient` `/blog/*`).
- [x] 3.3 `pages/BlogListPage.tsx`: bảng + filter category/trạng thái + hành động (Sửa/Publish/Xoá) bọc `<Can>`.
- [x] 3.4 `pages/BlogEditorPage.tsx` + `components/MarkdownEditor.tsx` (wrap `@uiw/react-md-editor`): form title/slug/category/thumbnail(URL)/content, Lưu nháp / Xuất bản / Gỡ; preview sanitize; confirm khi rời trang có thay đổi.
- [x] 3.5 `components/BlogCategoryModal.tsx`: CRUD category blog.
- [x] 3.6 `routeRegistry.tsx`: route `/content/blog`, `/content/blog/new`, `/content/blog/:id` + menu "Blog" nhóm "Nội dung", `requiredPermissions:["blog.manage"]`.

## 4. Verify
- [x] 4.1 `npm run build` + `tsc --noEmit` sạch.
- [ ] 4.2 Smoke apitest với tài khoản có quyền: tạo/sửa banner có subtitle/CTA/theme → FE slider đổi; CRUD danh mục khoá học (xoá danh mục còn khoá → chặn 409); tạo→xuất bản 1 bài blog → hiện trên FE `/blog`. (FE chỉ chạy local ở máy user — smoke ngoài phạm vi agent.)
- [ ] 4.3 Kiểm tra menu ẩn khi thiếu permission tương ứng. (smoke local)
- [x] 4.4 `openspec validate content-management-console`.

## Nghiệm thu E2E 2026-07-23
- BLOCKED-ADMIN-CREDS: kịch bản cần đăng nhập ADMIN vào CMS; mật khẩu admin.test đã xoay 2026-07-21 (/root/.ftes-test-credentials trên box apitest), máy local không SSH tới box. Điều kiện mở khoá: cấp lại mật khẩu admin.test hoặc chạy trên server.
