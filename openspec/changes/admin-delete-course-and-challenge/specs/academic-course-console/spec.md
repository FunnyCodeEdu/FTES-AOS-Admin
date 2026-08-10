# academic-course-console (delta)

## ADDED Requirements

### Requirement: Delete a course

An admin with course-manage permission SHALL be able to delete a course from the course list, via a
confirmation that requires an audit reason (sent to the reason-guarded delete endpoint). The action is
permanent; the UI SHALL surface it as danger and suggest unpublish as the non-destructive alternative.

#### Scenario: Delete with reason

- **WHEN** the admin clicks Xoá on a course, enters a reason, and confirms
- **THEN** the course is deleted (DELETE with the reason) and removed from the list

#### Scenario: Reason required

- **WHEN** the admin confirms without a reason
- **THEN** the confirm is blocked until a reason is entered
