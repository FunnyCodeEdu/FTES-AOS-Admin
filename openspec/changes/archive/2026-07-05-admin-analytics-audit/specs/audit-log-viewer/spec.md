# audit-log-viewer

## ADDED Requirements

### Requirement: Audit log listing with filters

The system SHALL display the audit log at `/system/audit` for users holding `audit.view`, in a
server-side paginated table filterable by actor, action, domain, and time range, with filters
persisted in the URL so an investigation view can be shared as a link.

#### Scenario: Filtering audit entries

- **WHEN** a user with `audit.view` filters by an actor and a 7 day range
- **THEN** the system queries `GET /api/v1/admin/audit/logs` with those parameters and renders
  matching entries with actor, action, domain, target, and timestamp
- **AND** the applied filters are reflected in the URL query string

#### Scenario: User without audit permission

- **WHEN** a user lacking `audit.view` (including all Moderator and CTV presets) navigates
  directly to `/system/audit`
- **THEN** the system renders the 403 Forbidden page listing the missing permission
- **AND** the Audit Log nav item is not rendered for that user

### Requirement: Entry detail with before and after diff

The system SHALL show a detail view for each audit entry including full metadata and a
before/after diff of the changed record with changed fields highlighted.

#### Scenario: Inspecting a change

- **WHEN** the user opens an entry whose action modified a record
- **THEN** the drawer fetches `GET /api/v1/admin/audit/logs/:id` and renders the before and
  after values side by side with changed fields highlighted

#### Scenario: Entry not found

- **WHEN** the detail request returns not found
- **THEN** the drawer shows a not-found state instead of empty panels

### Requirement: Audit log is immutable in the UI

The system SHALL treat the audit log as strictly read-only: no create, edit, delete, or any
other mutation affordance SHALL be rendered anywhere in the viewer, and the audit API layer
SHALL define no mutation function.

#### Scenario: No mutation affordances

- **WHEN** a user with `audit.view` browses the list and any entry detail
- **THEN** no button, menu item, or keyboard action exists that would modify or delete an audit
  entry

### Requirement: Actor filter with user search

The system SHALL provide the actor filter as a user-search autocomplete backed by the admin user
search endpoint rather than a free-text id field.

#### Scenario: Searching for an actor

- **WHEN** the user types a name into the actor filter
- **THEN** matching users are suggested and selecting one applies their id to the audit query

### Requirement: Audit viewer UX states

The system SHALL render a skeleton table while loading, an empty state suggesting broader
filters when nothing matches, and an error state with retry on failure; timestamps SHALL be
shown in the viewer's local timezone with the UTC value available on hover.

#### Scenario: No entries match

- **WHEN** the audit query returns zero entries for the active filters
- **THEN** the system shows an empty state suggesting the user widen the filters
