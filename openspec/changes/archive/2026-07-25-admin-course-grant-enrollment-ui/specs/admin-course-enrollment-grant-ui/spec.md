## ADDED Requirements

### Requirement: Grant a student into a course from the course list

The admin SHALL be able to grant a specific user an enrollment into a specific course from the course list, via a modal that searches users and calls `POST /api/v1/admin/courses/{id}/enrollments` with `{ userId }`.

#### Scenario: Open grant modal for a course

- **WHEN** the admin clicks "Cấp học viên" on a course row
- **THEN** a modal opens scoped to that course id, showing a searchable user picker

#### Scenario: Search and grant a user

- **WHEN** the admin searches for a user, selects one, and confirms
- **THEN** the grant request is sent with that course id and user id, and a success message is shown on 200

#### Scenario: Grant fails

- **WHEN** the grant request returns an error (e.g. missing permission, unknown course)
- **THEN** an error message is shown and the modal stays open for retry

#### Scenario: Action gated by permission

- **WHEN** the current admin lacks the course-management permission gate
- **THEN** the "Cấp học viên" action is not rendered
