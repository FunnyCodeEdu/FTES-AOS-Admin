# community-events-moderation Specification

## Purpose
TBD - created by archiving change admin-community-console. Update Purpose after archive.
## Requirements
### Requirement: Community events review list

The system SHALL display group-created community events at `/community/events` in a server-side
paginated table with search and filters for review status and group, for users holding
`community.event.review`.

#### Scenario: Reviewing pending events

- **WHEN** a user with `community.event.review` filters by status pending
- **THEN** the system queries `GET /api/v1/admin/community/events` with the filter and
  pagination parameters and lists matching events with group, organizer, and schedule

#### Scenario: User without review permission

- **WHEN** a user lacking `community.event.review` navigates directly to `/community/events`
- **THEN** the system renders the 403 Forbidden page listing the missing permission
- **AND** the Community Events nav item is not rendered for that user

### Requirement: Event detail before decision

The system SHALL show an event detail drawer with description, schedule, location/online link,
organizer group, and prior review history before any approve or reject action is taken.

#### Scenario: Opening event detail

- **WHEN** the reviewer clicks a pending event row
- **THEN** a drawer opens with the full event information and review history

### Requirement: Approve or reject with reason

The system SHALL allow approving or rejecting a group-created event through a confirmation
dialog, where rejection requires a mandatory reason communicated to the organizer, and both
decisions SHALL be auditable.

#### Scenario: Approving an event

- **WHEN** the reviewer confirms Approve on a pending event
- **THEN** the system calls `POST /api/v1/admin/community/events/:id/review` with
  `{decision: "approve"}` and the event status changes to approved

#### Scenario: Rejecting without reason is blocked

- **WHEN** the reviewer submits Reject with an empty reason
- **THEN** submission is blocked with a validation message and no API call is made

#### Scenario: Event already reviewed

- **WHEN** the review mutation returns a conflict because another reviewer already decided
- **THEN** the system shows an "already reviewed" notification and refetches the list

### Requirement: Events review UX states

The system SHALL render a skeleton table while loading, an empty state when no events match the
filters, and an error state with retry on failure.

#### Scenario: No pending events

- **WHEN** the events query returns zero pending items
- **THEN** the system shows an empty state indicating there is nothing awaiting review

