# admin-course-challenge-bank

## ADDED Requirements

### Requirement: Bank rows reflect status changes without manual refresh
After a successful publish, reopen, visibility change, delete or duplicate of a challenge, the course challenge bank list and coverage SHALL refresh automatically.

#### Scenario: Publish a draft
- **WHEN** a manager publishes a `DRAFT` row from the bank row menu
- **THEN** the row SHALL show the new status (`PUBLISHED` or `RUNNING`) without pressing "Làm mới"

### Requirement: Warn that editing a closed challenge's schedule does not reopen it
The challenge quick-edit dialog SHALL show a warning above the schedule control when the challenge is `CLOSED`, stating that saving a new close time keeps it closed and pointing to "Mở lại" or "Nhân bản".

#### Scenario: Edit a closed challenge
- **WHEN** a manager opens "Sửa nhanh" on a `CLOSED` challenge
- **THEN** the warning SHALL be visible above "Thời gian mở → đóng"

#### Scenario: Edit an open challenge
- **WHEN** the challenge is `DRAFT`, `PUBLISHED` or `RUNNING`
- **THEN** no such warning SHALL be shown
