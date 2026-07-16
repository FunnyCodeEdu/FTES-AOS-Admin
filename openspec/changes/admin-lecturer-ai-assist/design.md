# Design — admin-lecturer-ai-assist

## 1. API client (`src/features/academic/ai-assist/api/index.ts` — pattern api/ repo)

```ts
submitExamGenerate(body: { lessonId?: string; subjectId?: string; topic?: string;
                           questionCount: number; difficulty: "EASY"|"MEDIUM"|"HARD";
                           language?: string })            // POST /ai/teacher/exam-generate → JobRef (envelope 1002)
submitDifficulty(body: { quizId: string })                 // POST /ai/teacher/difficulty → JobRef
submitTeacherGrade(body: { submissionId: string })         // POST /ai/teacher/grade → JobRef
getAiJob(id: string)                                       // GET /ai/jobs/{id} → {jobId,status,result,errorCode}
mentorStudentBrief(body)                                   // POST /ai/mentor/student-brief (sync)
mentorFeedbackAssist(body)                                 // POST /ai/mentor/feedback-assist (sync)
mentorCohortInsight(body)                                  // POST /ai/mentor/cohort-insight (sync)
```

- **Envelope**: job submit trả `{code: 1002, message: "Accepted", data: JobRef}` —
  helper unwrap của repo phải nhận `code === 200 || code === 1002` (đọc client hiện tại
  ở `src/shared`/api layer; nếu unwrap đang hardcode 200 thì sửa TẠI helper, một chỗ).
- Poll hook `useAiJobPolling(jobId)`: interval 2.5s, dừng COMPLETED/FAILED, stale 90s
  (mirror hook cùng tên phía FE learner).
- Body mentor endpoints: đọc `MentorController` record request khi implement (đã xác
  minh path + `@PreAuthorize('ai.teacher.use')`; field cụ thể lấy từ code BE, không bịa).

## 2. Sinh đề → quiz editor

- Điểm gắn: trang quiz editor hiện có (`src/features/academic/quiz/pages/...` — trang
  đang quản question list). Nút "Sinh câu hỏi bằng AI" cạnh nút thêm câu hỏi tay.
- Modal `AiExamGenerateModal`:
  1. Nguồn ngữ cảnh: radio "Bài học của course" (select lesson — lấy từ cây
     course/lesson API sẵn có của academic console) | "Chủ đề tự do" (input topic).
  2. Số câu (1..50), độ khó (EASY/MEDIUM/HARD).
  3. Submit → jobId → poll → PREVIEW: list câu hỏi
     `{question|prompt, options[], correct|answer_key, explanation}` (schema result
     EXAM_GEN: `{questions:[{id,type,prompt,options,answer_key,rubric,skill}], model}` —
     map `prompt→question`, `answer_key→correct`); mỗi câu: sửa inline + checkbox
     giữ/bỏ; hiển thị `model` đã sinh.
  4. "Thêm N câu vào quiz" → map về shape question của quiz editor store hiện tại
     (đọc `features/academic/quiz/store` khi implement — giữ nguyên shape, KHÔNG đổi
     store) → append vào state editor. Giảng viên lưu quiz bằng nút lưu sẵn có.
- Ownership phía BE tự gác (lessonId phải là lesson giảng viên dạy) → lỗi 403 hiển thị
  message rõ.

## 3. Độ khó quiz

- Action "Phân tích độ khó (AI)" trong trang quiz (dropdown ⋯ hoặc toolbar).
- Submit `{quizId}` → poll → panel/drawer kết quả: render result jsonb
  (generic `{output, model}` hoặc structured nếu BE trả — render markdown + model note).

## 4. Trợ lý mentor (trang mới)

Route academic console `.../ai-assist` (side-nav mục "Trợ lý AI"):
- Tab **Student brief**: select course (API course list admin sẵn có) → select học viên
  (API enrollment/user của console) → gọi `student-brief` → render brief (markdown).
- Tab **Feedback assist**: textarea nội dung bài/ngữ cảnh + yêu cầu → nháp phản hồi
  (copy button — mentor-in-the-loop: KHÔNG auto-gửi cho học viên).
- Tab **Cohort insight**: select course → tổng quan lớp.
- Mỗi tab: loading + error envelope + hiển thị model nếu response có.

## 5. Phân quyền UI

- Menu "Trợ lý AI" + nút sinh đề chỉ hiện khi phiên có permission `ai.teacher.use`
  (đọc từ cơ chế permission gate sẵn có của console — mirror cách các mục academic
  khác gate theo permission leaf).
- Grade (`ai.teacher.grade`) v1 KHÔNG bày UI riêng (chấm đã có luồng ở course
  submission) — chỉ client function để tái dùng sau.

## 6. Seed data

Admin FE không DB. Dữ liệu demo đến từ seed BE lane AI: `V214` (3 interview template
mẫu — không dùng ở màn này nhưng cùng console), model_configs OPENROUTER `V213` để
exam-generate chạy thật, cùng course/lesson/quiz sẵn có trên apitest. Điều kiện test:
đăng nhập account LECTURER (bộ account test 4 role) → mở quiz của course mình dạy →
sinh đề từ 1 lesson có bài đọc. Fixtures unit test: JSON result EXAM_GEN + difficulty
mẫu đặt tại `ai-assist/__fixtures__/`.

## 7. AI soạn thảo document lesson (LessonContentEditor)

Bối cảnh code (đã đọc 2026-07-16): `LessonContentEditor.tsx` = antd 2 cột
(`Input.TextArea` ref `textareaRef` — có sẵn `selectionStart` dùng cho marker cắt preview
— | `MarkdownPreview`), state `body` đi qua `handleChange` (đồng bộ
`useLessonDraftStore` — draft store LOCAL, không phải save) và CHỈ save qua nút Lưu
(`useUpdateLessonContent`). Chỉ render editor khi `lessonType === "DOCUMENT"`.

### 7.1 Kênh BE — quyết định tái dùng (đã đọc `ai/web/` của FTES-AOS-Backend)

So sánh 2 đường:
- `/ai/teacher/*` (JobController/TeacherController): job async → poll — hợp sinh đề
  (payload JSON to), KHÔNG hợp soạn thảo (muốn thấy chữ chảy vào preview).
- `/ai/sessions` + `/ai/sessions/{id}/messages` (SessionController): SSE
  delta/done/error + heartbeat ping 15s + session lock + quota — stream tốt sẵn.

**Chốt: reuse `/ai/sessions` với feature `LESSON_SUGGESTION`** (đã có trong enum
`AiFeature` + model_configs từ V110 — KHÔNG cần feature `TEACHER_DRAFT` mới, KHÔNG
endpoint mới). Delta BE cần thiết nằm ở change BE `ai-tutor-grounding-and-model-pick` §7:
map authority `LESSON_SUGGESTION → ai.teacher.use` + seed `V248` (OPENROUTER + limits
soạn thảo, dải AI V245–259). Session tạo với `contextRef: {lessonId}` → grounding BE tự
ghép metadata (tiêu đề lesson/section/course + mô tả course) + body hiện có của bài —
FE không phải nhồi ngữ cảnh, chỉ gửi INTENT.

### 7.2 SSE client (`shared/api/sse.ts` — mới, dùng chung)

`EventSource` không POST được + không gắn Bearer → dùng `fetch` stream:

```ts
streamSse(path: string, body: unknown, handlers: {
  onDelta(text: string): void; onDone(data: {messageId, tokenOutput, modelUsed?}): void;
  onError(code: string): void;
}, signal?: AbortSignal): Promise<void>
```

- POST `${API_ROOT}/api/v1${path}`, header `Authorization: Bearer` (token từ
  `useAuthStore` — cùng nguồn interceptor axios), `Accept: text/event-stream`.
- Parse buffer theo spec SSE: tách `\n\n`, đọc `event:`/`data:`; bỏ qua dòng comment
  `:` (heartbeat ping của BE). Map event `delta`→onDelta, `done`→onDone (JSON),
  `error`→onError (`{code}`).
- `AbortController` cho nút Dừng; abort giữa chừng = bỏ lượt (BE tự release lock khi
  stream đóng).
- 401 → thử refresh 1 lần qua flow refresh sẵn có rồi retry (mirror interceptor).

Hook `useAiDraftStream(lessonId)` (`ai-assist/hooks`): quản `sessionId` (lazy-create
lần dùng đầu — `POST /ai/sessions {feature:"LESSON_SUGGESTION", contextRef:{lessonId}}`,
envelope 200), `streaming: boolean`, `output: string` (accumulate delta), `send(prompt)`,
`stop()`, `error`. Đổi lesson → reset session (session cũ để nguyên, không archive).

### 7.3 UI — `LessonAiDraftPanel` (mount trong LessonContentEditor)

- Nút "Trợ lý AI" (icon robot) trên toolbar editor (cạnh nút chèn marker) — chỉ hiện khi
  phiên có permission `ai.teacher.use` (cùng gate §5). Bấm → panel collapse mở DƯỚI
  toolbar (Card full-width, không modal — giữ textarea nhìn thấy để bôi đen).
- Panel gồm: 4 quick-action + ô prompt tự do + vùng PREVIEW stream + hàng nút chèn.
  Quick-action build prompt intent (KHÔNG nhồi lại metadata — BE grounding đã có):
  1. **Sinh dàn ý** — "Lập dàn ý chi tiết (heading markdown) cho bài học này dựa trên
     tiêu đề và mô tả khóa học."
  2. **Viết nháp section** — kèm select heading lấy từ parse `#`/`##` của `body` hiện
     tại (regex đơn giản), prompt "Viết nội dung cho section «{heading}» theo dàn ý
     hiện có."
  3. **Sửa đoạn bôi đen** — enable khi `selectionStart < selectionEnd` trên textarea
     (đọc qua `textareaRef`, lưu snapshot `{start, end, text}` lúc bấm — focus chuyển
     vào panel không làm mất); 3 biến thể: Viết lại / Cải thiện / Giải thích thêm —
     prompt kèm nguyên văn đoạn (đoạn > 4000 chars → cắt + báo).
  4. **Chèn ví dụ + câu hỏi ôn tập** — "Viết phần ví dụ minh họa và 3-5 câu hỏi ôn tập
     (kèm đáp án gọn) cho phần cuối bài."
- **Stream vào PREVIEW của panel** (monospace, auto-scroll), KHÔNG ghi thẳng editor khi
  đang stream. Nút Dừng khi `streaming`.
- **Chèn có kiểm soát** (chỉ enable sau `done`):
  - "Chèn tại con trỏ" → splice `output` vào `body` tại caret snapshot → `handleChange`.
  - "Thay đoạn bôi đen" (chỉ khi có selection snapshot) → replace `[start, end)`.
  - "Hoàn tác chèn" → khôi phục snapshot `body` TRƯỚC lần chèn gần nhất (giữ 1 mức,
    disable sau khi dùng/khi user gõ tiếp).
  - Mọi ghi đi qua `handleChange` (state + draft store local) — **KHÔNG gọi
    `useUpdateLessonContent`**: không có request save nào tự động, nút Lưu sẵn có là
    đường save duy nhất (badge "chưa lưu" hiện như thường).
- **Model picker** (optional, BE `ai-chat-model-pick`): select model từ
  `GET /api/v1/ai/models`, gửi `model` trong body message; ẩn nếu catalog lỗi.
- **Lỗi**: map code SSE error → message rõ (`AI_QUOTA_EXCEEDED` hết lượt hôm nay,
  `AI_SESSION_BUSY` đang có lượt chạy, `AI_PROVIDER_UNAVAILABLE` thử lại,
  `AI_FEATURE_FORBIDDEN` thiếu quyền); lỗi KHÔNG đụng nội dung editor.
- Editor `lessonType !== "DOCUMENT"` → không render nút (editor vốn không render).

### 7.4 Test

Fixtures: transcript SSE mẫu (chuỗi delta + done) đặt `ai-assist/__fixtures__/sse/` cho
unit test parser. e2e tay (apitest, account LECTURER): mở lesson DOCUMENT course mình
dạy → sinh dàn ý → chèn tại con trỏ → bôi đen 1 đoạn → cải thiện → thay thế → hoàn tác
→ bấm Lưu của editor.
