# content-management-console — Quản trị Banner/Slider · Danh mục khoá học · Blog

## Why

Admin CMS cần chỗ để biên tập nội dung storefront mà FE đang hiển thị:

- **Banner/Slider**: module đã có (`src/features/operations`, list qua GraphQL, CRUD REST
  `/banners`, quyền `admin.banner.manage`) nhưng form **thiếu 3 field mới** mà backend
  `banner-slider-enrichment` bổ sung: `subtitle`, `ctaText`, `theme` (gradient) — cần để
  dựng slide giàu như trang ftes cũ.
- **Danh mục khoá học**: **chưa có module** — admin không tạo/sửa/xoá được danh mục, trong
  khi FE cần taxonomy thật (backend `course-category-public-api`).
- **Blog**: **chưa có module** — không soạn/publish được bài viết editorial, dù backend
  `vn.ftes.aos.blog` đã đầy đủ (post/category/publish, quyền `blog.manage`).

## What Changes

- **Banner (mở rộng)**: thêm field `subtitle` (TextArea), `ctaText` (Input), `theme`
  (Input gradient + ô preview) vào `BannerFormModal` + `toBannerBody`; hiển thị preview slide
  mini. **Ảnh: giữ Input URL** như hiện tại (admin dán link CDN sẵn có) — không làm upload
  presigned trong change này.
- **Danh mục khoá học (mới)**: module `src/features/academic/categories/` (clone `subjects`)
  — list + form modal CRUD gọi `/admin/course-categories`; xử lý 409 `IN_USE` khi xoá; menu
  "Danh mục khoá học" nhóm "Học thuật"; quyền `course.category.manage`.
- **Blog (mới)**: module `src/features/content/blog/` — danh sách bài + editor
  (create/update/publish/unpublish/delete) gọi `/api/v1/blog/*`; quản lý category blog; menu
  "Blog" nhóm mới "Nội dung"; quyền `blog.manage`. Editor dùng **`@uiw/react-md-editor`**
  (markdown WYSIWYG + preview, khớp `content_md` của BE); preview sanitize XSS. Thumbnail
  bài viết: **dán URL** (không upload presigned).

## Capabilities

### New Capabilities
- `banner-slider-admin`: form banner mang subtitle/CTA/theme + preview.
- `course-category-admin`: CRUD danh mục khoá học.
- `blog-editorial-admin`: soạn/publish blog + quản lý category blog.

### Modified Capabilities
- Mở rộng module Banner hiện có (không đổi route/quyền, chỉ thêm field).

## Impact

- **Files mới**: `src/features/academic/categories/**`, `src/features/content/blog/**`.
- **Sửa**: `src/features/operations/components/BannerFormModal.tsx` + `api/banners.api.ts`
  (`toBannerBody`), `src/app/routeRegistry.tsx` (route + menu mới),
  `src/modules/api/rest/admin/types.ts` (banner type +3 field).
- **Dependency mới**: `@uiw/react-md-editor` (editor + preview markdown cho blog).
- **Không** thêm upload ảnh: banner image + blog thumbnail giữ Input URL.
- **Quyền**: `admin.banner.manage` (có), `course.category.manage` (BE seed mới),
  `blog.manage` (BE đã seed). Menu tự hiện theo permission (`NavMenu`).
- **Phụ thuộc backend**: `banner-slider-enrichment`, `course-category-public-api` đã merge;
  blog đã live.
