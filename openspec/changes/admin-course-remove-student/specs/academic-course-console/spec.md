# academic-course-console (delta)

## ADDED Requirements

### Requirement: Remove student action in the course roster

The course Students tab SHALL provide a per-student "remove from course" action (guarded by
`course.manage`) that opens a reason-collecting confirm dialog and, on confirm, revokes the student's
enrollment and refreshes the roster and student count.

#### Scenario: Remove a student

- **WHEN** an admin clicks "Xoá khỏi khoá" for a student and confirms with a reason
- **THEN** the student is removed (DELETE /admin/courses/{id}/enrollments/{userId}) and the roster + total update
