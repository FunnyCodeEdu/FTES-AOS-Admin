# admin-course-skill-exp

## ADDED Requirements

### Requirement: Skill EXP tab on the course detail page

The course detail page SHALL offer a "EXP kỹ năng" tab, gated by the same `course.manage`
permission leaf that gates the neighbouring course-management tabs, seedable from `?tab=skill-exp`
like every other tab on that page.

#### Scenario: Course manager opens the tab

- **WHEN** a user holding `course.manage` opens a course detail page
- **THEN** a "EXP kỹ năng" tab is listed alongside Tổng quan / Giá & gói / Bài học / Học thử / Học viên
- **AND** opening it shows the course's saved skill EXP allocation

#### Scenario: User without course.manage

- **WHEN** a user lacking `course.manage` opens the same course detail page
- **THEN** the "EXP kỹ năng" tab is not rendered at all

#### Scenario: Deep link into the tab

- **WHEN** the page is opened with `?tab=skill-exp`
- **THEN** the skill EXP tab is the active tab on first paint

### Requirement: AI proposes the allocation from a syllabus

The tab SHALL let the manager paste the course syllabus and submit it to
`POST /api/v1/admin/courses/{courseId}/skill-exp/evaluate`, showing that the evaluation is running
until it returns, and SHALL load the returned per-category EXP and rationale into the editable
table as a proposal the human still has to accept.

#### Scenario: Syllabus evaluated

- **WHEN** the manager pastes a syllabus and triggers "Để AI chấm"
- **THEN** the syllabus text is sent to the evaluate endpoint for this course
- **AND** while the request is in flight a progress indicator and a disabled submit button are shown
- **AND** on success the table is filled with one row per category the AI awarded, each carrying its EXP and rationale

#### Scenario: Empty syllabus is refused client-side

- **WHEN** the manager triggers the evaluation with a blank or whitespace-only syllabus
- **THEN** no request is sent and the tab explains that a syllabus is required

#### Scenario: Re-evaluating over an existing allocation

- **WHEN** the manager triggers the evaluation while the table already holds rows
- **THEN** a confirmation states that the AI result replaces the current rows, including unsaved edits
- **AND** the evaluation only runs after the manager confirms

#### Scenario: The human still decides

- **WHEN** the AI proposal has loaded
- **THEN** the tab states that AI only proposes and the number takes effect only after the human saves
- **AND** the rows remain editable and removable before saving

### Requirement: Manual correction of the allocation

The tab SHALL let the manager edit the EXP amount and rationale of any row, add a row for any
category in the catalogue that is not already used, and remove a row, then persist the whole set
with `PUT /api/v1/admin/courses/{courseId}/skill-exp` as a replace-set.

#### Scenario: Manager corrects a number

- **WHEN** the manager changes a row's EXP and saves
- **THEN** the full set of rows is sent as one replace-set payload of `{categorySlug, exp, rationale}`
- **AND** the saved allocation is re-read so the table reflects what the server stored

#### Scenario: Manager adds a category the AI missed

- **WHEN** the manager adds a row
- **THEN** only catalogue categories not already present in the table are offered
- **AND** the same category can never appear twice in the saved payload

#### Scenario: Invalid rows block the save

- **WHEN** any row has no category selected, an EXP outside the range the backend accepts, or a category absent from the catalogue
- **THEN** the save is blocked with a message naming the problem and no request is sent
- **AND** the same rules the backend enforces are applied client-side, so a valid-looking save is never rejected by the server for those reasons

#### Scenario: Nothing to save

- **WHEN** the table matches what is already stored
- **THEN** the save action is disabled

#### Scenario: Stored allocation could not be read

- **WHEN** reading the course's stored allocation fails
- **THEN** the tab says so and disables every write action, including the AI evaluation
- **AND** no replace-set can be sent over an allocation the author never saw

### Requirement: The milestone payout rule is visible

The tab SHALL state that the configured number is the FULL award for finishing the course and
SHALL show, per row, how that amount is paid out at the 30/50/80/100% progress milestones, matching
the backend's floor-per-step-with-remainder-at-100% split so the displayed shares always add up to
the configured amount.

#### Scenario: Author sees the split

- **WHEN** a row holds a positive EXP amount
- **THEN** the tab shows the increment credited at each of 30%, 50%, 80% and 100%
- **AND** those four increments sum to exactly the configured amount

#### Scenario: Amount that does not divide evenly

- **WHEN** the amount does not divide evenly across the milestone shares
- **THEN** each intermediate milestone shows its floored share
- **AND** the 100% milestone shows the remainder so nothing is lost to rounding

### Requirement: A failed evaluation never destroys the stored allocation

When the evaluation request fails, the tab SHALL show why it failed and SHALL leave the rows
currently in the table untouched, so a previously saved or manually edited allocation is never
blanked by a failed AI call.

#### Scenario: Evaluation service unreachable

- **WHEN** the evaluate request fails with a server or network error
- **THEN** the tab shows an error naming the reason
- **AND** every row already in the table is still present and still editable
- **AND** no write is sent to the allocation endpoint

#### Scenario: The AI invented categories or absurd amounts

- **WHEN** the evaluation reports categories it discarded or amounts it clamped to the allowed range
- **THEN** the tab shows those discarded slugs and clamped amounts to the manager
- **AND** the manager is told to add the missing category by hand or re-check the clamped numbers

#### Scenario: Evaluation returns nothing usable

- **WHEN** the evaluate request succeeds but carries no usable category rows
- **THEN** the tab says the AI returned no usable allocation
- **AND** the existing rows are kept rather than replaced with an empty set

### Requirement: Skill category catalogue drives the choices

The tab SHALL read the skill category catalogue from `GET /api/v1/career/skill-categories` and use
it to label rows and to offer categories when adding one, and SHALL still render a stored row whose
category is missing from the catalogue rather than dropping it silently.

#### Scenario: Catalogue labels the rows

- **WHEN** the catalogue has loaded
- **THEN** each row shows its category's human label instead of the bare slug

#### Scenario: Stored row outside the catalogue

- **WHEN** a stored row references a category slug absent from the catalogue
- **THEN** the row is still listed and flagged as unknown rather than being discarded
