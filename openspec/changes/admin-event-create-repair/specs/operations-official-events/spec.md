# operations-official-events

## MODIFIED Requirements

### Requirement: Official event creation and lifecycle

The system SHALL allow users holding `event.manage` to create official events (webinar, workshop,
hackathon) with schedule, mode, capacity, and optional certificate and reward configuration, and to
transition events through the lifecycle draft → published → ongoing → completed, with cancellation
requiring a mandatory reason and confirmation.

The create request SHALL be sent to `POST /api/v1/event/admin/events` using the backend's own
vocabulary: `type` uppercased to one of `WEBINAR`, `WORKSHOP`, `HACKATHON`, and `locationType` equal
to `ONLINE` for an online event or `ONSITE` for a physical one. The string `OFFLINE` SHALL NOT appear
in any outgoing payload. The lowercase `OfficialEventType` union SHALL remain the presentation and
URL vocabulary, with case normalization applied only at the API boundary.

The create form SHALL require both a start and an end datetime, and SHALL reject an end datetime that
is not strictly after the start datetime, before any request is sent.

#### Scenario: Creating an online event sends backend enum values

- **WHEN** a user with `event.manage` submits the create form with type Webinar, mode Online, an
  online link, and both datetimes
- **THEN** the request body carries `type: "WEBINAR"`, `locationType: "ONLINE"`, and `venue` set to
  the online link
- **AND** `startAt` and `endAt` are ISO-8601 strings

#### Scenario: Creating a physical event uses ONSITE

- **WHEN** the user picks mode Offline and enters a venue address
- **THEN** the request body carries `locationType: "ONSITE"` and `venue` set to that address
- **AND** no field of the request body equals `"OFFLINE"`

#### Scenario: End datetime is mandatory

- **WHEN** the user submits the create form leaving the end datetime empty
- **THEN** the end datetime field shows a validation error and no create request is sent

#### Scenario: End datetime must be after start datetime

- **WHEN** the user picks an end datetime earlier than or equal to the start datetime
- **THEN** the end datetime field shows a validation error stating it must be after the start
- **AND** no create request is sent
- **AND** changing the start datetime afterwards re-runs that validation

#### Scenario: Publishing an event

- **WHEN** a user with `event.manage` confirms Publish on a draft event
- **THEN** the system submits the event for approval and the event leaves the draft state

#### Scenario: Cancelling requires a reason

- **WHEN** the user triggers Cancel on a published event
- **THEN** a confirmation dialog states registrants will be notified and requires a non-empty
  reason before the transition is sent

#### Scenario: User without event permission

- **WHEN** a user lacking `event.manage` navigates directly to `/operations/events`
- **THEN** the system renders the 403 Forbidden page listing the missing permission
- **AND** Moderator and CTV presets contain no `event.manage` permission, so the Operations
  section never appears in their navigation

## ADDED Requirements

### Requirement: Event type filtering matches stored casing

The events list SHALL send the `type` filter to the `adminEvents` query uppercased, because the
backend compares it case-sensitively against the stored value, and SHALL lowercase the `type`
returned by `adminEvents` and `adminEvent` before it reaches component state, so the type filter and
the type column round-trip against the same lowercase vocabulary used by the picker.

#### Scenario: Filtering by type returns the matching events

- **WHEN** a user selects Webinar in the type filter
- **THEN** the `adminEvents` query is sent with `type: "WEBINAR"`
- **AND** events stored as `WEBINAR` are listed instead of an empty result

#### Scenario: Type from the backend is displayed in the list vocabulary

- **WHEN** `adminEvents` returns an event whose `type` is `WORKSHOP`
- **THEN** the row's type is held as `workshop` in component state
- **AND** the selected value of the type filter stays in sync with the listed rows

### Requirement: Official events are the only admin events surface

The Admin console SHALL expose exactly one navigation entry and one route family for events, under
Operations (`/operations/events`), so that no second page reads the same `adminEvents` source under a
duplicate "Events" nav label.

#### Scenario: Only one Events nav entry exists

- **WHEN** a user holding both `admin.community.read` and `event.manage` opens the console
- **THEN** exactly one navigation entry labelled "Events" is rendered, in the Operations group

#### Scenario: The removed community events route no longer resolves

- **WHEN** a user navigates directly to `/community/events`
- **THEN** the route does not resolve to an events page
- **AND** the other community routes (`/community/posts`, `/community/groups`) are unaffected
