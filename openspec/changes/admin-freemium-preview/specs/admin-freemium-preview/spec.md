# admin-freemium-preview

## ADDED Requirements

### Requirement: Markdown editor for document lessons
The admin console SHALL provide a two-pane markdown editor (source + rendered preview) for lessons of type DOCUMENT, saving through `PUT /api/v1/lessons/{id}/content`, visible only to users holding ownership-scoped `course.manage` on the course.

#### Scenario: Mentor authors a document lesson
- **WHEN** a course owner opens a DOCUMENT lesson in the editor, writes markdown, and saves
- **THEN** the content is persisted via the content API
- **AND** the rendered preview matches the learner-side markdown rendering

#### Scenario: Editor blocked on wrong lesson type
- **WHEN** the API rejects the save with `LESSON_TYPE_MISMATCH`
- **THEN** an error toast is shown and the editor is disabled for that lesson

### Requirement: Preview cut-point marker control
The editor SHALL provide an "Insert preview cut-point" action that inserts the marker `<!-- ftes:preview-end -->` at the cursor, SHALL enforce at most one marker in the body (re-inserting moves the existing marker after confirmation), and SHALL render the marker in the preview pane as a labeled divider showing where the free teaser ends.

#### Scenario: Mentor sets the teaser boundary
- **WHEN** the mentor clicks the cut-point action at a position in the document
- **THEN** exactly one marker exists in the body at that position
- **AND** the preview pane shows a "hết phần học thử" divider at that point

### Requirement: Per-lesson video preview duration setting
The lesson editor SHALL, for VIDEO lessons, expose a preview-duration field (mm:ss) that displays the inherited course default as placeholder when unset, supports disabling preview (value 0) and reverting to inheritance (null), validates the value against the video duration when the video is READY, and saves via `PATCH /api/v1/lessons/{id}/preview`.

#### Scenario: Mentor overrides preview length
- **WHEN** the course owner enters 05:00 and saves
- **THEN** the lesson preview is patched to 300 seconds

#### Scenario: Value beyond video duration rejected
- **WHEN** the entered duration exceeds the READY video's length
- **THEN** a validation error is shown and no request mutates the lesson

### Requirement: Course-level preview default setting
The course settings screen SHALL expose a "default video preview duration" field (system default 15:00) saved via `PATCH /api/v1/courses/{id}/preview-default`, with a confirmation step because the change affects all non-overridden lessons.

#### Scenario: Owner changes the course default
- **WHEN** the course owner changes the default to 10:00 and confirms
- **THEN** the course default is patched to 600 seconds

### Requirement: Lesson table surfaces content and preview state
The lesson table SHALL show a warning badge on DOCUMENT lessons whose `hasContent` is false and a tooltip with each lesson's effective preview duration and whether it is inherited or overridden.

#### Scenario: Missing content flagged
- **WHEN** a DOCUMENT lesson has no saved content
- **THEN** its row shows a "chưa có nội dung" warning badge
