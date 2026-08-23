# Tasks — mentor-video-upload-path

- [x] 1.1 `postVideoToUploadService` → `/api/v1/videos`, FormData file/title/lessonId
- [x] 1.2 `UPLOAD_VIDEO_ENDPOINT` — một chỗ duy nhất dựng path
- [x] 1.3 Bỏ hook `upload-url` + `complete-upload`; thêm `useAttachUploadedVideo`
- [x] 1.4 `LessonVideoUpload.handleFile` 2 bước; `uploadLessonVideoFile` (modal tạo bài) 2 bước
- [x] 1.5 Ghi lại hợp đồng mới ngay trong file api (kèm lý do hợp đồng cũ chết)
- [x] 2.1 `tsc --noEmit` sạch + `npm run build` xanh + 672 vitest xanh
- [ ] 2.2 Browser E2E trên admin.ftes.vn sau khi deploy (chủ box)
