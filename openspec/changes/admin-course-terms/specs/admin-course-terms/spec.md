# admin-course-terms

## ADDED Requirements

### Requirement: Term list page

The system SHALL render a "Kỳ học" list page at `/academic/terms` that fetches `GET
/api/v1/admin/terms` and shows a table with each term's code, name, start–end datetime, status tag
(SCHEDULED/ACTIVE/ENDED), and course count, with loading, empty, and recoverable-error states.

#### Scenario: Terms are listed

- **WHEN** a user with `term.view` opens `/academic/terms`
- **THEN** each term appears as a row showing its code, name, formatted start–end time, a status tag, and its course count
- **AND** a "Tạo kỳ" button is shown only to a user holding `term.manage`

#### Scenario: Empty state when no term exists

- **WHEN** the terms list is empty
- **THEN** an empty state indicates no term exists yet
- **AND** no table rows are shown

#### Scenario: Load error is recoverable

- **WHEN** the terms request fails
- **THEN** an error alert with a "Thử lại" retry button is shown

### Requirement: Create and edit a term

The system SHALL let a `term.manage` user create a term via `POST /api/v1/admin/terms` with body
`{ code, name, startsAt, endsAt, reminderLeadDays }` (datetimes sent as ISO-8601 via
`dayjs.toISOString()`, `reminderLeadDays` defaulting to 7), and edit a term via `PUT
/api/v1/admin/terms/{id}` with `{ name, startsAt, endsAt, reminderLeadDays }`, invalidating the term
list on success.

#### Scenario: Create a term

- **WHEN** a `term.manage` user fills the term form and submits
- **THEN** `POST /terms` is sent with `code`, `name`, ISO `startsAt`/`endsAt`, and `reminderLeadDays`
- **AND** on success a success message shows and the term list query is invalidated

#### Scenario: Code is immutable on edit

- **WHEN** a `term.manage` user opens the form for an existing term
- **THEN** the `code` field is disabled
- **AND** the submitted `PUT /terms/{id}` body does not include `code`

#### Scenario: Duplicate code is reported

- **WHEN** creating a term whose code is already taken and the backend returns `TERM_CODE_TAKEN`
- **THEN** a localized Vietnamese message is shown and the modal stays open

### Requirement: Delete a term

The system SHALL let a `term.manage` user delete a term via `DELETE /api/v1/admin/terms/{id}` behind
a danger confirm dialog, invalidating the term list on success.

#### Scenario: Delete a term with confirm

- **WHEN** a `term.manage` user confirms the delete danger dialog for a term
- **THEN** `DELETE /terms/{id}` is sent
- **AND** on success a success message shows and the term list query is invalidated

### Requirement: Manage courses within a term

The term detail page SHALL provide a "Khóa học trong kỳ" tab that lists `GET
/api/v1/admin/terms/{id}/courses`, lets a `term.manage` user add a course via `POST
/api/v1/admin/terms/{id}/courses` with body `{ courseId }` chosen from a searchable course picker
that excludes already-added courses, and remove a course via `DELETE
/api/v1/admin/terms/{id}/courses/{courseId}` behind a confirm, invalidating the term courses and
affected-summary queries on success.

#### Scenario: Add a course to a term

- **WHEN** a `term.manage` user picks a course not yet in the term and clicks "Thêm khoá"
- **THEN** `POST /terms/{id}/courses` is sent with the chosen `courseId`
- **AND** on success the course appears in the list and the courses query is invalidated

#### Scenario: Course already in another non-ended term is rejected gracefully

- **WHEN** adding a course and the backend returns `TERM_COURSE_CONFLICT`
- **THEN** a localized message explaining the course already belongs to another non-ended term is shown
- **AND** the courses list is left unchanged

#### Scenario: Already-added courses are excluded from the picker

- **WHEN** a course is already in the term
- **THEN** that course is not offered as an option in the add-course picker

#### Scenario: Remove a course from a term

- **WHEN** a `term.manage` user confirms removing a course
- **THEN** `DELETE /terms/{id}/courses/{courseId}` is sent and, on success, the course no longer appears

### Requirement: View affected students and re-add a student

The term detail page SHALL provide an "Ảnh hưởng" tab that renders `GET
/api/v1/admin/terms/{id}/enrollments` as the total affected active users and per-course active
enrollment and purchase counts, and SHALL let a `term.manage` user re-add a student to one of those
courses via the existing course-grant flow (`POST /api/v1/admin/courses/{courseId}/enrollments` with
`{ userId }`).

#### Scenario: Affected summary is rendered

- **WHEN** a user with `term.view` opens the "Ảnh hưởng" tab
- **THEN** the total affected active users and course count are shown
- **AND** each course row shows its active enrollment and active purchase counts

#### Scenario: Re-add a student to a course

- **WHEN** a `term.manage` user selects a student in the re-add modal for a course and confirms
- **THEN** `POST /courses/{courseId}/enrollments` is sent with the selected `userId`
- **AND** on success a success message is shown

### Requirement: Term management controls gated by term.manage

The term surfaces SHALL gate every mutating control (create/edit/delete term, add/remove course,
re-add student) behind `<Can permissions={["term.manage"]}>`, and the term routes SHALL require
`term.view`, so a user with only `term.view` can browse terms read-only while a user lacking
`term.view` is routed to `/403`.

#### Scenario: Controls hidden without term.manage

- **WHEN** a user holding `term.view` but not `term.manage` opens the term list and detail pages
- **THEN** the "Tạo kỳ", "Sửa", "Xoá", "Thêm khoá", "Gỡ", and "Cấp lại học viên" controls are not rendered
- **AND** the terms, courses, and affected summary are still shown read-only

#### Scenario: Route blocked without term.view

- **WHEN** a user lacking `term.view` navigates to `/academic/terms`
- **THEN** the "Kỳ học" nav entry is hidden and the route resolves to `/403`
