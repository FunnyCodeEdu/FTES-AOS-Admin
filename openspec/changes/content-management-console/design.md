# Design — content-management-console

Bối cảnh: Vite + React + TS, antd v5, react-router v7, @tanstack/react-query v5, axios
`apiClient` (base `${ROOT}/api/v1/admin`), `coreClient` (`${ROOT}/api/v1`). Route + menu
khai báo tập trung ở `src/app/routeRegistry.tsx`; menu lọc theo permission
(`useMe().permissions`) qua `NavMenu`. Mutation `onError: handleAdminMutationError`, xoá qua
`Modal.confirm`, toast `message.*`. Envelope `{code,message,data}` unwrap sẵn.

## A. banner-slider-admin (mở rộng module có sẵn)

- `src/modules/api/rest/admin/types.ts`: `AdminBannerView` + `BannerBody` thêm `subtitle?`,
  `ctaText?`, `theme?`.
- `src/features/operations/components/BannerFormModal.tsx`: thêm
  - `Form.Item name="subtitle"` → `Input.TextArea` (rows 2, maxLength 255),
  - `Form.Item name="ctaText"` → `Input` (maxLength 80, placeholder "XEM CHI TIẾT"),
  - `Form.Item name="theme"` → `Input` (chuỗi CSS gradient) + **ô preview**
    `<div style={{ background: themeValue, height: 64 }}>` cạnh input.
  - Preview slide mini: ghép `imageUrl` + `title` + `subtitle` + nút `ctaText` trên nền `theme`.
- `src/features/operations/api/banners.api.ts` — `toBannerBody()` map thêm 3 field vào body
  gửi `POST/PATCH /banners` (giữ remap cũ `placement←position`, `sortOrder←order`,
  `startsAt/endsAt`).
- **Ảnh banner: giữ Input URL** (đã chốt) — admin dán link CDN sẵn có; không làm component
  upload trong change này. (Tương lai có thể thêm `ImageUpload` presigned qua
  `FileStorageService` visibility PUBLIC — ngoài phạm vi.)

## B. course-category-admin (module mới — clone `subjects`)

Cấu trúc `src/features/academic/categories/`:
```
api/categories.keys.ts   # factory all/lists/list/detail
api/categories.api.ts     # useCategories (GET /course-categories), useCreateCategory
                          # (POST), useUpdateCategory (PUT /:id), useDeleteCategory (DELETE /:id)
pages/CategoryListPage.tsx
components/CategoryFormModal.tsx
components/CategoryTable.tsx
```
- API base: dùng `apiClient` (đã `/api/v1/admin`) → path tương đối `/course-categories`
  khớp BE `POST/PUT/DELETE /api/v1/admin/course-categories`. List có thể gọi public
  `coreClient.get("/courses/categories")` (để lấy `courseCount`) hoặc admin list — chọn
  public read cho đơn giản.
- `CategoryListPage`: antd `Table` (cột name, slug, courseCount, hành động), filter/paging
  qua `useSearchParams`, nút Tạo/Sửa bọc `<Can permissions={["course.category.manage"]}>`,
  xoá `Modal.confirm({okType:"danger"})`.
- `CategoryFormModal`: antd `Form` vertical — `name` (bắt buộc), `slug` (tuỳ chọn, helper
  "để trống sẽ tự sinh"), `description`. Dùng chung create/edit (`isEdit=!!category`).
- **Xử lý 409**: `onError` bắt `ApiError.code===409` / `errorCode==='COURSE_CATEGORY_IN_USE'`
  → `message.error("Danh mục còn khoá học, không thể xoá")`; `SLUG_TAKEN` → báo lỗi field slug.
- Route + menu (`routeRegistry.tsx`):
  ```tsx
  { path:"/academic/categories", element:<CategoryListPage/>, layout:"admin",
    requiredPermissions:["course.category.manage"],
    nav:{ label:"Danh mục khoá học", icon:<FolderOpenOutlined/>, group:"Học thuật" } }
  ```

## C. blog-editorial-admin (module mới)

Cấu trúc `src/features/content/blog/`:
```
api/blog.keys.ts, api/blog.api.ts   # posts + categories (dùng coreClient → /api/v1/blog/*)
pages/BlogListPage.tsx              # bảng bài viết (title, category, published, view, updated)
pages/BlogEditorPage.tsx           # tạo/sửa 1 bài (route /content/blog/new, /content/blog/:id)
components/BlogCategoryModal.tsx    # CRUD category blog
components/MarkdownEditor.tsx       # editor + preview
```
- API (`coreClient`, base `/api/v1`): 
  - `getPosts({categorySlug,page,size})`, `getPostBySlug` (đọc để sửa) — hoặc admin đọc
    theo id nếu cần bản nháp; publish/unpublish qua `PATCH /blog/posts/{id}/publish` (theo
    `BlogPostController`), create `POST /blog/posts`, update `PUT /blog/posts/{id}`, delete
    `DELETE /blog/posts/{id}`.
  - categories: `GET/POST/PUT/DELETE /blog/categories` (`blog.manage`).
  - Header auth Bearer (interceptor sẵn); các write cần `blog.manage`.
- **Editor** (đã chốt): `@uiw/react-md-editor` — markdown WYSIWYG + preview trong 1 gói,
  khớp `content_md` của BE. Wrap trong `MarkdownEditor.tsx`; preview của gói có sanitize
  (bật `rehype-sanitize` để chặn XSS). SSR không liên quan (Vite SPA).
- `BlogEditorPage`: `Form` — `title` (bắt buộc), `slug` (auto từ title, sửa được),
  `categoryId` (Select từ categories), `thumbnailUrl` (**Input URL**),
  `content` (MarkdownEditor). Nút "Lưu nháp" (published=false) / "Xuất bản" (publish) /
  "Gỡ xuất bản". Rời trang khi có thay đổi chưa lưu → confirm.
- `BlogListPage`: `Table` + filter category + trạng thái; hành động Sửa/Publish/Xoá bọc
  `<Can permissions={["blog.manage"]}>`.
- Route + menu:
  ```tsx
  { path:"/content/blog", element:<BlogListPage/>, layout:"admin",
    requiredPermissions:["blog.manage"], nav:{ label:"Blog", icon:<ReadOutlined/>, group:"Nội dung" } },
  { path:"/content/blog/new", element:<BlogEditorPage/>, layout:"admin", requiredPermissions:["blog.manage"] },
  { path:"/content/blog/:id", element:<BlogEditorPage/>, layout:"admin", requiredPermissions:["blog.manage"] },
  ```
  (route editor không set `nav` → không hiện trên menu.)

## Quyền & an toàn
- Menu tự hiện/ẩn theo permission qua `NavMenu` — không hardcode role.
- Mọi mutation nguy hiểm confirm + để BE audit.
- Preview markdown/HTML luôn sanitize (XSS).
- `npm run build` + `tsc --noEmit` phải sạch (yêu cầu repo).
