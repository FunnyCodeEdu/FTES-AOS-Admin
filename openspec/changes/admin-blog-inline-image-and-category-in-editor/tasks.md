# Tasks

## 1. Upload ảnh inline
- [x] 1.1 Hook `useUploadBlogMedia` (POST /blog/media, field file → secureUrl)
- [x] 1.2 MarkdownEditor: custom command "Tải ảnh" mở file picker → chèn tại con trỏ
- [x] 1.3 Dán (onPaste) + kéo-thả (onDrop) ảnh → upload + chèn tại con trỏ
- [x] 1.4 Chèn `![tên](secureUrl)` đúng selection + đặt lại con trỏ; báo "Đang tải ảnh…"

## 2. Quản lý danh mục trong editor
- [x] 2.1 Nút "Quản lý" cạnh Select danh mục → mở BlogCategoryModal (CRUD dùng chung)

## 3. Verify
- [x] 3.1 `npm run build` xanh
- [x] 3.2 `openspec validate admin-blog-inline-image-and-category-in-editor --strict`
