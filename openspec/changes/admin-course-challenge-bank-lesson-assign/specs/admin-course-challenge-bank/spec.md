# admin-course-challenge-bank (delta)

## ADDED Requirements

### Requirement: Course challenge bank tab

A course detail page SHALL provide a "Kho challenge" tab (for admins with `challenge.manage` or
`course.manage`, and for the owning instructor) showing, in two columns, the course's chapter/lesson
tree with a per-lesson count of attached challenges, and the full list of the course's challenges
(all statuses). The list SHALL be filterable by status and by "unattached (no lesson)". A reconciliation
banner SHALL warn when assignments remain unmigrated or challenges remain unattached.

#### Scenario: See the bank and per-lesson counts

- **WHEN** a manager opens the "Kho challenge" tab
- **THEN** the left tree lists chapters/lessons with a badge of how many challenges each lesson has
- **AND** the right list shows every challenge of the course with its status and lesson

#### Scenario: Filter the list

- **WHEN** the manager selects a status or checks "chỉ chưa gắn bài"
- **THEN** the list narrows to matching challenges

#### Scenario: Coverage warning

- **WHEN** the coverage report reports unmigrated assignments or unattached challenges
- **THEN** a warning banner shows the counts

### Requirement: Assign and unassign challenges to lessons

A manager SHALL assign a single challenge to a lesson (and unassign it, leaving it in the course bank)
from the list, and SHALL assign many selected challenges to one chosen lesson in a single bulk action.
The bulk action SHALL report per-row results — a failing row (e.g. course mismatch) SHALL NOT abort the
others, and failures SHALL be shown per row, not only as a single toast.

#### Scenario: Single assign / unassign

- **WHEN** the manager picks a lesson in a challenge row's selector (or clicks "Gỡ khỏi bài")
- **THEN** the challenge is attached to (or detached from) that lesson and the counts refresh

#### Scenario: Bulk assign with mixed results

- **WHEN** the manager selects several challenges, picks a target lesson, and assigns
- **THEN** each challenge's result (ok or error code) is listed, and the successful ones are applied even if some fail

### Requirement: Add unattached challenge and publish to Workplace

A manager SHALL create a challenge into the course bank without attaching it to any lesson, and SHALL
toggle a challenge's visibility between in-course only and public on Workplace (only when the challenge
is PUBLISHED/RUNNING), with a confirmation.

#### Scenario: Create unattached challenge

- **WHEN** the manager adds a challenge and skips the lesson step
- **THEN** the challenge is created in the course bank with no lesson attached

#### Scenario: Publish a challenge to Workplace

- **WHEN** the manager sets a PUBLISHED/RUNNING challenge to public
- **THEN** its visibility becomes WORKSPACE_PUBLIC (surfaced on Workplace) after confirming
