# resource-management

## Purpose
Quản lý học liệu (Resource): kho theo subject/type/status, approval workflow, versioning, CTV scope.

## Requirements

### Requirement: Server-side resource list
The system SHALL list resources at `/academic/resources` with server-side pagination, search by title, and filters for subject, type, and status.

#### Scenario: Admin filters resources
- **WHEN** an admin holding `resource.view` filters by subject, type, and status
- **THEN** the system requests the list with those parameters and renders the returned page
- **AND** shows skeleton, empty, and error-with-retry states appropriately

#### Scenario: Admin without resource.view
- **WHEN** a signed-in admin lacking `resource.view` navigates to `/academic/resources` by URL
- **THEN** the system renders the Forbidden page and the resources navigation item is not rendered

### Requirement: CTV scope enforcement
The system SHALL restrict CTV users with subject-scoped grants to resources within their assigned subjects, in both data and UI.

#### Scenario: CTV with one scope opens the list
- **WHEN** a CTV holding `resource.view` scoped to subject S opens the resource list
- **THEN** the list request is pinned to subject S and the subject filter cannot be cleared or changed to another subject
- **AND** the backend independently filters results to the CTV's scope

#### Scenario: CTV with multiple scopes
- **WHEN** a CTV holds scoped grants for more than one subject
- **THEN** the system presents a scope picker and pins all resource queries to the selected scope

#### Scenario: CTV attempts to access an out-of-scope resource
- **WHEN** a CTV navigates by URL to a resource detail outside their scope
- **THEN** the backend responds with 403 or not-found and the system shows the corresponding error page without leaking resource data

### Requirement: Resource creation and metadata editing
The system SHALL allow uploading new resources (gated `resource.create`) and editing metadata, license, and visibility (gated `resource.update`); submissions from CTV users enter the pending status.

#### Scenario: CTV uploads a resource
- **WHEN** a CTV holding scoped `resource.create` uploads a file with title, type, license, and visibility
- **THEN** the system creates the resource in pending status within the CTV's subject scope
- **AND** the resource awaits approval before becoming visible to learners

#### Scenario: License and visibility are set per resource
- **WHEN** an editor updates a resource's license or visibility and saves
- **THEN** the system persists the change and displays the new license and visibility on the detail page

### Requirement: Approval queue restricted to resource.approve
The system SHALL provide a review queue at `/academic/resources/review` where callers holding `resource.approve` approve or reject pending resources; rejection requires a written reason.

#### Scenario: Moderator approves a pending resource
- **WHEN** a caller holding `resource.approve` previews a pending resource and confirms approval
- **THEN** the system calls the approve endpoint and removes the item from the queue
- **AND** the decision is recorded in the audit log by the backend

#### Scenario: Moderator rejects with a reason
- **WHEN** the caller rejects a pending resource
- **THEN** the system requires a written reason before submission
- **AND** the reason becomes visible to the submitter on the resource detail

#### Scenario: CTV cannot access the review queue
- **WHEN** a CTV (who never holds `resource.approve`) navigates to `/academic/resources/review` by URL
- **THEN** the system renders the Forbidden page
- **AND** no approve or reject control is rendered anywhere for the CTV

### Requirement: Resource versioning
The system SHALL keep a version history per resource, allow uploading new versions (gated `resource.update`), and allow restoring a previous version as a new version.

#### Scenario: Editor uploads a new version
- **WHEN** an editor uploads a new file version for an approved resource
- **THEN** the system records it as a new pending version while the approved version stays live

#### Scenario: Editor restores an old version
- **WHEN** the editor confirms restoring a previous version from the version history
- **THEN** the system creates a new version based on the restored content instead of mutating history

### Requirement: Resource deletion
The system SHALL allow deleting a resource only for callers holding `resource.delete`, with a confirmation stating the consequences.

#### Scenario: Admin deletes a resource
- **WHEN** an admin holding `resource.delete` confirms the delete dialog
- **THEN** the system deletes the resource and the deletion is recorded in the audit log by the backend

#### Scenario: Caller lacks resource.delete
- **WHEN** a caller lacking `resource.delete` views a resource detail
- **THEN** the delete control SHALL NOT be rendered
