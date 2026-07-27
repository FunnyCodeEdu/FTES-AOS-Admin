# admin-subject-course-links

## ADDED Requirements

### Requirement: Linked-courses tab on the subject detail page

The subject detail page SHALL render a "Khoá học liên kết" tab that lists the courses currently
linked to the subject by filtering `GET /api/v1/subjects/{code}/links` (via `coreClient`, keyed by
subject code) to entries whose `targetType` equals `course.course`, resolving each entry's display
name from its `title` or, failing that, from the `adminCourses` list.

#### Scenario: Linked courses are listed

- **WHEN** a user opens a subject detail page whose subject has course links on the LEARNING tab
- **THEN** the "Khoá học liên kết" tab lists one row per `course.course` link with the course name and its course id
- **AND** each row shows a "Gỡ liên kết" action for a user holding `subject.manage`

#### Scenario: Empty state when no course is linked

- **WHEN** the subject has no `course.course` link
- **THEN** an empty state indicates no course is linked yet
- **AND** no course table rows are shown

#### Scenario: Load error is recoverable

- **WHEN** the links request fails
- **THEN** an error alert with a "Thử lại" retry button is shown

### Requirement: Link a course to the subject

The tab SHALL let a `subject.manage` user pick a course from the `adminCourses` list and link it
via `POST /api/v1/subjects/{code}/links` with body `{ tab: "LEARNING", targetType: "course.course",
targetId: <courseId>, titleOverride: <course name> }`, and SHALL invalidate the subject links and
subject detail queries on success so the list refreshes.

#### Scenario: Add a course link

- **WHEN** a `subject.manage` user selects a course and clicks "Liên kết"
- **THEN** `POST /subjects/{code}/links` is sent with `tab=LEARNING`, `targetType=course.course`, and `targetId` set to the chosen course
- **AND** on success a success message shows and the linked-courses list query is invalidated

#### Scenario: A subject links to many courses

- **WHEN** a `subject.manage` user links several different courses in turn
- **THEN** each course is added as its own link row and all appear in the list

#### Scenario: Duplicate course link is prevented

- **WHEN** a course is already linked to the subject
- **THEN** that course is excluded from the picker options
- **AND** attempting to link the same course again shows a warning and sends no request

### Requirement: Remove a linked course

The tab SHALL let a `subject.manage` user unlink a course via
`DELETE /api/v1/subjects/{code}/links/{id}` behind a danger confirm, invalidating the subject links
and subject detail queries on success.

#### Scenario: Unlink a course

- **WHEN** a `subject.manage` user confirms the "Gỡ liên kết" danger dialog for a linked course
- **THEN** `DELETE /subjects/{code}/links/{id}` is sent for that link id
- **AND** on success a success message shows and the removed course no longer appears in the list

#### Scenario: Course itself is not deleted

- **WHEN** a linked course is unlinked from the subject
- **THEN** only the workspace link is removed and the course record is left intact

### Requirement: Mutating controls gated by subject.manage

The linked-courses tab SHALL gate its link and unlink controls behind
`<Can permissions={["subject.manage"]}>`, matching the sibling staff/prerequisites controls, so a
user without `subject.manage` can view linked courses but cannot mutate them.

#### Scenario: Controls hidden without the permission

- **WHEN** a user lacking `subject.manage` opens the "Khoá học liên kết" tab
- **THEN** the course picker, "Liên kết" button, and "Gỡ liên kết" actions are not rendered
- **AND** the list of linked courses is still shown read-only
