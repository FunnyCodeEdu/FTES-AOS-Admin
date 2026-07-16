# admin-lecturer-ai-assist — Khu "Trợ lý AI" cho giảng viên trong academic console

## Why

BE đã có sẵn bộ endpoint AI cho giảng viên nhưng Admin console không có UI nào gọi:
- `POST /api/v1/ai/teacher/exam-generate` (job — sinh đề từ lesson/topic, `ai.teacher.use`)
- `POST /api/v1/ai/teacher/difficulty` (job — phân tích độ khó quiz, `ai.teacher.use`)
- `POST /api/v1/ai/teacher/grade` (job — chấm submission, `ai.teacher.grade`)
- `POST /api/v1/ai/mentor/student-brief` · `/feedback-assist` · `/cohort-insight`
  (sync, `ai.teacher.use` — MentorController)
- `GET /api/v1/ai/jobs/{id}` (poll job)

Đồng thời tile "mentor" bị gỡ khỏi AI Hub learner (change FE `ai-hub-live-tools`) vì nó
là công cụ của giảng viên — phải sống ở đây. Giá trị chính: giảng viên sinh đề/quiz từ
nội dung lesson rồi **đổ thẳng vào quiz editor** thay vì soạn tay.

## What Changes

- **Khu "Trợ lý AI"** trong academic console (`src/features/academic`):
  1. **Sinh đề vào quiz editor**: trong trang quiz editor thêm nút "Sinh câu hỏi bằng AI"
     → modal (nguồn: lesson của course / topic tự do; số câu; độ khó) → submit
     `exam-generate` → poll job → preview câu hỏi (sửa/bỏ từng câu) → "Thêm vào quiz" đổ
     vào question list của editor hiện có (KHÔNG tự lưu — giảng viên bấm lưu quiz như
     thường).
  2. **Gợi ý độ khó**: trong trang quiz thêm action "Phân tích độ khó (AI)" → submit
     `difficulty {quizId}` → poll → panel kết quả gợi ý.
  3. **Mentor student-brief**: trang mới "Trợ lý mentor" trong academic console — chọn
     course + học viên → `student-brief` → brief tổng hợp; kèm form feedback-assist
     (nháp phản hồi cho bài của học viên) và cohort-insight (tổng quan lớp).
  4. **AI soạn thảo document lesson**: trợ lý AI nhúng NGAY TRONG `LessonContentEditor`
     (`src/features/academic/lessons/components/LessonContentEditor.tsx` — markdown
     editor 2 cột sẵn có): (a) sinh dàn ý từ tiêu đề buổi + mô tả course, (b) viết nháp
     section theo dàn ý, (c) bôi đen đoạn trong textarea → viết lại / cải thiện / giải
     thích thêm, (d) chèn ví dụ + câu hỏi ôn tập cuối bài. Kênh BE: TÁI DÙNG
     `POST /api/v1/ai/sessions` (feature `LESSON_SUGGESTION` sẵn có trong enum, gác
     `ai.teacher.use` — delta BE ở change `ai-tutor-grounding-and-model-pick` §7) +
     `POST /ai/sessions/{id}/messages` **SSE stream** — KHÔNG endpoint BE mới, KHÔNG
     dùng job poll cho phần này (soạn thảo cần stream). Kết quả AI đổ vào editor dạng
     insert-at-cursor / replace-selection, có preview trước khi chèn + hoàn tác 1 bước,
     KHÔNG auto-save (chỉ ghi state draft local — nút Lưu sẵn có của editor là đường
     save duy nhất).
- REST client + poll hook theo pattern api/ hiện có của repo; **lưu ý envelope job =
  code 1002 Accepted** (client Admin phải chấp nhận 200 | 1002 — kiểm tra client hiện
  tại, sửa nếu đang chỉ nhận 200). Riêng tính năng 4 cần thêm **SSE client** (fetch
  stream POST + Bearer — EventSource không gửi được POST/header).

## Capabilities

### New Capabilities
- `admin-ai-exam-to-quiz-editor`: sinh đề AI preview + đổ vào quiz editor.
- `admin-ai-difficulty-suggest`: phân tích độ khó quiz bằng AI.
- `admin-ai-mentor-console`: student-brief / feedback-assist / cohort-insight.
- `admin-ai-lesson-draft-editor`: trợ lý AI soạn document lesson stream trong
  LessonContentEditor (dàn ý / nháp section / sửa đoạn bôi đen / ví dụ + ôn tập).

### Modified Capabilities
- Không sửa capability sẵn có; quiz editor chỉ NHẬN thêm câu hỏi qua state (contract lưu
  quiz giữ nguyên).

## Impact

- `src/features/academic/quiz/**` — nút + modal sinh đề, action độ khó.
- `src/features/ai/**` (mở rộng) hoặc `src/features/academic/ai-assist/**` (mới) —
  pages/api/types cho mentor console + poll hook + SSE client (`sse.ts`) + hook
  `useAiDraftStream`.
- `src/features/academic/lessons/components/LessonContentEditor.tsx` — mount panel
  `LessonAiDraftPanel` (component mới cùng thư mục); textarea đã có ref → đọc
  selectionStart/End cho replace-selection/insert-at-cursor.
- Menu/side-nav academic console thêm mục "Trợ lý AI".
- Phụ thuộc BE: change `ai-tutor-grounding-and-model-pick` (repo FTES-AOS-Backend) deploy
  trước — cấp authority map LESSON_SUGGESTION → `ai.teacher.use`, grounding lesson
  metadata, model config OPENROUTER V248 (không có nó AI trả lời không bám bài / 403
  sai nhóm quyền).
- Auth: dùng phiên đăng nhập native BE hiện có (`/auth/login`, apitest.ftes.vn);
  các endpoint gác `ai.teacher.use`/`ai.teacher.grade` — account ADMIN/LECTURER test
  4-role sẵn có dùng được.
- Không thay đổi BE; GraphQL gateway không dùng cho phần này (mutation → REST).
