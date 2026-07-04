# operations-official-events

## ADDED Requirements

### Requirement: Official event creation and lifecycle

The system SHALL allow users holding `operations.event.manage` to create official events
(webinar, workshop, hackathon) with schedule, mode, capacity, and optional certificate and
reward configuration, and to transition events through the lifecycle draft → published →
ongoing → completed, with cancellation requiring a mandatory reason and confirmation.

#### Scenario: Publishing an event

- **WHEN** a user with `operations.event.manage` confirms Publish on a draft event
- **THEN** the system calls `POST /api/v1/admin/operations/events/:id/transition` with
  `{toStatus: "published"}` and the event becomes visible for registration

#### Scenario: Cancelling requires a reason

- **WHEN** the user triggers Cancel on a published event
- **THEN** a confirmation dialog states registrants will be notified and requires a non-empty
  reason before the transition is sent

#### Scenario: User without event permission

- **WHEN** a user lacking `operations.event.manage` navigates directly to `/operations/events`
- **THEN** the system renders the 403 Forbidden page listing the missing permission
- **AND** Moderator and CTV presets contain no `operations.*` permission, so the Operations
  section never appears in their navigation

### Requirement: Registration management

The system SHALL list event registrations in a server-side paginated table with search and
check-in status filter, and SHALL support exporting the registration list as CSV.

#### Scenario: Searching registrations

- **WHEN** the user searches a registrant name on the Registrations tab
- **THEN** the system queries `GET /api/v1/admin/operations/events/:id/registrations` with the
  search and pagination parameters and renders matching registrations

#### Scenario: Exporting registrations

- **WHEN** the user clicks Export CSV
- **THEN** the system downloads a CSV containing the current filtered registration set

### Requirement: QR check-in and attendance

The system SHALL display a rotating check-in QR code for users holding
`operations.event.checkin`, support manual check-in of individual registrations, and show an
attendance table that refreshes periodically while the Check-in tab is open.

#### Scenario: Manual check-in

- **WHEN** a user with `operations.event.checkin` confirms manual check-in for a registration
- **THEN** the system calls `POST /api/v1/admin/operations/events/:id/checkin` with the
  registration id and the row shows checked-in status

#### Scenario: User without check-in permission

- **WHEN** a user holds `operations.event.manage` but not `operations.event.checkin`
- **THEN** the Check-in tab does not render the QR code or manual check-in actions

### Requirement: Recording attachment

The system SHALL allow users holding `operations.event.manage` to attach or update a recording
URL for an event after it has started.

#### Scenario: Attaching a recording

- **WHEN** the user saves a recording URL on a completed event
- **THEN** the system calls `PUT /api/v1/admin/operations/events/:id/recording` and the
  Recording tab shows the saved link

### Requirement: Certificate and reward issuance

The system SHALL allow users holding `operations.event.certificate` to issue certificates and
rewards in bulk to attendees matching a criteria (checked-in attendees or all registrants), only
after the event is completed, with a confirmation dialog stating the number of recipients, and
the issuance SHALL be auditable.

#### Scenario: Issuing to checked-in attendees

- **WHEN** a user with `operations.event.certificate` confirms issuance with criteria attended
  on a completed event
- **THEN** the system calls `POST /api/v1/admin/operations/events/:id/certificates/issue` and
  shows the issued count returned by the backend

#### Scenario: Event not yet completed

- **WHEN** the event status is not completed
- **THEN** the issue action is disabled with an explanation tooltip and no API call is possible

#### Scenario: User without certificate permission

- **WHEN** a user lacks `operations.event.certificate`
- **THEN** the Certificates & Rewards tab actions are not rendered

### Requirement: Events UX states

The system SHALL render skeletons mirroring the table and detail tab layouts while loading,
empty states for lists, and error states with retry.

#### Scenario: No registrations yet

- **WHEN** the registrations query returns zero items
- **THEN** the tab shows an empty state indicating no one has registered yet
