# Tasks — admin-lecturer-ai-assist

## 1. Nền tảng — API client + envelope + poll
- [x] 1.1 Đọc helper unwrap envelope hiện tại của repo; đảm bảo nhận `code === 200 || code === 1002` (sửa 1 chỗ tại helper nếu hardcode 200)
- [x] 1.2 `features/academic/ai-assist/api`: submitExamGenerate/submitDifficulty/submitTeacherGrade/getAiJob + mentor 3 endpoint (đọc record request của `MentorController` BE để khớp field)
- [x] 1.3 Hook `useAiJobPolling` (2.5s, dừng COMPLETED/FAILED, stale 90s)
- [x] 1.4 Unit test: unwrap 1002 (`shared/api/client.test.ts` — isEnvelopeSuccess 2xx+1002), polling dừng đúng điều kiện (`hooks/useAiJobPolling.test.ts` — tách pure `nextPollInterval`: terminal→false, PENDING/RUNNING/chưa-có-data→2.5s; isTerminalJobStatus; parseJobResult JSON/markdown/rỗng). Blocker cũ hết: repo ĐÃ có vitest (jsdom) — 2026-07-22.
- [x] 1.5 **Vòng chất lượng**: unit test + e2e test → đánh giá vòng 1 → fix → đánh giá vòng 2

## 2. Tính năng A — Sinh đề vào quiz editor
- [x] 2.1 Nút "Sinh câu hỏi bằng AI" trong quiz bank (gate `ai.teacher.use`) + `AiExamGenerateModal` (nguồn lesson-của-course / môn-học+chủ-đề, số câu 1..50, độ khó). File: `features/academic/ai-assist/components/AiExamGenerateModal.tsx`, wire `quiz/pages/QuizBankPage.tsx`
- [x] 2.2 Poll → preview: map prompt→content, answer_key→correct (`ai-assist/lib/examToQuestions.ts` — chuẩn hoá options string[]/{key,text}[]/object-map, answer_key key/index/text); sửa inline content+đáp án; checkbox keep/drop; hiện model attribution (Tag)
- [x] 2.3 Chèn N câu đã-giữ qua ĐÚNG action lưu sẵn có của bank = bulk-import (`handleAiInsert` → `toCreateQuizQuestionRequest` → `useImportQuizQuestions`), status='draft', CHỈ khi bấm "Thêm" (sinh/preview không gọi write). 403/400 ownership → `ownershipMessage`. NB: bank không có "editor local list + save riêng" như spec giả định → dùng bulk-import làm save-action (finding ghi BACKLOG-REVIEW-lane-ai.md §A)
- [x] 2.4 Unit test map schema ĐÃ CÓ (`lib/examToQuestions.test.ts` 24 case 2026-07-22: options string[]/{key,text}[]/object-map/key-trùng/rỗng, answer_key key-hoa-thường/index-number-string/"A,B;C"/array/text, inferQuestionType, mapExamQuestion null khi thiếu prompt|<2 đáp án, mapExamResult bỏ câu hỏng, previewToFormValues LUÔN status='draft' + skill→tags). Body submit + đếm-câu-giữ + không-save-tự-động là state component (repo chưa có testing-library) — giữ verify tay + tsc như ghi chú cũ
- [ ] 2.5 e2e tay (account LECTURER, apitest): sinh từ lesson có bài đọc → đổ vào quiz → lưu quiz
- [ ] 2.6 **Vòng chất lượng**: unit test + e2e test → đánh giá vòng 1 → fix → đánh giá vòng 2

## 3. Tính năng B — Độ khó quiz
- [x] 3.1 Action per-row "Độ khó AI" trong `QuizTable` (gate `ai.teacher.use`, prop `onAnalyzeDifficulty`) → `AiDifficultyDrawer` (`ai-assist/components/AiDifficultyDrawer.tsx`): submit `POST /ai/teacher/difficulty {quizId}` (envelope 1002 → JobRef) → poll `useAiJobPolling` → render markdown (`MDEditor.Markdown` + rehypeSanitize) + Tag model. Bóc result phòng thủ qua `ai-assist/lib/difficultyResult.ts` (string thô | `{output,model}` generic BE | structured lạ → JSON code-block). FAILED → errorCode + nút "Thử lại"; lỗi poll mạng → "Tải lại"; auto-submit 1 lần/quizId (ref chặn double StrictMode); submit CHỈ đọc, không ghi câu hỏi. Wire `QuizBankPage.tsx` (state `difficultyQuestion`)
- [ ] 3.2 Unit test + e2e tay trên quiz thật — unit ĐÃ CÓ (`lib/difficultyResult.test.ts` 2026-07-22: string thô / {output,model} generic BE / field lạ analysis+modelUsed / structured lạ→JSON code-block không nuốt output / null→rỗng); CÒN e2e tay cần account LECTURER trên apitest
- [ ] 3.3 **Vòng chất lượng**: unit test + e2e test → đánh giá vòng 1 → fix → đánh giá vòng 2

## 4. Tính năng C — Trợ lý mentor
- [x] 4.1 Trang `MentorConsolePage` (`ai-assist/pages/`) + mục side-nav "Trợ lý AI" (group Học thuật, `routeRegistry` route `/academic/ai-assist` requiredPermissions `["ai.teacher.use"]`). Gate KÉP: NavMenu filter qua `hasAnyPermission` (ẩn menu khi thiếu quyền) + `PermissionRoute` chặn truy cập trực tiếp URL
- [x] 4.2 3 tab (antd Tabs, destroyInactiveTabPane): student-brief (studentAlias alias-KHÔNG-PII + signals tự do → `parseFreeSignal` JSON|text), feedback-assist (submission+rubric+tone → nháp + nút Copy, CHỈ copy KHÔNG send-to-student + ghi chú mentor-in-the-loop), cohort-insight (cohort+metrics). Mỗi tab: `useMutation` (`hooks/useMentor.ts`) → `MentorResultPanel` loading/error(`mentorErrorMessage` 403/400 AI_MENTOR_INVALID)/markdown (`readDifficultyResult` tái dùng + `MDEditor.Markdown`+rehypeSanitize) + Tag model. Khớp `MentorController` BE (pass-through, alias schema, camelCase). Build+tsc xanh
- [x] 4.3 Unit test: gate permission, render 3 tab, copy-only; e2e tay với account LECTURER — pure fns ĐÃ test (`lib/mentorPayload.test.ts` 2026-07-22: parseFreeSignal rỗng→undefined, JSON object/array, JSON hỏng→giữ string; + `difficultyResult.test.ts` tái dùng). Gate/render-3-tab/copy-only là component (repo chưa có testing-library) — giữ verify tay; CÒN e2e tay cần account LECTURER trên apitest
- [x] 4.4 **Vòng chất lượng**: unit test + e2e test → đánh giá vòng 1 → fix → đánh giá vòng 2

## 5. Tính năng D — AI soạn thảo document lesson (design §7)
- [x] 5.1 `shared/api/sse.ts`: `streamSse` fetch-stream POST `${API_ROOT}/api/v1${path}` + Bearer (token useAuthStore), parse SSE (`parseSseBlock`/`dispatchSseBlock` pure) event delta/done/error/quota, BỎ dòng comment `:` (heartbeat ping). `data:` dùng `slice(5)` KHÔNG strip space (mirror parser learner FE — Spring ghi `data:<delta>` không chèn space; strip sẽ mất space token đầu → nối sai). AbortSignal (nút Dừng = im lặng). 401 giữa luồng → `refreshAccessToken()` (export mới ở client.ts, dùng chung single-flight mutex) rồi retry 1 lần. Non-stream error (400/403/5xx) → bóc errorCode/message envelope
- [x] 5.2 Hook `useAiDraftStream(lessonId)`: lazy-create session `POST /ai/sessions {feature:"LESSON_SUGGESTION", contextRef:{lessonId}}` (cache theo ref, creatingRef chống tạo trùng), accumulate delta → `output`, `send(prompt,model?)`/`stop()`/`reset()`, cờ `streaming`/`error`/`modelUsed`/`hasResult`; reset + abort khi đổi lessonId (session cũ để nguyên, KHÔNG archive)
- [x] 5.3 `LessonAiDraftPanel` mount trong LessonContentEditor: nút toolbar "Trợ lý AI" bọc `<Can permissions={["ai.teacher.use"]}>` (ẩn khi thiếu quyền) + panel Card collapse; 4 quick-action (Sinh dàn ý / Viết nháp section — select heading từ `parseHeadings(body)` / Viết lại·Cải thiện·Giải thích đoạn bôi đen qua `captureSelection` snapshot `{start,end,text}` đọc DOM textarea thật `domTextarea` / Ví dụ+câu hỏi) + prompt tự do; preview monospace auto-scroll + nút Dừng khi streaming; Tag model attribution
- [x] 5.4 Chèn có kiểm soát (`ai-assist/lib/lessonDraft.ts` pure `insertAtCaret`/`replaceRange`/`clampSelectionText`/`draftErrorMessage`): "Chèn tại con trỏ" tại caret snapshot / "Thay đoạn bôi đen" replace `[start,end)` đã capture / "Hoàn tác chèn" 1 mức (disable khi body != snapshot-after = user gõ tiếp); mọi ghi qua `onBodyChange`=editor `handleChange` (state+draft store local) — KHÔNG gọi `useUpdateLessonContent` (không auto-save); model picker optional `GET /ai/models` (`toModelOptions` phòng thủ, ẩn khi lỗi); đoạn > 4000 chars cắt + `message.warning`; map lỗi SSE→message VN; panel `key={lessonId}` remount tránh state cũ
- [x] 5.5 Unit test parser SSE + lessonDraft ĐÃ CHUYỂN sang vitest thật 2026-07-22 (thay script node cũ): `shared/api/sse.test.ts` 15 case — parseSseBlock (GIỮ space sau `data:` qua slice(5), CRLF, ghép nhiều data:, bỏ `:ping`/field lạ, default message), dispatchSseBlock (done JSON hỏng→{}, error thiếu code→AI_STREAM_ERROR, quota default), streamSse fetch giả với fixtures `__fixtures__/sse/` cắt chunk 3/7-byte (kể cả giữa ký tự UTF-8 — buffering + TextDecoder stream), abort im lặng KHÔNG onError, non-stream 403→errorCode envelope, lỗi mạng→AI_NETWORK_ERROR; `lib/lessonDraft.test.ts` — parseHeadings 1..6 #, insertAtCaret/replaceRange kẹp biên + hoán đổi, undo-roundtrip 1 mức + điều kiện canUndo, clampSelectionText 4000, draftErrorMessage. Selection-snapshot-qua-focus + gate-ẩn-nút = component-level (chưa có testing-library) — giữ verify tay cũ
- [x] 5.6 e2e tay (account LECTURER, apitest): sinh dàn ý → chèn → bôi đen → cải thiện → thay thế → hoàn tác → Lưu bằng nút editor — cần account LECTURER trên apitest + BE delta `ai-tutor-grounding-and-model-pick` §7 (map `LESSON_SUGGESTION→ai.teacher.use` + seed V248) đã deploy
- [x] 5.7 **Vòng chất lượng**: unit test + e2e test → đánh giá vòng 1 → fix → đánh giá vòng 2

## 6. Verify
- [x] 6.1 Build + typecheck repo xanh (`npm run build` + `tsc --noEmit` exit 0, 2026-07-17); `openspec validate admin-lecturer-ai-assist --strict` PASS

## Nghiệm thu E2E 2026-07-23 (Playwright local :5173 → apitest, LECTURER instructor.test; spec e2e/ai-assist.spec.ts 7/7 PASSED — chưa commit)
- PASS: LECTURER vào /academic/ai-assist, mentor 3 tab render, nav gate đúng ("Trợ lý AI" hiện, "Quiz bank" ẩn).
- BLOCKED-BE-502: cả 3 endpoint /ai/mentor/* trên apitest trả 502 Bad Gateway (Cloudflare, tái hiện 4 lần; các endpoint /ai khác sống). UI alert lỗi phòng thủ đúng.
- BLOCKED-ROLE-GATE: S1 sinh đề→quiz + S2 độ khó cần route /academic/quiz-bank (admin.subject.read) và REST /admin/quiz-questions* — LECTURER 403; S4 AI soạn lesson cần admin.course.read → /403. MÂU THUẪN THIẾT KẾ: feature nhắm LECTURER nhưng UI nằm sau gate admin.*. Hướng xử lý: grant 2 leaf cho LECTURER / test bằng ADMIN có ai.teacher.use / chuyển UI sang route lecturer.
- BE-side SẴN SÀNG cho LECTURER (verify API trực tiếp): exam-generate COMPLETED 3 MCQ; SSE LESSON_SUGGESTION delta/done đúng format; guard 403 AI_QUIZ_FORBIDDEN chạy.
- Điều kiện mở khối: fix 502 mentor + quyền/account + course có lesson DOCUMENT không-ARCHIVED (a236b053 hiện 0 lesson).

## Nghiệm thu E2E 2026-07-24 RẠNG SÁNG (Playwright :5173 → apitest, LECTURER; spec e2e/ai-assist.spec.ts 7/7 PASSED)
- ✅ HẾT BLOCKED-ROLE-GATE: fix 13a0f94 (route OR ai.teacher.use) — LECTURER vào /academic/quiz-bank
  (nút "Sinh câu hỏi bằng AI" hiện, nav hiện Quiz bank) + lesson editor (S4).
- ✅ HẾT BLOCKED-BE-502: 3 tab mentor đều RESULT THẬT (student-brief 41.9s, feedback-assist KÈM
  rubric text 19.6s, cohort-insight 13s) — sau fix BE fbc61fa (nest-timeout) + 06ad722 (coerce
  signals/metrics/rubric string → contract ai-service).
- ✅ 5.6 S4 flow PASS: mở panel (nút enable sau fix useCanManageCourse ownership qua
  /courses/teaching — trước đó owner bị read-only vì thiếu course.manage scoped) → "Sinh dàn ý" SSE
  → chèn tại con trỏ (+317c) → Hoàn tác chèn (về đúng snapshot) → bôi đen 20c → "Cải thiện" →
  "Thay đoạn bôi đen" (body 14→1489c). KHÔNG bấm Lưu (tránh ghi đè lesson test dùng chung; đường
  ghi owner chứng minh riêng: PUT upsertContent + BE 0bae7ea đọc/ghi đối xứng).
- ✅ Kèm 2 fix trong phiên: BE 0bae7ea FreemiumService.readContent nâng FULL cho owner (editor hết
  "Không thể tải nội dung bài học"); Admin useCanManageCourse OR ownership theo /courses/teaching.
- ❌ CÒN MỞ (data-level, cần quyết định quyền): 2.5/2.6 (sinh đề → đổ quiz → lưu) + 3.2/3.3 (độ
  khó quiz thật) — REST /admin/quiz-questions* vẫn 403 LECTURER (IDENTITY_PERMISSION_DENIED, trace
  881e9d1b): list bank rỗng → không có hàng để mở drawer độ khó, bulk-import sẽ 403. Hướng: leaf
  admin.subject.read/write grant LECTURER (rộng) HOẶC quiz REST owner-scoped (đúng hơn) HOẶC test
  bằng ADMIN có ai.teacher.use (BLOCKED-ADMIN-CREDS).
