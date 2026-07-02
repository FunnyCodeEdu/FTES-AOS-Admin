# payment-reconciliation

## ADDED Requirements

### Requirement: Received webhook list
The system SHALL list received VietQR webhooks at `/commerce/payments` with server-side pagination, date filters, search by transaction code, and a match status per row (matched, unmatched, duplicate).

#### Scenario: Admin reviews incoming webhooks
- **WHEN** an admin holding `commerce.view` filters webhooks by date and match status
- **THEN** the system requests the list with those parameters and renders each webhook with its match status
- **AND** shows skeleton, empty, and error-with-retry states appropriately

### Requirement: Reconciliation report
The system SHALL produce a reconciliation report for a selected date range, summarizing matched, mismatched, and missing entries between VietQR webhooks and orders, accessible only to callers holding `commerce.reconcile`.

#### Scenario: Admin runs a daily reconciliation
- **WHEN** an admin holding `commerce.reconcile` selects a date range on `/commerce/payments/reconciliation`
- **THEN** the system fetches the report and shows the matched/mismatched/missing summary plus a table of discrepancy rows

#### Scenario: Everything reconciles
- **WHEN** the report contains no discrepancies
- **THEN** the system shows a fully-reconciled state instead of an empty table

#### Scenario: Admin without reconcile permission
- **WHEN** a signed-in admin lacking `commerce.reconcile` navigates to the reconciliation route by URL
- **THEN** the system renders the Forbidden page and the reconciliation navigation entry is not rendered

### Requirement: Discrepancy resolution
The system SHALL let callers holding `commerce.reconcile` resolve each discrepancy row by matching it to an order, ignoring it with a mandatory note, or flagging it for investigation; every resolution is audited.

#### Scenario: Admin matches a stray webhook to an order
- **WHEN** the admin chooses match-order on a discrepancy row, searches and selects the order, and confirms
- **THEN** the system calls the resolve endpoint with the order id and the row status changes to resolved
- **AND** the resolution is recorded in the audit log by the backend

#### Scenario: Admin ignores a row without a note
- **WHEN** the admin selects ignore but leaves the note empty
- **THEN** the system blocks submission with a validation message on the note field

#### Scenario: Resolution rejected by the backend
- **WHEN** the resolve request fails (conflict or validation)
- **THEN** the system shows the error on the row and keeps it unresolved for retry

### Requirement: Revenue summary widget
The system SHALL display a revenue widget on the `/commerce` landing showing today, last-7-day, and last-30-day revenue with a breakdown by product type.

#### Scenario: Commerce admin opens the landing
- **WHEN** an admin holding `commerce.view` opens `/commerce`
- **THEN** the system fetches the revenue summary and renders the three period figures with the product-type breakdown
- **AND** shows a card skeleton while loading and an error state with retry if the summary fails
