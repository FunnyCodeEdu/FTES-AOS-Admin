# community-moderation-queue Specification

## Purpose
TBD - created by archiving change admin-community-console. Update Purpose after archive.
## Requirements
### Requirement: Report queue listing with server-side pagination

The system SHALL display reported posts, comments, and resources at `/moderation/queue` in a
paginated table using server-side pagination, sorting, and filtering, with tabs per target type
and filters for status, severity, and scope, plus free-text search.

#### Scenario: Moderator opens the queue

- **WHEN** a user holding `community.report.view` opens `/moderation/queue`
- **THEN** the system fetches `GET /api/v1/admin/moderation/reports` with page, pageSize, and
  active filters, and renders the returned page of reports with total count
- **AND** changing tab, filter, search, or page triggers a new server-side query rather than
  client-side filtering

#### Scenario: User without permission opens the queue

- **WHEN** a user lacking `community.report.view` navigates directly to `/moderation/queue`
- **THEN** the system renders the 403 Forbidden page listing the missing permission
- **AND** the Moderation Queue nav item is not rendered for that user

### Requirement: Scope-restricted queue for CTV

The system SHALL restrict the report queue for users whose `community.report.view` permission is
a scoped grant, showing only reports belonging to their granted scopes and providing a scope
picker when the user holds more than one scope.

#### Scenario: CTV with a single group scope

- **WHEN** a CTV whose only grant is `{community.report.view, scopeType: "group", scopeId: G}`
  opens the queue
- **THEN** the system automatically appends `scopeId=G` to the reports query and displays only
  reports for group G

#### Scenario: CTV attempts to access a report outside scope

- **WHEN** a CTV requests the detail of a report whose target is outside every granted scope
- **THEN** the system does not display the report content and shows an out-of-scope error state
  reflecting the backend 403 response

### Requirement: Resolve report with mandatory reason

The system SHALL allow users holding `community.report.resolve` to approve, reject, or remove
reported content, requiring a confirmation dialog that states the consequence and a mandatory
reason before submitting the mutation, and SHALL record the action in the moderation log.

#### Scenario: Remove reported content

- **WHEN** a user with `community.report.resolve` chooses Remove on a report and confirms with a
  reason of at least 10 characters
- **THEN** the system calls `POST /api/v1/admin/moderation/reports/:id/resolve` with
  `{action: "remove", reason}`, removes the report from the queue on success
- **AND** a corresponding entry becomes visible in the moderation log

#### Scenario: Confirmation without reason is blocked

- **WHEN** the user submits the confirm dialog with an empty reason
- **THEN** the system blocks submission and shows a validation message, and no API call is made

#### Scenario: Report already handled by another moderator

- **WHEN** the resolve mutation returns a conflict because the report was already resolved
- **THEN** the system shows a "report already handled" notification and refetches the queue

#### Scenario: User without resolve permission

- **WHEN** a user holds `community.report.view` but not `community.report.resolve`
- **THEN** the Approve, Reject, and Remove buttons are not rendered in the report detail

### Requirement: Escalate report to domain admin

The system SHALL allow users holding `community.report.escalate` to escalate a report to the
community domain admin with a mandatory reason, after which the report leaves the escalating
user's queue.

#### Scenario: CTV escalates beyond their authority

- **WHEN** a CTV without `community.report.resolve` opens a report in scope and submits Escalate
  with a reason
- **THEN** the system calls `POST /api/v1/admin/moderation/reports/:id/escalate`, the report
  status becomes escalated, and it disappears from the CTV queue
- **AND** the report appears in the queue of users holding unscoped `community.report.view`

### Requirement: Read-only moderation log

The system SHALL provide a read-only moderation log at `/moderation/log` for users holding
`community.modlog.view`, listing every moderation action with server-side pagination and filters
for actor, action, target type, and time range, and SHALL NOT expose any mutation on log entries.

#### Scenario: Filtering the moderation log

- **WHEN** a user with `community.modlog.view` filters by actor and a date range
- **THEN** the system queries `GET /api/v1/admin/moderation/log` with those parameters and
  renders matching entries with actor, action, target, reason, and timestamp
- **AND** no edit or delete affordance is rendered for any entry

#### Scenario: User without log permission

- **WHEN** a user lacking `community.modlog.view` navigates to `/moderation/log`
- **THEN** the system renders the 403 Forbidden page listing the missing permission

### Requirement: Queue UX states

The system SHALL render loading skeletons mirroring the table layout, a contextual empty state,
and an error state with retry for the queue and the moderation log.

#### Scenario: Empty scoped queue

- **WHEN** the reports query succeeds with zero items for a CTV scope
- **THEN** the system shows an empty state explaining there are no reports within the user's scope

#### Scenario: Queue fetch fails

- **WHEN** the reports query fails with a server error
- **THEN** the system shows an error state with a retry action that refetches the query

