# admin-course-challenge-bank (delta)

## ADDED Requirements

### Requirement: Delete a challenge

An admin managing a course's challenge bank SHALL be able to delete a challenge via a confirmation that
requires an audit reason. The action is permanent and shown as danger; unpublish / detach-from-lesson
are the non-destructive alternatives.

#### Scenario: Delete a challenge with reason

- **WHEN** the admin picks Xoá on a challenge, enters a reason, and confirms
- **THEN** the challenge is deleted (DELETE with the reason) and the bank list refreshes
