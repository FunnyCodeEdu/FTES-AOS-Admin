# operations-official-events

## ADDED Requirements

### Requirement: Editing an existing official event

The system SHALL allow users holding `event.manage` to edit an official event that has not closed,
from the event detail page, reusing the same wizard form as event creation.

The Edit action SHALL be rendered only while the event status is `draft`, `pending_approval`, or
`published`. It SHALL NOT be rendered for `ongoing`, `ended`, or `cancelled` events, which the
backend refuses to modify.

The edit form SHALL be prefilled with the event's current type, title, description, start and end
datetimes, mode, venue (physical location or online link), and capacity, and SHALL keep the creation
validation rules: the end datetime is mandatory and must be strictly after the start datetime.

The form SHALL present the same wizard in an edit-specific dress — its title and its confirm button
SHALL name the edit action rather than the create action — and SHALL hide the certificate and reward
controls, which the update request does not carry.

#### Scenario: Edit action offered on an open event

- **WHEN** a user holding `event.manage` opens the detail page of an event in `draft`,
  `pending_approval`, or `published`
- **THEN** an Edit action is rendered alongside the existing lifecycle actions

#### Scenario: Edit action withheld on a closed event

- **WHEN** the event status is `ended` or `cancelled`
- **THEN** no Edit action is rendered, because the backend rejects modification of a closed event

#### Scenario: Form opens carrying the current values

- **WHEN** the user opens the Edit form
- **THEN** type, title, description, start datetime, end datetime, mode, venue or online link, and
  capacity show the event's current values
- **AND** the type picker resolves the value to one of its options rather than showing the backend's
  uppercase string

#### Scenario: End datetime rule still applies when editing

- **WHEN** the user clears the end datetime, or sets it earlier than or equal to the start datetime
- **THEN** the field shows a validation error and no update request is sent

### Requirement: Event updates are sent as a partial patch

The system SHALL send event edits to `PATCH /api/v1/event/admin/events/{id}` on the core API surface
(`/api/v1`), the same module and permission gate as event creation, submission, and cancellation —
not the admin API surface used by event review.

The request body SHALL contain only the fields the user actually changed. An unchanged field SHALL be
absent from the body rather than sent as `null`, because the backend reads an absent or null field as
"leave unchanged". Datetimes SHALL be compared as instants, not as strings, so that a value re-encoded
in a different ISO-8601 form does not count as a change.

The body SHALL use the backend's vocabulary exactly as the create request does: `type` uppercased,
`locationType` equal to `ONLINE` or `ONSITE`, and `venue` set from the online link for an online event
or from the address for a physical one. The string `OFFLINE` SHALL NOT appear in any outgoing payload.
`locationType` SHALL be sent only when the mode itself changed, so an event stored as `HYBRID` — a
mode the wizard cannot express — is not silently downgraded by an unrelated edit.

After a successful update, the system SHALL invalidate both the event detail and the events list
queries, and SHALL report failures through the shared admin mutation error handler.

#### Scenario: Only the changed field travels

- **WHEN** the user changes only the title and saves
- **THEN** the PATCH body contains the title and nothing else
- **AND** it carries neither `type`, `locationType`, `venue`, nor the datetimes

#### Scenario: Nothing changed

- **WHEN** the user saves the form without altering any value
- **THEN** the PATCH body is empty

#### Scenario: Switching an event to a physical venue

- **WHEN** the user switches mode to Offline and enters an address
- **THEN** the PATCH body carries `locationType: "ONSITE"` and `venue` set to that address
- **AND** no field of the body equals `"OFFLINE"`

#### Scenario: Changing the event type

- **WHEN** the user picks a different type
- **THEN** the PATCH body carries that type uppercased

#### Scenario: Datetime re-encoding is not a change

- **WHEN** the stored start datetime is `2026-09-01T10:00:00Z` and the form submits
  `2026-09-01T10:00:00.000Z` for the same instant
- **THEN** the PATCH body carries no start datetime

#### Scenario: Update reaches the core event surface

- **WHEN** an update is saved for event `e1`
- **THEN** the request is `PATCH /event/admin/events/e1` on the core client
- **AND** no request is sent through the admin client

#### Scenario: Saved values are visible immediately

- **WHEN** the update succeeds
- **THEN** the event detail query and the events list query are invalidated so the new values are
  fetched
