# admin-ai-lesson-draft-editor

## ADDED Requirements

### Requirement: Embedded AI drafting assistant inside the lesson content editor
The system SHALL embed an AI drafting assistant DIRECTLY inside `LessonContentEditor` (the existing DOCUMENT markdown editor): a toolbar button, visible only when the session has the `ai.teacher.use` permission, opens a collapsible panel offering four quick actions — (1) generate an outline from the lesson title + course description, (2) draft a section picked from the current body's headings, (3) rewrite / improve / expand a text range the lecturer has selected in the editor textarea, (4) append worked examples + review questions for the end of the lesson — plus a free prompt. The assistant SHALL stream over the existing BE session flow: `POST /api/v1/ai/sessions` with `{feature: "LESSON_SUGGESTION", contextRef: {lessonId}}` (lazy-created on first use) then `POST /ai/sessions/{id}/messages` SSE (fetch-stream client with Bearer auth; heartbeat comments ignored; a Stop action aborts the stream). Lesson/course grounding comes from the BE context builder — the client SHALL send intent prompts only, not re-inlined metadata.

#### Scenario: Sinh dàn ý stream trong editor
- **WHEN** lecturer mở lesson DOCUMENT của course mình dạy và bấm "Sinh dàn ý"
- **THEN** panel hiện chữ stream dần (SSE delta) tới khi done, không rời trang editor

#### Scenario: Không có quyền thì không thấy trợ lý
- **WHEN** phiên đăng nhập không có permission `ai.teacher.use`
- **THEN** nút "Trợ lý AI" không render trong editor

#### Scenario: Dừng giữa chừng
- **WHEN** lecturer bấm Dừng khi đang stream
- **THEN** stream abort, phần chữ đã nhận giữ trong preview, editor không bị ghi gì

### Requirement: Selection-scoped rewrite actions
The rewrite/improve/explain actions SHALL operate on the current selection of the editor textarea: enabled only while a non-empty selection exists, capturing a `{start, end, text}` snapshot at click time (so focus moving into the panel does not lose it) and sending the selected text verbatim in the prompt (over-long selections truncated with a notice).

#### Scenario: Bôi đen rồi cải thiện
- **WHEN** lecturer bôi đen một đoạn trong textarea và bấm "Cải thiện"
- **THEN** prompt gửi đi chứa đúng nguyên văn đoạn đã chọn và preview stream bản viết lại

#### Scenario: Không bôi đen thì action mờ
- **WHEN** không có vùng chọn nào trong textarea
- **THEN** nhóm action theo đoạn bôi đen disabled (các action khác vẫn dùng được)

### Requirement: Controlled insertion with preview, undo, and no auto-save
AI output SHALL land in the editor ONLY through explicit insertion after the stream completes: "Chèn tại con trỏ" splices the preview at the caret snapshot, "Thay đoạn bôi đen" replaces the captured selection range, and a one-step "Hoàn tác chèn" restores the body snapshot taken just before the last insertion. Every write SHALL go through the editor's existing local change path (state + draft store) and the system SHALL NOT trigger any content-save request — the editor's existing Save button remains the only save path, with its unsaved-changes indicator behaving as usual.

#### Scenario: Chèn tại con trỏ rồi hoàn tác
- **WHEN** lecturer chèn kết quả tại con trỏ rồi bấm "Hoàn tác chèn"
- **THEN** body trở về đúng trạng thái trước lần chèn, badge "chưa lưu" phản ánh đúng

#### Scenario: Không có save request tự động
- **WHEN** lecturer sinh nội dung và chèn vào editor
- **THEN** không request update lesson content nào được bắn cho tới khi bấm nút Lưu sẵn có

#### Scenario: Thay thế đúng vùng chọn
- **WHEN** lecturer bấm "Thay đoạn bôi đen" sau khi stream xong
- **THEN** đúng khoảng `[start, end)` đã snapshot được thay bằng kết quả, phần còn lại của body nguyên vẹn

### Requirement: Stream error surfacing without touching the draft
SSE error codes SHALL map to clear localized messages inside the panel (`AI_QUOTA_EXCEEDED` hết lượt, `AI_SESSION_BUSY` lượt trước đang chạy, `AI_PROVIDER_UNAVAILABLE` thử lại, `AI_FEATURE_FORBIDDEN` thiếu quyền) and a failed turn SHALL never modify the editor content or the draft store.

#### Scenario: Hết quota giữa buổi soạn
- **WHEN** BE trả event error `AI_QUOTA_EXCEEDED`
- **THEN** panel hiện thông báo hết lượt trong ngày, nội dung editor + draft giữ nguyên
