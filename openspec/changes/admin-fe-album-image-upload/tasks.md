# Tasks — admin-fe-album-image-upload

## 1. Hợp đồng BE (đọc, không sửa)

- [x] 1.1 Xác nhận `POST|GET /api/v1/resources/{id}/images`, DTO `FeAlbumView`/`FeImageView`
      (`FTES-AOS-Backend@origin/main`: `resource/web/FeAlbumController.java`, `resource/web/dto/FeAlbumDtos.java`).
- [x] 1.2 Xác nhận trần 50 ảnh, 10MB/ảnh, MIME png/jpeg/webp (`resource/service/FeAlbumService.java`)
      và `ResourceType.FE` nhận thêm ảnh (`resource/domain/ResourceType.java`).
- [x] 1.3 Xác nhận rate limit 10/phút + 60/giờ (`resource/support/ResourceExamRateLimiter.java`) và
      envelope lỗi dạng `"MÃ: chi tiết"` (`resource/web/ResourceExceptionHandler.java`).

## 2. Tầng logic thuần

- [x] 2.1 Thêm `src/features/academic/resources/lib/feAlbumUpload.ts`: hằng số khớp BE, `naturalCompare`,
      `feImageMime`, `planFeAlbumUpload` (lọc + sắp + cắt theo chỗ trống + gom lý do bỏ),
      `describePlanWarnings`, `estimateUploadSeconds`, `isFeRateLimitError`, `runFeAlbumUpload`
      (tuần tự + nhịp 6,5s + backoff 429 + huỷ).
- [x] 2.2 Test `feAlbumUpload.test.ts` (vitest): sắp tự nhiên `de1/de2/de10`, cắt trần + báo số bỏ lại,
      gom file bị loại theo lý do, nhịp giãn đúng, retry 429 rồi đi tiếp, huỷ giữa chừng trả đúng số đã nạp,
      lỗi khác dừng ngay và báo số đã nạp.

## 3. Tầng API

- [x] 3.1 `resources.keys.ts`: thêm key `feAlbum(id)`.
- [x] 3.2 `resources.api.ts`: `FeImageView`/`FeAlbumView`, `fetchFeAlbum`, `uploadFeAlbumImage`
      (coreClient, multipart `Content-Type: undefined`, `signal`), hook `useFeAlbum(id, enabled)`.

## 4. Modal

- [x] 4.1 Bỏ import `JSZip`, hàm `zipFolder`, hằng `MAX_FE_ZIP_BYTES`; `resolveUpload` chỉ còn lo file đơn
      (nhánh FE không đi qua nó nữa).
- [x] 4.2 Nhánh FE: chọn thư mục → lập kế hoạch ngay, hiện tóm tắt + cảnh báo + ước tính thời gian.
- [x] 4.3 `handleFinish`: tạo/sửa resource → chạy `runFeAlbumUpload` → thông báo kết quả; tái dùng
      `phase`/`percent`, thêm dòng trạng thái + nút "Dừng".
- [x] 4.4 Nạp tiếp: `pendingRef` + đối chiếu `fetchFeAlbum` trước khi chạy tiếp; không tạo trùng học liệu.
- [x] 4.5 Sửa học liệu FE: gate ô chọn bằng `canManage` của server, chỗ trống `= maxImages − total`.
- [x] 4.6 Ẩn "Ghi chú phiên bản" ở nhánh FE; `constants.ts` đổi nhãn `FE (album ảnh)`.

## 5. Lỗi & bản địa hoá

- [x] 5.1 `shared/api/errors.ts`: thêm `RESOURCE_RATE_LIMITED`, `RESOURCE_VALIDATION`,
      `RESOURCE_FILE_TOO_LARGE`, `RESOURCE_ACCESS_DENIED`, `RESOURCE_UPLOAD_INCOMPLETE`,
      `RESOURCE_STORAGE_UNAVAILABLE`; tra mã theo tiền tố `"MÃ: chi tiết"` của message.
- [x] 5.2 403 ở luồng album → câu tiếng Việt nói rõ ai được thêm ảnh (owner/người duyệt môn).

## 6. Verify

- [x] 6.1 `npx tsc --noEmit` sạch.
- [x] 6.2 `NODE_OPTIONS=--max-old-space-size=4096 npm run build` xanh.
- [x] 6.3 `npx vitest run` xanh.
- [x] 6.4 `npx openspec validate admin-fe-album-image-upload --strict` xanh.

## 7. Nợ lại (không làm trong change này)

- [ ] 7.1 Gỡ dependency `jszip` khỏi `package.json` + `package-lock.json` (cần `npm install`, mà
      `node_modules` là junction dùng chung với repo gốc → làm ở commit dọn riêng).
- [ ] 7.2 Quản lý album trong Admin: sửa caption, kéo-thả `PUT …/images/order`, xoá `DELETE …/images/{imageId}`.
