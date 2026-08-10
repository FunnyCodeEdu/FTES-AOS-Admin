# operations-official-events

## MODIFIED Requirements

### Requirement: Event lifecycle vocabulary matches the backend

The admin console SHALL model exactly the lifecycle states the backend produces — draft, pending approval,
published, ongoing, ended, cancelled — and SHALL NOT define a state the backend never emits.

Values arriving from the backend SHALL be translated at the API boundary by a runtime mapper, not by a type
assertion, because a type assertion produces no runtime code and lets the raw value reach comparison logic.
An unrecognised value SHALL be reported rather than silently absorbed.

Values sent back as list filters SHALL use the backend's own casing, because the backend matches them verbatim.

#### Scenario: Backend casing is translated on read

- **WHEN** the backend returns an event whose status is written in its own casing
- **THEN** the console's model holds the corresponding lifecycle state
- **AND** status-dependent controls render as they would for that state

#### Scenario: Filters reach the backend in its own vocabulary

- **WHEN** the operator filters the event list by status or type
- **THEN** the query sent upstream carries the backend's casing
- **AND** the filtered list is not empty merely because of a casing difference

#### Scenario: Unknown state is surfaced

- **WHEN** the backend returns a lifecycle state the console does not know
- **THEN** a warning is emitted
- **AND** the console degrades to the initial state rather than crashing

### Requirement: Only real admin transitions are offered

The event detail screen SHALL offer exactly the transitions an administrator can actually perform — submitting
a draft for approval, and cancelling — and SHALL NOT offer transitions the backend rejects. Progression into
the running and finished states is performed by the backend scheduler, not by an operator.

A transition the backend would refuse for the current event SHALL be presented as unavailable with the reason,
rather than offered and then failing.

#### Scenario: Draft offers submission

- **WHEN** an operator with the event management permission opens a draft event
- **THEN** a control to submit it for approval is available
- **AND** no control claims to start or finish the event

#### Scenario: Started event cannot be cancelled

- **WHEN** the event's start time has already passed
- **THEN** the cancel control is disabled and states why

### Requirement: Authorization surface honours the bypass flag

Permission gating in the console SHALL treat a caller carrying the server's super-admin bypass flag as
permitted, matching what the server enforces, so that such a caller is not shown a console stripped of every
action they are in fact allowed to perform.

#### Scenario: Super admin sees the actions

- **WHEN** the permission surface reports the bypass flag
- **THEN** permission-gated controls, navigation entries and routes are available

### Requirement: Authenticated reads survive token expiry

A read that fails because the access token has expired SHALL refresh the token once and retry once, matching
the behaviour of the console's other transport, so an expired token degrades into a brief delay rather than a
failed screen. A second failure SHALL surface as an expired session and SHALL NOT retry further.

#### Scenario: Expired token is refreshed transparently

- **WHEN** a read is rejected because the token is stale, and refreshing succeeds
- **THEN** the read is retried with the refreshed token and returns data

#### Scenario: Refresh failure ends the attempt

- **WHEN** refreshing fails, or the retry is rejected as well
- **THEN** the caller is told the session expired
- **AND** no further attempt is made
