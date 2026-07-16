# admin-course-challenge-bank

## ADDED Requirements

### Requirement: Course detail exposes a challenge bank tab

`CourseDetailPage` SHALL render an additional tab "Kho thử thách" listing every challenge
of the course's bank from `GET /api/v1/admin/challenges?courseId=` (all statuses,
including DRAFT and unattached ones) with columns: title (+slug), type, status,
visibility, attached lesson (name resolved from the course tree already loaded by
`useCourse`), and actions. The tab SHALL be permission-driven: rendered only when the
caller holds `admin.challenge.manage` OR `admin.course.manage` (no role hardcoding).

#### Scenario: Bank listed per course

- **WHEN** an admin with `admin.course.manage` opens course `seed-course-c-basic` detail
  and selects the "Kho thử thách" tab
- **THEN** the table SHALL show the course's bank challenges (seed: 4 rows) with type,
  status, visibility and attached-lesson columns

#### Scenario: Tab hidden without permission

- **WHEN** a caller holds neither `admin.challenge.manage` nor `admin.course.manage`
- **THEN** the "Kho thử thách" tab SHALL NOT be rendered

### Requirement: Filter by type and visibility

The bank table SHALL provide client-side filters for challenge `type` (all types) and
`visibility` (Tất cả / Trong kho / Public Workplace), and an empty state with a create
button when the bank is empty.

#### Scenario: Filter to public-only

- **WHEN** the admin selects visibility filter "Public Workplace"
- **THEN** the table SHALL show only rows with `visibility = WORKSPACE_PUBLIC`

### Requirement: Create and edit through the shared ChallengeWizardDrawer

Creating/editing a bank challenge SHALL reuse `ChallengeWizardDrawer` and the exercises
API layer from change `admin-lesson-exercise-authoring` — the wizard SHALL NOT be
duplicated. From the bank tab the wizard SHALL receive `courseId` (creation posts
`courseId` so the challenge belongs to the bank immediately), its attach step SHALL offer
lessons of the CURRENT course only (section → lesson picker from the course tree) and
SHALL be skippable (a bank challenge may stay unattached), and its mutations SHALL
invalidate the bank query key so the table refreshes.

#### Scenario: Create a bank challenge without attaching

- **WHEN** the admin creates a challenge from the bank tab and skips the attach step
- **THEN** the challenge SHALL appear in the bank table with no attached lesson
- **AND** the create request SHALL carry the course's `courseId`

#### Scenario: Attach step scoped to the course

- **WHEN** the admin reaches the wizard attach step from the bank tab
- **THEN** the lesson picker SHALL only offer lessons of the current course

### Requirement: Visibility toggle with confirm

Each row SHALL offer "Public lên Workplace" (only enabled when status is
PUBLISHED/RUNNING and visibility is `COURSE_ONLY`; disabled with an explanatory tooltip
otherwise) and "Thu về kho" (when `WORKSPACE_PUBLIC`), both behind a confirm dialog, both
calling `POST /api/v1/admin/challenges/{id}/visibility` and refreshing the bank list. The
toggle actions SHALL be enabled only for callers holding `admin.challenge.manage`
(list-only view for `admin.course.manage`). BE errors (e.g. `CHALLENGE_INVALID_STATE`)
SHALL surface as readable messages.

#### Scenario: Publish to Workplace with confirm

- **WHEN** the admin clicks "Public lên Workplace" on a PUBLISHED `COURSE_ONLY` challenge
  and confirms
- **THEN** the FE SHALL POST `{visibility: "WORKSPACE_PUBLIC"}` and the row SHALL show
  the "Public Workplace" tag after refresh

#### Scenario: Draft cannot be published to Workplace

- **WHEN** a bank challenge has status DRAFT
- **THEN** the "Public lên Workplace" button SHALL be disabled with a tooltip explaining
  only active challenges can go public

#### Scenario: Pull back with confirm

- **WHEN** the admin clicks "Thu về kho" on a `WORKSPACE_PUBLIC` challenge and confirms
- **THEN** the FE SHALL POST `{visibility: "COURSE_ONLY"}` and the row tag SHALL revert
  to "Trong kho"

#### Scenario: Course-manage-only caller sees read-only toggles

- **WHEN** the caller holds `admin.course.manage` but not `admin.challenge.manage`
- **THEN** the visibility buttons SHALL be disabled
