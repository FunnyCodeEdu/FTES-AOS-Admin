# admin-course-challenge-bank Specification

## Purpose

The course challenge bank tab of the admin console: list, attach and manage the challenges of a
course.

## Requirements
### Requirement: Duplicate a challenge from the course bank
The course challenge bank SHALL offer a "Nhân bản" action on every challenge row for users who can manage the bank. After confirmation it SHALL call `POST /api/v1/admin/challenges/{id}/duplicate`, refresh the bank list and coverage, and tell the user the new draft needs its schedule checked and publishing.

#### Scenario: Duplicate a closed challenge
- **WHEN** a manager confirms "Nhân bản" on a `CLOSED` challenge
- **THEN** a new `DRAFT` row with the same title SHALL appear in the bank after refresh

#### Scenario: Cancelled
- **WHEN** the manager cancels the confirm dialog
- **THEN** no request SHALL be sent
