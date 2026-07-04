# operations-banner-announcement

## ADDED Requirements

### Requirement: Banner CRUD with placement and schedule

The system SHALL allow users holding `operations.banner.manage` to create, update, and delete
banners with image, link, placement position, display order, and an active date range, listed in
a server-side paginated table with search and filters for position and status.

#### Scenario: Creating a banner

- **WHEN** a user with `operations.banner.manage` submits the banner form with image, position,
  and active range
- **THEN** the system calls `POST /api/v1/admin/operations/banners` and the banner appears in
  the list with its scheduled status

#### Scenario: Deleting a banner requires confirmation

- **WHEN** the user triggers Delete on a banner
- **THEN** a confirmation dialog states the banner will disappear from its placement immediately
- **AND** the deletion is only sent after confirmation

#### Scenario: User without banner permission

- **WHEN** a user lacking `operations.banner.manage` navigates directly to `/operations/banners`
- **THEN** the system renders the 403 Forbidden page listing the missing permission
- **AND** the Banners nav item is not rendered for that user

### Requirement: Banner preview per placement

The system SHALL render a preview of the banner as it will appear in its selected placement
before saving.

#### Scenario: Previewing before save

- **WHEN** the user selects a placement and uploads an image in the banner form
- **THEN** the preview panel renders the banner within the frame dimensions of that placement

### Requirement: Announcement management with scope

The system SHALL allow users holding `operations.announcement.manage` to create, update, and
delete announcements scoped to the whole system, a specific subject, or a specific group, with a
severity level and an active date range, listed with server-side pagination, search, and scope
and status filters.

#### Scenario: Creating a subject-scoped announcement

- **WHEN** a user with `operations.announcement.manage` creates an announcement with scope type
  subject and selects a subject
- **THEN** the system calls `POST /api/v1/admin/operations/announcements` with
  `{scopeType: "subject", scopeId}` and the announcement appears in the list

#### Scenario: Scope picker enforces scope id

- **WHEN** the user selects scope type subject or group but no scope target
- **THEN** form submission is blocked with a validation message

#### Scenario: User without announcement permission

- **WHEN** a user lacking `operations.announcement.manage` navigates to
  `/operations/announcements`
- **THEN** the system renders the 403 Forbidden page listing the missing permission

### Requirement: Scheduling controls visibility

The system SHALL treat banners and announcements outside their active date range as inactive,
and the list SHALL clearly distinguish active, scheduled, and expired items.

#### Scenario: Expired item is labelled

- **WHEN** a banner's active range has ended
- **THEN** the list shows the banner with an Expired status label distinct from Active and
  Scheduled

### Requirement: Banner and announcement UX states

The system SHALL render skeleton tables while loading, an empty state with a create call to
action shown only to permitted users, and error states with retry.

#### Scenario: Empty banner list

- **WHEN** the banner query returns zero items for a user with `operations.banner.manage`
- **THEN** the empty state includes a "create banner" action; for a hypothetical read-only
  viewer the action would not render
