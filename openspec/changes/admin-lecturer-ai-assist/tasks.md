# Tasks — admin-lecturer-ai-assist

## 1. Nền tảng — API client + envelope + poll
- [ ] 1.1 Đọc helper unwrap envelope hiện tại của repo; đảm bảo nhận `code === 200 || code === 1002` (sửa 1 chỗ tại helper nếu hardcode 200)
- [ ] 1.2 `features/academic/ai-assist/api`: submitExamGenerate/submitDifficulty/submitTeacherGrade/getAiJob + mentor 3 endpoint (đọc record request của `MentorController` BE để khớp field)
- [ ] 1.3 Hook `useAiJobPolling` (2.5s, dừng COMPLETED/FAILED, stale 90s)
- [ ] 1.4 Unit test: unwrap 1002, polling dừng đúng
- [ ] 1.5 **Vòng chất lượng**: unit test + e2e test → đánh giá vòng 1 → fix → đánh giá vòng 2

## 2. Tính năng A — Sinh đề vào quiz editor
- [ ] 2.1 Nút "Sinh câu hỏi bằng AI" trong quiz editor + `AiExamGenerateModal` (nguồn lesson/topic, số câu, độ khó)
- [ ] 2.2 Poll → preview (map prompt→question, answer_key→correct; sửa inline; keep/drop; hiện model)
- [ ] 2.3 Append vào question list state của editor (map đúng shape store hiện có, KHÔNG auto-save); 403 ownership → message rõ
- [ ] 2.4 Unit test: body submit, map schema, append đúng số câu giữ, không có save request tự động
- [ ] 2.5 e2e tay (account LECTURER, apitest): sinh từ lesson có bài đọc → đổ vào quiz → lưu quiz
- [ ] 2.6 **Vòng chất lượng**: unit test + e2e test → đánh giá vòng 1 → fix → đánh giá vòng 2

## 3. Tính năng B — Độ khó quiz
- [ ] 3.1 Action "Phân tích độ khó (AI)" + panel kết quả (markdown + model, error/retry)
- [ ] 3.2 Unit test + e2e tay trên quiz thật
- [ ] 3.3 **Vòng chất lượng**: unit test + e2e test → đánh giá vòng 1 → fix → đánh giá vòng 2

## 4. Tính năng C — Trợ lý mentor
- [ ] 4.1 Trang `ai-assist` + mục side-nav "Trợ lý AI" (gate `ai.teacher.use`)
- [ ] 4.2 Tab student-brief (course→student→brief), feedback-assist (draft + copy, không auto-send), cohort-insight
- [ ] 4.3 Unit test: gate permission, render 3 tab, copy-only; e2e tay với account LECTURER
- [ ] 4.4 **Vòng chất lượng**: unit test + e2e test → đánh giá vòng 1 → fix → đánh giá vòng 2

## 5. Tính năng D — AI soạn thảo document lesson (design §7)
- [ ] 5.1 `shared/api/sse.ts`: `streamSse` fetch-stream POST + Bearer (token useAuthStore), parse event delta/done/error, bỏ comment ping, AbortSignal, retry-after-refresh 401
- [ ] 5.2 Hook `useAiDraftStream(lessonId)`: lazy-create session `{feature: LESSON_SUGGESTION, contextRef: {lessonId}}`, accumulate delta, send/stop/error, reset khi đổi lesson
- [ ] 5.3 `LessonAiDraftPanel` trong LessonContentEditor: nút toolbar (gate `ai.teacher.use`) + panel collapse; 4 quick-action (dàn ý / nháp section theo heading parse từ body / viết lại-cải thiện-giải thích đoạn bôi đen qua selection snapshot / ví dụ + câu hỏi ôn tập) + prompt tự do; preview stream + nút Dừng
- [ ] 5.4 Chèn có kiểm soát: insert-at-cursor / replace-selection qua `handleChange` (draft store local), hoàn tác 1 mức, KHÔNG gọi useUpdateLessonContent (không auto-save); model picker optional từ `GET /ai/models`; map lỗi SSE → message rõ
- [ ] 5.5 Unit test: parser SSE (fixtures delta/done/error/ping), selection snapshot giữ qua focus panel, insert/replace/undo đúng vị trí, KHÔNG có save request tự động, gate permission ẩn nút
- [ ] 5.6 e2e tay (account LECTURER, apitest): sinh dàn ý → chèn → bôi đen → cải thiện → thay thế → hoàn tác → Lưu bằng nút editor
- [ ] 5.7 **Vòng chất lượng**: unit test + e2e test → đánh giá vòng 1 → fix → đánh giá vòng 2

## 6. Verify
- [ ] 6.1 Build + typecheck repo xanh; `openspec validate admin-lecturer-ai-assist --strict` PASS
