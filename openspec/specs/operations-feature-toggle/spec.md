# operations-feature-toggle Specification

## Purpose
TBD - created by archiving change admin-operations-console. Update Purpose after archive.
## Requirements
### Requirement: Feature flag listing per environment

The system SHALL display all feature flags at `/operations/flags` for users holding
`system.flag.manage`, showing per environment (dev, staging, prod) the enabled state, rollout
percentage, and target segment, with the production environment visually distinguished by a
warning treatment.

#### Scenario: Viewing flags

- **WHEN** a user with `system.flag.manage` opens `/operations/flags`
- **THEN** the system fetches `GET /api/v1/admin/system/flags` and renders each flag with its
  per-environment state
- **AND** selecting the prod environment shows a persistent warning banner

#### Scenario: User without flag permission

- **WHEN** a user lacking `system.flag.manage` (any Moderator, CTV, or domain admin outside the
  Super Admin and admin-operations presets) navigates directly to `/operations/flags`
- **THEN** the system renders the 403 Forbidden page listing the missing permission
- **AND** the Feature Toggles nav item is not rendered for that user

### Requirement: Confirmed flag changes with mandatory reason

The system SHALL require every flag change (enable, disable, rollout, or target change) to go
through a confirmation modal with a mandatory reason, and changes on the prod environment SHALL
additionally require an explicit acknowledgement checkbox; every change SHALL be recorded in the
audit log.

#### Scenario: Enabling a flag on prod

- **WHEN** a user toggles a flag on prod, enters a reason, and checks the acknowledgement
- **THEN** the system calls `PUT /api/v1/admin/system/flags/:key` with
  `{env: "prod", enabled: true, reason}` and the row reflects the new state
- **AND** the change is recorded in the audit log by the backend

#### Scenario: Missing reason blocks the change

- **WHEN** the user submits the flag modal without a reason
- **THEN** submission is blocked with a validation message and no API call is made

### Requirement: Percentage rollout and target segment

The system SHALL support enabling a flag for a percentage of users (0–100) and/or a target
segment, validating that the rollout percentage is within range before submission.

#### Scenario: Partial rollout

- **WHEN** the user sets rollout to 25 percent with a target segment and confirms with a reason
- **THEN** the system submits `{enabled: true, rolloutPercent: 25, targetSegment}` for the
  selected environment and the list displays the partial rollout state

#### Scenario: Invalid percentage

- **WHEN** the user enters a rollout value outside 0–100
- **THEN** the form blocks submission with a validation error

### Requirement: Flag change failure handling

The system SHALL surface backend rejections of flag changes without altering the displayed
state, refetching the flag list to stay consistent.

#### Scenario: Backend rejects the change

- **WHEN** the flag mutation returns an error
- **THEN** the toggle visually reverts, an error notification shows the backend message, and the
  flag list is refetched

### Requirement: Flags UX states

The system SHALL render skeleton rows while the flag list loads and an error state with retry on
failure; flag rows SHALL be searchable by key and description.

#### Scenario: Searching flags

- **WHEN** the user types in the flag search box
- **THEN** the list narrows to flags whose key or description matches the term

### Requirement: Feature toggles consume the flat AdminFeatureFlag shape
The Feature Toggles screen SHALL query `featureFlags { key enabled description }` and consume the backend's flat `AdminFeatureFlag { key, enabled, description }` list. It SHALL NOT request `envs`, `rolloutPercent`, or `targetSegment` (which the backend does not define and which cause a GraphQL validation error).

#### Scenario: Load feature flags
- **WHEN** `useFlags` runs
- **THEN** it sends the GraphQL query selecting only `key`, `enabled`, `description`
- **AND** returns `FlagItem[]` where each item is `{ key, enabled: boolean, description: string | null }`

#### Scenario: Read-only status display
- **WHEN** the page renders a flag
- **THEN** it shows the `enabled` state as a status tag and the `description`
- **AND** no toggle mutation is issued, because the backend exposes no feature-flag mutation (GraphQL has no Mutation type and there is no REST `/flags/{key}/envs/{env}`)

#### Scenario: Flag detail modal is read-only
- **WHEN** the user opens a flag's detail modal
- **THEN** it displays `key`, `description`, and `enabled` in a read-only view with no submit action

