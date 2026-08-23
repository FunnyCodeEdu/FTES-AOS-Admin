# mentor-video-upload-path — Đẩy video lên đúng dịch vụ đang chạy (hết 404)

## Why

Mentor tạo bài học kèm file video ở admin.ftes.vn nhận **404**:
`POST https://upload.ftes.vn/api/videos → 404 Not Found` (DevTools, 23/08).

`upload.ftes.vn` từ 22/08 trỏ **UploadVideo-FTES-AOS**, controller `/api/v1/videos`. Path
`/api/videos` mà FE đang gọi là của dịch vụ **đời cũ** (UploadVideoManagement) — không còn ai phục vụ
nó ở host đó. Quay lại dịch vụ cũ cũng vô ích: đo trên box, nó từ chối access token của AOS
(`UNSUPPORTED_ALG` — nó đợi HS256 của nền tảng cũ).

Ba bước cũ (`upload-url` → POST `/api/videos` → `complete-upload`) đều thuộc hợp đồng đã chết. Bước
"xin videoId từ BE" cũng không còn nghĩa: id phát được là id dịch vụ upload cấp lúc nhận file.

## What Changes

- `postVideoToUploadService`: POST `{uploadBaseUrl}/api/v1/videos`, FormData `file` + `title` +
  `lessonId`; KHÔNG gửi `videoId`/`hlsTime` (dịch vụ bỏ qua, gửi vào chỉ để ta tưởng đã đặt được).
  Vẫn gắn `Authorization: Bearer` — dịch vụ nay tự xác minh chữ ký RS256 của BE và đòi vai soạn nội dung.
- Bỏ `useGetLessonVideoUploadUrl` + `useCompleteLessonVideoUpload`; thêm `useAttachUploadedVideo`
  gọi `POST /courses/lessons/{id}/video/attach-upload` — BE ghi `aosvideo:<id>` + trạng thái
  `UPLOADING` và bài học poll `ingest-status` như đường kéo YouTube.
- `LessonVideoUpload` và `uploadLessonVideoFile` (modal tạo bài) dùng chung đường mới.

Vì sao KHÔNG gọi `video-ref`: nó đánh `READY` ngay trong khi dịch vụ còn đang chuyển mã — người học
mở ra gặp trình phát trắng, không lỗi nào.

## Capabilities

### New Capabilities

- `mentor-video-upload-path`: mentor đẩy được file video từ Admin CMS bằng chính phiên đăng nhập của
  mình, và trạng thái bài học phản ánh đúng tiến độ chuyển mã.

## Impact

- `features/academic/lessons/api/lessons.api.ts`, `features/academic/lessons/components/LessonVideoUpload.tsx`.
- Cần BE `mentor-video-upload-browser-path` + UploadVideo `feat/browser-upload-jwt` đã deploy.
- `tsc --noEmit` sạch, `npm run build` xanh, 672 vitest xanh.
- Browser E2E do chủ box bấm sau khi deploy production; đường API tương ứng đã E2E trên box
  (401/401/202 theo vai → attach → `aosvideo:` UPLOADING → ingest-status PROCESSING).
