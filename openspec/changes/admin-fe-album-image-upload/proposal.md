# admin-fe-album-image-upload — Tạo học liệu FE = tải ALBUM ẢNH, không nén zip nữa

## Why

`ResourceFormModal` có nhánh riêng cho `type = FE`: admin chọn cả THƯ MỤC, FE nén (JSZip) thành
**một file `.zip`** rồi upload như một **phiên bản** học liệu (`POST /api/v1/resources/{id}/versions`).
Nhánh đó có TRƯỚC tính năng FE mới.

FE bây giờ **là một ALBUM ẢNH**: mỗi tấm là một dòng `resource.fe_images` với `sortOrder`, `caption`
và luồng bình luận RIÊNG của nó; ảnh nạp **từng tấm một** qua `POST /api/v1/resources/{id}/images`
(BE: `FeAlbumController.add` → `FeAlbumService.addImage`). Một file zip sinh ra **0 dòng** `fe_images`
→ học liệu FE tạo từ Admin hiện lên trang học viên là **album RỖNG**, chỉ còn cái zip tải về. Nói cách
khác: đường tạo FE của Admin đang tạo ra dữ liệu sai kiểu, không phải chỉ là UX xấu.

Ràng buộc thật của server (đọc từ `FTES-AOS-Backend@origin/main`, là hợp đồng phải tuân):

- `FeAlbumService.MAX_IMAGES_PER_ALBUM = 50`, `MAX_IMAGE_BYTES = 10MB`,
  `ALLOWED_IMAGE_MIME = image/png | image/jpeg | image/webp` (khớp phần ảnh của `ResourceType.FE`).
- `ResourceExamRateLimiter.checkFeImageUpload`: **10 ảnh/phút** và **60 ảnh/giờ** mỗi user →
  vượt là `RESOURCE_RATE_LIMITED` / HTTP 429. Bắn 50 request một lượt chắc chắn gãy giữa chừng.
- Ghi album = **owner HOẶC người duyệt môn** (`VisibilityGuard.isOwnerOrApprover`) + leaf
  `resource.fe.contribute`; server trả cờ `FeAlbumView.canManage` tính bằng ĐÚNG vị từ nó dùng để chặn.
- `sortOrder` do BE đóng dấu tăng dần theo THỨ TỰ NẠP → thứ tự upload chính là thứ tự trang của album.

## What Changes

- **Nhánh FE của `ResourceFormModal` bỏ nén zip**, thay bằng nạp album: lọc ảnh từ thư mục đã chọn →
  **sắp xếp tự nhiên** theo đường dẫn (`de1, de2, de10` đúng thứ tự người đọc) → upload **TUẦN TỰ**
  từng ảnh vào `POST /resources/{id}/images` (qua `coreClient` — endpoint KHÔNG nằm dưới `/admin`).
- **Nhịp tải tôn trọng rate limit**: giãn tối thiểu **6,5s giữa hai request** (≤10/phút kể cả khi cửa
  sổ cố định của Redis cắt ngang loạt tải), gặp 429 thì **lùi rồi thử lại CHÍNH tấm đó** (4 lần:
  10s/20s/40s/60s) thay vì bỏ cả lượt. Admin thấy tiến độ sống ("Đang tải ảnh 12/50…", đếm ngược nhịp
  chờ) và **dừng được giữa chừng**.
- **Không bao giờ cắt bớt im lặng**: quá trần 50 (trừ đi số ảnh đã có trong album khi SỬA) → giữ 50
  tấm đầu theo thứ tự đã sắp và nói rõ bỏ lại bao nhiêu; file bị loại (không phải ảnh / >10MB / rỗng)
  báo theo **số lượng + lý do**.
- **Dừng hoặc lỗi giữa chừng → báo đã nạp được bao nhiêu ảnh THẬT** và cho **nạp tiếp** (bấm lại "Tạo"
  đi tiếp từ đúng tấm còn thiếu, không tạo trùng học liệu, không nạp lại ảnh đã có — con trỏ tiếp tục
  đối chiếu với `GET /resources/{id}/images` của server).
- **Quyền vẫn nghiêm**: KHÔNG đoán quyền ở client. Khi SỬA học liệu FE, ô chọn thư mục gate bằng cờ
  `canManage` **của server**; thiếu quyền thì 403 hiện thành thông báo tiếng Việt rõ nghĩa. `<Can>`
  gác nút mở modal giữ NGUYÊN (`resource.upload` ở list, `admin.resource.manage` ở detail).
- Bản địa hoá lỗi `RESOURCE_*` cho luồng này trong `shared/api/errors.ts`; bảng tra hiểu thêm dạng
  `"MÃ: chi tiết"` vì `ResourceExceptionHandler` nhét mã vào ĐẦU `message` (`data` = null).
- Gỡ đường zip đã chết (`zipFolder`, `MAX_FE_ZIP_BYTES`, import `JSZip`) — không nơi nào khác dùng.

## Capabilities

### New Capabilities

<!-- không thêm capability mới -->

### Modified Capabilities

- `resource-management`: luồng tạo/sửa học liệu `type = FE` chuyển từ "nén thư mục thành zip rồi
  upload 1 phiên bản" sang "nạp từng ảnh vào album FE", kèm luật trần 50 ảnh, báo cáo file bị loại,
  nhịp tải chống 429, huỷ giữa chừng và nạp tiếp.

## Impact

- **Sửa**: `src/features/academic/resources/components/ResourceFormModal.tsx` (nhánh FE),
  `src/features/academic/resources/api/resources.api.ts` (+`fetchFeAlbum`/`uploadFeAlbumImage`/
  `useFeAlbum`), `src/features/academic/resources/constants.ts` (nhãn loại FE),
  `src/shared/api/errors.ts` (mã `RESOURCE_*` + tra mã theo tiền tố message).
- **Thêm**: `src/features/academic/resources/lib/feAlbumUpload.ts` (lọc/sắp/lập kế hoạch + vòng lặp
  tải tuần tự thuần logic) và test `feAlbumUpload.test.ts`.
- **API BE tiêu thụ**: `GET|POST /api/v1/resources/{id}/images` (coreClient). KHÔNG đụng BE, KHÔNG đổi
  hành vi submit/approve.
- **Permission gates**: giữ nguyên `resource.upload` (nút Upload ở `/academic/resources`) và
  `admin.resource.manage` (nút Sửa ở detail); quyền ghi album do BE quyết (`canManage`, 403).
