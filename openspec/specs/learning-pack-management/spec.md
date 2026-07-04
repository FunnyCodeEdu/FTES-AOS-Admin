# learning-pack-management

## Purpose
Quản lý Learning Pack/Collections: CRUD pack, gom course/resource, sắp thứ tự.

## Requirements

### Requirement: Server-side pack list
The system SHALL list learning packs at `/academic/packs` with server-side pagination, search by name, and status filter.

#### Scenario: Admin browses packs
- **WHEN** an admin holding `pack.view` opens the pack list
- **THEN** the system requests the list server-side and renders rows with name, item count, and status
- **AND** shows skeleton, empty, and error-with-retry states appropriately

#### Scenario: Admin without pack.view
- **WHEN** a signed-in admin lacking `pack.view` navigates to `/academic/packs` by URL
- **THEN** the system renders the Forbidden page and the packs navigation item is not rendered

### Requirement: Pack CRUD gated by pack.manage
The system SHALL allow creating, editing, and deleting packs only for callers holding `pack.manage`; others get read-only views.

#### Scenario: Admin creates a pack
- **WHEN** an admin holding `pack.manage` submits the create form with name and description
- **THEN** the system creates the pack and opens its detail page

#### Scenario: Admin deletes a pack
- **WHEN** an admin holding `pack.manage` confirms the delete dialog stating that learner access via this pack ends
- **THEN** the system deletes the pack and the action is recorded in the audit log by the backend

#### Scenario: Caller lacks pack.manage
- **WHEN** an admin holding only `pack.view` opens a pack detail
- **THEN** create, edit, delete, and reorder controls SHALL NOT be rendered

### Requirement: Pack composition with ordering
The system SHALL let callers holding `pack.manage` add courses and resources to a pack and reorder items by drag and drop, persisting the full ordered item list.

#### Scenario: Admin composes a pack
- **WHEN** the admin adds a course and a resource to the pack and reorders them
- **THEN** the system persists the full ordered item list via `PUT /api/v1/admin/packs/:id/items`
- **AND** renders the saved order after success

#### Scenario: Referenced item is no longer available
- **WHEN** the item save is rejected because a referenced course or resource is unavailable
- **THEN** the system marks the offending item in the list with the backend error and does not persist the change

### Requirement: Pack item source pickers
The system SHALL provide search-based pickers for adding courses and resources that query the server rather than loading full catalogs.

#### Scenario: Admin searches for a course to add
- **WHEN** the admin types in the course picker
- **THEN** the system issues a server-side search limited to published or approved items
- **AND** shows a loading indicator and an empty message when nothing matches
