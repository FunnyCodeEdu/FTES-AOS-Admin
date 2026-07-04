# operations-system-configuration Specification

## Purpose
TBD - created by archiving change admin-operations-console. Update Purpose after archive.
## Requirements
### Requirement: Super Admin only configuration access

The system SHALL restrict `/operations/config` to users holding `system.config.manage`, a
permission present only in the Super Admin preset, rendering the 403 Forbidden page for anyone
else including admin-operations, Moderator, and CTV users.

#### Scenario: Super Admin opens configuration

- **WHEN** a Super Admin holding `system.config.manage` opens `/operations/config`
- **THEN** the system fetches `GET /api/v1/admin/system/config` and renders configuration
  entries grouped by domain

#### Scenario: Domain admin denied

- **WHEN** an admin-operations user without `system.config.manage` navigates directly to
  `/operations/config`
- **THEN** the system renders the 403 Forbidden page listing `system.config.manage` as the
  missing permission
- **AND** the System Configuration nav item is not rendered for that user

### Requirement: Typed configuration editing

The system SHALL render each configuration entry with an input matching its value type (string,
number, boolean, JSON) and SHALL validate the new value against that type client-side before the
save flow can begin.

#### Scenario: Type mismatch is blocked

- **WHEN** the user enters a non-numeric value for a number-typed key
- **THEN** the editor blocks the save flow with a validation error and no diff modal opens

### Requirement: Diff confirmation with mandatory reason

The system SHALL show a before/after diff of the pending change in a confirmation modal,
requiring a mandatory reason, before submitting any configuration update, and every change SHALL
be recorded in the audit log with before and after values.

#### Scenario: Saving a config change

- **WHEN** the Super Admin edits a value, reviews the highlighted before/after diff, enters a
  reason, and confirms
- **THEN** the system calls `PUT /api/v1/admin/system/config/:key` with `{value, reason}` and
  the entry displays the new value
- **AND** the backend records the change with before/after values in the audit log

#### Scenario: Cancelling from the diff modal

- **WHEN** the user cancels the diff modal
- **THEN** no API call is made and the pending edit remains editable

### Requirement: Per-key change history

The system SHALL display the recent change history of a configuration key, including actor,
timestamp, reason, and before/after values, as read-only information.

#### Scenario: Viewing key history

- **WHEN** the user opens the history for a key
- **THEN** the system fetches `GET /api/v1/admin/system/config/:key/history` and renders the
  changes in reverse chronological order with no mutation affordance

### Requirement: Configuration UX states

The system SHALL render a skeleton tree while the configuration loads, an error state with retry
on failure, and search across keys and descriptions.

#### Scenario: Config fetch fails

- **WHEN** the configuration query fails
- **THEN** the system shows an error state with a retry action instead of an empty editor

