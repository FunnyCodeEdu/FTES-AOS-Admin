## Why

Viết blog trên admin còn vướng:
1. **Không chèn được ảnh khi viết.** Editor (`@uiw/react-md-editor`) chưa wire upload — nút ảnh mặc
   định chỉ chèn `![](url)` rỗng; muốn có ảnh phải tự dán URL ngoài. Người viết muốn **up ảnh ngay tại
   vị trí con trỏ**. Endpoint BE `POST /api/v1/blog/media` (→ `secureUrl`, Cloudinary) đã sẵn nhưng FE
   chưa dùng.
2. **Quản lý danh mục xa lúc viết.** CRUD danh mục đã có nhưng nằm ở nút "Danh mục" trên trang DANH
   SÁCH; đang viết bài không thêm/sửa danh mục tại chỗ được (Select chỉ chọn danh mục có sẵn).

## What Changes

- Hook `useUploadBlogMedia` (POST `/blog/media`, multipart field `file`, Content-Type undefined override) → `secureUrl`.
- `MarkdownEditor`: chèn ảnh INLINE tại con trỏ qua **3 lối** — nút "Tải ảnh" trên thanh công cụ
  (custom command mở hộp chọn file), **dán** ảnh từ clipboard, **kéo-thả** file ảnh; cả ba upload rồi
  chèn `![tên](secureUrl)` đúng vị trí đang gõ. Hiện trạng "Đang tải ảnh…".
- `BlogEditorPage`: thêm nút **"Quản lý"** cạnh Select danh mục → mở `BlogCategoryModal` (CRUD dùng
  chung với trang danh sách) ngay trong lúc viết; đóng modal thì Select refresh danh mục mới.

Không đổi BE (category CRUD + media upload đã có).

## Capabilities

### Modified Capabilities

- `blog-editorial-admin`: editor chèn ảnh inline (upload tại con trỏ / dán / kéo-thả) + quản lý danh
  mục ngay trong màn soạn bài.
