# admin-resource-moderation

## ADDED Requirements

### Requirement: Centralized pending-resource queue page

The system SHALL render a "Hàng đợi duyệt học liệu" page at `/academic/moderation` that fetches
`GET /api/v1/resources/moderation/pending?page=&size=` through `coreClient` (the endpoint is not
under `/api/v1/admin`), sends a 0-based `page` while rendering a 1-based pagination control, and
lists each pending item with its title, a type chip, its subject, and its submitted-at timestamp.
The route SHALL be guarded by `requiredPermissions: ["resource.approve", "admin.resource.read"]`
(OR-semantics) and appear once in the left nav under the "Học thuật" group.

#### Scenario: Pending items are listed
- **WHEN** a caller holding `resource.approve` opens `/academic/moderation`
- **THEN** each pending item appears as a row showing its title, a type chip, its subject, and its submitted-at timestamp
- **AND** the request is sent to `/resources/moderation/pending` with a 0-based `page` and the table's total comes from the server payload

#### Scenario: Server-side scoping is not re-applied on the client
- **WHEN** the queue payload is rendered
- **THEN** the page shows exactly the items the backend returned without filtering them by subject on the client

#### Scenario: Empty queue is neutral about why
- **WHEN** the queue payload contains no items
- **THEN** the page shows the message "Không có mục nào chờ duyệt"
- **AND** the page does not claim either that the backlog is clear or that the caller lacks approval scope

#### Scenario: Load error is recoverable
- **WHEN** the queue request fails
- **THEN** an error alert with a "Thử lại" retry button is shown instead of an empty table

### Requirement: Type chip highlights exam contributions

The system SHALL render each item's `type` as a chip, visually distinguishing the exam types `PE`
and `FE` from ordinary material types (PDF/SLIDE/VIDEO/BOOK/SOURCE_CODE/ASSIGNMENT/NOTES/TEMPLATES).

#### Scenario: Exam types stand out
- **WHEN** the queue contains an item of type `PE` or `FE` alongside items of other types
- **THEN** the `PE` and `FE` chips are rendered in a distinct colour from the other type chips

### Requirement: Client-side type filter and search within the current page

The system SHALL provide a type filter and a free-text search box that narrow the rows of the
currently loaded page only, because the backend endpoint accepts `page` and `size` and no filter
parameters, and SHALL tell the user that the narrowing applies to the current page.

#### Scenario: Filtering by type narrows the loaded page
- **WHEN** the user selects the type `FE` in the filter
- **THEN** only the loaded rows whose type is `FE` remain visible
- **AND** no new request is sent to the queue endpoint

#### Scenario: Search matches title and subject
- **WHEN** the user types text into the search box
- **THEN** only the loaded rows whose title or subject label contains that text (case-insensitively) remain visible

#### Scenario: Narrowed-to-nothing is distinguished from an empty queue
- **WHEN** the filter or search hides every loaded row while the page did contain items
- **THEN** the page offers a control to clear the filters rather than claiming there is nothing pending

### Requirement: Detail drawer with preview that degrades independently

The system SHALL open a detail drawer for a queue row that shows the item's metadata — subject,
uploader, visibility, license, current version, created-at, and any previous rejection reason —
fetched from `GET /api/v1/admin/resources/{id}` via `apiClient`, plus a preview of the pending
content. For `type = FE` the preview SHALL render the album thumbnails returned by
`GET /api/v1/resources/{id}/images` via `coreClient`; for every other type it SHALL render the
version history from `GET /api/v1/admin/resources/{id}/versions` together with a download control.
A failure of any of these reads SHALL be confined to its own block.

#### Scenario: FE album is previewed as thumbnails
- **WHEN** the drawer is opened for an item of type `FE`
- **THEN** the album images are requested from `/resources/{id}/images` and rendered as thumbnails ordered by `sortOrder`
- **AND** each image's caption, when present, is shown with its thumbnail

#### Scenario: Non-FE item shows version info and a download control
- **WHEN** the drawer is opened for an item whose type is not `FE`
- **THEN** the version list is shown with each version's number, upload status, author, and timestamp
- **AND** a download control fetches the file through `GET /api/v1/resources/{id}/download` as a blob

#### Scenario: Preview failure does not block the decision
- **WHEN** the preview request fails
- **THEN** a warning with a retry control is shown inside the preview block only
- **AND** the metadata section and the approve and reject controls remain usable

#### Scenario: Metadata failure falls back to the row data
- **WHEN** `GET /api/v1/admin/resources/{id}` fails
- **THEN** the drawer still shows the title, type, subject, and submitted-at carried by the selected row
- **AND** the approve and reject controls remain usable

### Requirement: Approve a pending resource behind a confirm

The system SHALL let a caller holding `resource.approve` approve an item from the row and from the
detail drawer through `POST /api/v1/admin/resources/{id}/approve` (the admin route, so the backend
records an audit entry), behind a confirmation dialog stating the consequence, sending no request
body, and on success invalidating the queue and the resource queries rather than mutating the cache
optimistically.

#### Scenario: Approving from a row
- **WHEN** a caller holding `resource.approve` confirms the approve dialog for a row
- **THEN** `POST /api/v1/admin/resources/{id}/approve` is sent with no body
- **AND** on success the queue query is invalidated and the item disappears after the refetch

#### Scenario: Approve is gated on resource.approve
- **WHEN** a caller who holds only `admin.resource.read` views the queue
- **THEN** no approve control is rendered on any row or in the drawer

#### Scenario: Only the acting row is busy
- **WHEN** an approve request for one row is in flight
- **THEN** only that row's control shows a busy state and the table is not covered by a page-level spinner

### Requirement: Reject requires a non-blank reason

The system SHALL let a caller holding `resource.approve` reject an item through
`POST /api/v1/admin/resources/{id}/reject` with body `{reason}`, behind a confirm dialog whose
required reason textarea blocks submission while the reason is empty or whitespace-only, so that no
request that the backend would answer with `400 ADMIN_REASON_REQUIRED` can be sent.

#### Scenario: Empty reason cannot be submitted
- **WHEN** the reject dialog is open and the reason field is empty or contains only whitespace
- **THEN** the confirm button is disabled and no request is sent

#### Scenario: Rejecting with a reason
- **WHEN** the caller enters a reason and confirms
- **THEN** `POST /api/v1/admin/resources/{id}/reject` is sent with the trimmed reason in the body
- **AND** on success the queue query is invalidated and the item disappears after the refetch

#### Scenario: Backend reason rejection is localized
- **WHEN** the backend answers a reject with `ADMIN_REASON_REQUIRED`
- **THEN** a Vietnamese message is shown and the dialog stays open

### Requirement: Bulk approve reports per-item failures

The system SHALL let a caller holding `resource.approve` select multiple rows and approve them in
one action, and SHALL always present an outcome summary that names every item that failed together
with its own error message, so that a partial failure is never presented as a success.

#### Scenario: All selected items succeed
- **WHEN** every request in a bulk approve of N items succeeds
- **THEN** a success summary reports N approved items
- **AND** the selection is cleared and the queue query is invalidated

#### Scenario: Partial failure is reported per item
- **WHEN** some requests in a bulk approve fail
- **THEN** a warning summary reports how many of the N items were approved
- **AND** each failed item is listed with its title and its own error message

#### Scenario: Bulk approve does not spam one notification per failure
- **WHEN** several items in a bulk approve fail
- **THEN** the failures are reported once in the summary rather than as one global error notification per item

### Requirement: Hard delete is deliberately absent from the queue

The system SHALL NOT expose `DELETE /api/v1/admin/resources/{id}` anywhere on the moderation queue
page or its detail drawer, because that endpoint performs a hard delete and placing it next to an
approve control invites a destructive misclick.

#### Scenario: No delete control on the queue
- **WHEN** a caller holding `admin.resource.manage` and `resource.approve` opens the queue and the detail drawer
- **THEN** no delete control is rendered in either place
- **AND** deleting a resource remains available only from the resource list and resource detail pages
