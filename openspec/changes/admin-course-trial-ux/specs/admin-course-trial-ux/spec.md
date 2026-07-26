# admin-course-trial-ux

## ADDED Requirements

### Requirement: Trial toggle never grants full access

The per-lesson trial control (`LessonTrialConfig`) SHALL express trial-ability ONLY through
`preview_percent` (DOCUMENT) / `preview_seconds` (VIDEO) via `PATCH /api/v1/lessons/{id}/preview`.
It SHALL NOT write the lesson `free` flag, because `free=true` grants FULL access to every viewer
and leaks the whole lesson past the paywall.

#### Scenario: Enabling a document trial does not free the lesson

- **WHEN** a manager turns on "Cho học thử" for a DOCUMENT lesson and sets 10%
- **THEN** only `previewPercent=10` SHALL be sent, and no request SHALL set `free=true`

### Requirement: Trial OFF uses explicit zero, not null

Turning a per-lesson trial OFF SHALL send `0` for the relevant unit (BE semantics "0 = tắt"),
never `null`. A lone-`null` body is rejected by the backend (both-null validation) and `null`
means "leave unchanged" rather than "clear to inherit", so `null` cannot express OFF.

#### Scenario: Disabling a video trial persists

- **WHEN** a manager turns off the trial for a VIDEO lesson and saves
- **THEN** `previewSeconds=0` SHALL be sent and the save SHALL succeed (no 400)

### Requirement: Course default preview reads and writes the backend keys

`CoursePreviewDefaultConfig` SHALL read the course default percent from the backend key
`defaultPreviewPercent` (the seconds default from `previewSeconds`). Turning the default OFF SHALL
send `{ defaultPreviewPercent: 0, defaultPreviewSeconds: 0 }`. Turning it ON SHALL require at least
one unit greater than zero; a left-blank unit SHALL be omitted from the PATCH.

#### Scenario: Saved default percent re-hydrates

- **WHEN** a manager saves a 30% document default and reopens the screen
- **THEN** the percent input SHALL show 30, not the placeholder

#### Scenario: Document-only course default

- **WHEN** a manager sets only the document percent and leaves seconds blank
- **THEN** the save SHALL succeed, sending the percent and omitting seconds

### Requirement: Pricing tab is always reachable

`CourseDetailPage` SHALL always show the "Giá & gói" tab. `PricingTab` self-adapts: for LEGACY /
no-package courses the package area is read-only while the base-price form stays writable, because
base price is the only sale mechanism for LEGACY courses.

#### Scenario: Editing a LEGACY course base price

- **WHEN** a manager opens a LEGACY course
- **THEN** the "Giá & gói" tab SHALL be visible and the base-price form SHALL be editable

### Requirement: Package free lessons are labelled as full-open, not clamped trials

The package entitlement `freeLessonIds` control SHALL be labelled "Mở miễn phí cho mọi người"
and SHALL NOT offer a per-lesson %/seconds duration editor, because those lessons are granted FULL
access (teaser) for every viewer and the preview clamp never applies to them.

#### Scenario: No duration editor under package free lessons

- **WHEN** a manager selects lessons in a package's "Mở miễn phí cho mọi người" field
- **THEN** no %/seconds duration inputs SHALL appear for those lessons

### Requirement: Lesson list shows trial info for both trial types

The lesson list "Thời gian học thử" column SHALL show the effective trial for VIDEO (seconds) and
DOCUMENT (percent), marking whether the value is inherited or overridden, and "Không học thử" when
the lesson has an explicit zero. The content-status badge SHALL live under the lesson title, not in
this column.

#### Scenario: Document lesson trial shown

- **WHEN** a DOCUMENT lesson inherits a 10% course default
- **THEN** its row SHALL show "Học thử 10% · kế thừa" in the trial column
