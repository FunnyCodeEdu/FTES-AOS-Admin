# order-management

## ADDED Requirements

### Requirement: Server-side order list
The system SHALL list orders at `/commerce/orders` with server-side pagination and sorting, search by order code or buyer email, and filters for status, date range, and amount range.

#### Scenario: Admin filters stuck orders
- **WHEN** an admin holding `commerce.view` filters by status pending-payment and a date range
- **THEN** the system requests the list with those parameters and renders the returned page with total count
- **AND** shows a table skeleton while loading, an empty state when nothing matches, and an inline error with retry on failure

#### Scenario: Deep link from the users console
- **WHEN** the list is opened with a `userId` query parameter
- **THEN** the system pre-applies the user filter and shows it as a removable active filter

#### Scenario: Admin without commerce.view
- **WHEN** a signed-in admin lacking `commerce.view` navigates to `/commerce/orders` by URL
- **THEN** the system renders the Forbidden page identifying the missing permission
- **AND** the commerce navigation group is not rendered

### Requirement: Order detail with payment timeline
The system SHALL render an order detail page showing order items, amounts, buyer, and a chronological payment event timeline.

#### Scenario: Admin inspects a stuck order
- **WHEN** an admin holding `commerce.view` opens an order detail
- **THEN** the system shows the order items and a timeline of payment events (created, webhook received, matched, completed, failed) with timestamps
- **AND** renders a skeleton mirroring the info-plus-timeline layout while loading

### Requirement: Payment re-check action
The system SHALL let admins holding `commerce.order.manage` trigger a payment status re-check for an order.

#### Scenario: Admin re-checks payment
- **WHEN** the admin clicks the re-check action on a pending order
- **THEN** the system calls `POST /api/v1/admin/orders/:id/recheck-payment` and refreshes the timeline with the result

### Requirement: Manual completion with mandatory reason
The system SHALL allow admins holding `commerce.order.manage` to manually complete an order, requiring a written reason and a confirmation stating that entitlements will be granted.

#### Scenario: Admin completes an order whose webhook was lost
- **WHEN** the admin confirms the completion dialog with a reason
- **THEN** the system calls the complete endpoint and the order status becomes completed
- **AND** the action with its reason is recorded in the audit log by the backend

#### Scenario: Order state changed concurrently
- **WHEN** the completion request returns a conflict because the webhook arrived in the meantime
- **THEN** the system shows a conflict message and refetches the order detail without applying the manual action

### Requirement: Order cancellation with mandatory reason
The system SHALL allow admins holding `commerce.order.manage` to cancel an order with a written reason and confirmation.

#### Scenario: Admin cancels an unpayable order
- **WHEN** the admin confirms the cancel dialog with a reason
- **THEN** the system calls the cancel endpoint and the status becomes cancelled
- **AND** the cancellation is recorded in the audit log by the backend

#### Scenario: Admin without order management permission
- **WHEN** an admin holding `commerce.view` but not `commerce.order.manage` opens an order detail
- **THEN** the re-check, complete, and cancel controls SHALL NOT be rendered and the detail is read-only
