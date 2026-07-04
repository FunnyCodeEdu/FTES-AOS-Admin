# operations-notification-broadcast Specification

## Purpose
TBD - created by archiving change admin-operations-console. Update Purpose after archive.
## Requirements
### Requirement: Compose broadcast with segment targeting

The system SHALL allow users holding `operations.notification.send` to compose a broadcast with
title, content, delivery channels (in-app, email, push), a target segment built from campus,
subject, and role criteria, and an optional schedule time.

#### Scenario: Composing a targeted broadcast

- **WHEN** a user with `operations.notification.send` fills the compose form and selects
  campus and role segment criteria
- **THEN** the form accepts the input and enables the Preview action
- **AND** a schedule time in the past is rejected with a validation error

#### Scenario: User without send permission

- **WHEN** a user holds `operations.notification.view` but not `operations.notification.send`
- **THEN** the compose tab and the Send/Schedule actions are not rendered
- **AND** a user lacking both permissions who navigates to `/operations/notifications` sees the
  403 Forbidden page listing the missing permission

### Requirement: Recipient preview before sending

The system SHALL require a recipient preview showing the recipient count and a sample of
recipients before a broadcast can be sent, and SHALL block sending when the segment resolves to
zero recipients.

#### Scenario: Previewing a segment

- **WHEN** the user clicks Preview
- **THEN** the system calls `POST /api/v1/admin/operations/notifications/preview` with the
  segment and displays the recipient count and a sample list

#### Scenario: Empty segment blocks sending

- **WHEN** the preview returns a recipient count of zero
- **THEN** the Send action is disabled and a warning explains the segment matches no users

### Requirement: Confirmed send with large-audience safeguard

The system SHALL require a confirmation dialog stating the recipient count and channels before
sending, and for audiences larger than 1000 recipients SHALL additionally require the user to
re-type the recipient count, since a sent broadcast cannot be recalled.

#### Scenario: Sending to a large audience

- **WHEN** the user confirms a broadcast targeting more than 1000 recipients
- **THEN** the confirmation dialog requires re-typing the recipient count before the submit
  button activates
- **AND** on submit the system calls `POST /api/v1/admin/operations/notifications` and switches
  to the history tab showing the new broadcast

### Requirement: Broadcast history with delivery stats

The system SHALL list past and scheduled broadcasts in a server-side paginated table with
status (draft, scheduled, sending, sent), per-broadcast stats (sent, delivered, read), search,
and a detail view, for users holding `operations.notification.view`.

#### Scenario: Reviewing delivery stats

- **WHEN** a user with `operations.notification.view` opens the history tab
- **THEN** the system queries `GET /api/v1/admin/operations/notifications` with pagination
  parameters and renders each broadcast with its status and sent/delivered/read counters

### Requirement: Cancel scheduled broadcast

The system SHALL allow users holding `operations.notification.send` to cancel a broadcast while
it is still in scheduled status, with a confirmation dialog, and SHALL NOT offer cancellation
once sending has started.

#### Scenario: Cancelling before send time

- **WHEN** the user confirms cancellation of a scheduled broadcast
- **THEN** the system calls `POST /api/v1/admin/operations/notifications/:id/cancel` and the
  item status changes to cancelled

#### Scenario: Broadcast already sending

- **WHEN** a broadcast has status sending or sent
- **THEN** no cancel action is rendered for that row

### Requirement: Broadcast UX states

The system SHALL render skeletons mirroring the form and table layouts while loading, an empty
history state, and error states with retry; the compose draft SHALL survive a page refresh.

#### Scenario: Draft survives refresh

- **WHEN** the user has typed a draft and reloads the page
- **THEN** the compose form restores the drafted title, content, and segment

