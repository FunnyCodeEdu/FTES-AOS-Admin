# video-preview-admin-toggle

## ADDED Requirements

### Requirement: Video trial is configured by percent, per lesson

The per-lesson trial control (`LessonTrialConfig`) SHALL let a content manager enable preview for a
VIDEO lesson using `preview_percent` — the same unit as DOCUMENT — via
`PATCH /api/v1/lessons/{id}/preview`. Enabling SHALL send `previewPercent > 0`; disabling SHALL send
`previewPercent = 0` (never `null`). The control SHALL NOT send `preview_seconds` for a video trial
and SHALL NOT write the lesson `free` flag. The control SHALL be shown for VIDEO lessons under the
same content-manage permission gate as DOCUMENT lessons.

#### Scenario: Enabling a video trial writes percent

- **WHEN** a manager turns on "Cho học thử" for a VIDEO lesson and sets 20%
- **THEN** only `previewPercent=20` SHALL be sent, and no request SHALL set `previewSeconds` or `free`

#### Scenario: Disabling a video trial writes explicit zero

- **WHEN** a manager turns off the trial for a VIDEO lesson and saves
- **THEN** `previewPercent=0` SHALL be sent and the save SHALL succeed (no 400)

#### Scenario: Video preview window shown as a time hint

- **WHEN** a manager sets 20% for a VIDEO lesson whose video duration is known
- **THEN** the control SHALL show the approximate window `≈ mm:ss` (percent × duration)

### Requirement: Video trial requires a processed video

The trial control SHALL prevent enabling or saving a video trial while the lesson's video is still
being processed, and SHALL surface that the video is not ready. This mirrors the backend, which
rejects a non-zero preview percent on a VIDEO whose video is not yet READY.

#### Scenario: Trial blocked while video is processing

- **WHEN** a manager opens the trial control for a VIDEO lesson whose video status is not "ready"
- **THEN** the enable toggle and save SHALL be disabled
- **AND** a hint SHALL indicate the video is not yet ready

### Requirement: Lesson list shows the video trial in percent

The lesson list "Thời gian học thử" column SHALL express the effective VIDEO trial in percent (like
DOCUMENT), marking whether the value is inherited or overridden, showing "Không học thử" when the
lesson has an explicit zero, and additionally showing the derived time window `≈ mm:ss` for video.
Its inline editor SHALL write `preview_percent` for video and SHALL disable editing while the video
is being processed.

#### Scenario: Video lesson trial shown in percent

- **WHEN** a VIDEO lesson overrides a 20% trial and its video is 10 minutes long
- **THEN** its row SHALL show a percent-based tag such as "Học thử 20% (≈ 02:00) · ghi đè"

#### Scenario: Inline video trial edit persists percent

- **WHEN** a manager toggles the inline trial on for a READY VIDEO lesson and enters 15%
- **THEN** `previewPercent=15` SHALL be sent via `PATCH /api/v1/lessons/{id}/preview`
