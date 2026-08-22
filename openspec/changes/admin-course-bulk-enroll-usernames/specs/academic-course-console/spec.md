# academic-course-console (delta)

## ADDED Requirements

### Requirement: Bulk add students by username in the roster

The course Students tab SHALL provide an "add students" action (guarded by `course.manage`) that opens
a dialog accepting a comma/newline-separated list of usernames, submits them, and shows per-username
outcomes (added / not found / failed), refreshing the roster and count.

#### Scenario: Paste usernames

- **WHEN** an admin pastes "a, b, c" and submits
- **THEN** the resolved users are enrolled and the dialog shows which were added, not found, or failed
