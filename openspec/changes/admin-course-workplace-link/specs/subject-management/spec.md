## ADDED Requirements

### Requirement: Subject linked courses management

The system SHALL let admins view, add, and remove the courses linked to a subject's workplace from a
"Khóa học liên kết" tab on the subject detail screen. A link is a subject workspace link with
`targetType = 'course.course'` and `targetId` = the course id, created on the `LEARNING` tab. One
subject MAY be linked to MANY courses. Because the workspace-link endpoints are exposed on the core
subject path keyed by subject CODE (`GET`/`POST /api/v1/subjects/{code}/links`,
`DELETE /api/v1/subjects/{code}/links/{id}`) — not on the admin subject path keyed by id — the tab
SHALL read and write through those core endpoints by CODE. Because the backend link view returns only
`titleOverride` as its `title` (it does not resolve the course title), the system SHALL resolve each
linked course's display title from the admin course list. Adding and removing links SHALL be gated by
the `subject.manage` permission.

#### Scenario: Admin views linked courses

- **WHEN** a user opens the "Khóa học liên kết" tab of a subject
- **THEN** the system lists the subject's workspace links filtered to `targetType = 'course.course'`
- **AND** each row shows the course title resolved from the admin course list

#### Scenario: Admin links a course to the subject

- **WHEN** an admin holding `subject.manage` picks a course in the searchable course picker and confirms the link
- **THEN** the system sends `POST /api/v1/subjects/{code}/links` with body `{ tab: 'LEARNING', targetType: 'course.course', targetId: <courseId> }`
- **AND** the linked-courses list is refreshed to include the new course

#### Scenario: Course already linked

- **WHEN** an admin picks a course that is already linked to the subject
- **THEN** the system warns that the course is already linked and does not send a duplicate create request

#### Scenario: Admin unlinks a course with confirmation

- **WHEN** an admin holding `subject.manage` chooses to remove a linked course
- **THEN** the system shows a confirmation dialog before deleting
- **AND** on confirm it sends `DELETE /api/v1/subjects/{code}/links/{id}` and refreshes the list

#### Scenario: Caller lacks subject.manage

- **WHEN** a user lacking `subject.manage` opens the "Khóa học liên kết" tab
- **THEN** the list of linked courses is still shown
- **AND** the course picker, link button, and unlink button are not rendered
