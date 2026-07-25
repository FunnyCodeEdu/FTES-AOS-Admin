# admin-payroll-console

## ADDED Requirements

### Requirement: System payroll list gated by payroll.read

The system SHALL expose a payroll console at `/payroll` that renders every lecturer's
earning rows from `GET /api/v1/payroll/admin/earnings` via `coreClient`, gated by the
`payroll.read` permission leaf, and SHALL show summary stat cards computed from the loaded
rows (total budget, total paid, total pending, lecturer count) plus name search and status
filter.

#### Scenario: Admin with payroll.read views the list

- **WHEN** a user holding `payroll.read` opens `/payroll`
- **THEN** a table lists all lecturers' earning rows with amounts formatted as VND
- **AND** stat cards show total budget, total paid (CLOSE), total pending (PENDING), and lecturer count

#### Scenario: User without payroll.read is refused

- **WHEN** a user lacking `payroll.read` navigates to `/payroll`
- **THEN** the `/403` page is shown naming the missing `payroll.read` permission
- **AND** the "Lương" navigation entry is not rendered for that user

#### Scenario: Search and status filter

- **WHEN** the admin types an instructor name and selects a status filter
- **THEN** the table shows only rows matching the name and the selected status
- **AND** an empty state is shown when no row matches

### Requirement: Allowance edit restricted to payroll.manage on OPEN batches

The console SHALL let a user holding `payroll.manage` edit a batch's allowance via
`PUT /api/v1/payroll/admin/earnings/{id}/allowance` only while the batch `status` is `OPEN`,
and SHALL recompute the displayed `netPayable` from the returned earning.

#### Scenario: Manager updates allowance

- **WHEN** a user with `payroll.manage` sets a new allowance on an OPEN batch and confirms
- **THEN** `PUT .../{id}/allowance` is sent with `{ allowance }` and the detail refreshes with the new netPayable
- **AND** the payroll list query is invalidated

#### Scenario: Read-only user sees no edit control

- **WHEN** a user with only `payroll.read` opens a batch detail
- **THEN** no allowance edit, deduction, or status control is rendered in the DOM

#### Scenario: Allowance locked on non-OPEN batch

- **WHEN** a batch's status is PENDING or CLOSE
- **THEN** the allowance input and its update button are disabled

### Requirement: Deduction management restricted to payroll.manage

The console SHALL let a `payroll.manage` user add a deduction via
`POST /api/v1/payroll/admin/earnings/{id}/deductions`, edit via
`PUT /api/v1/payroll/admin/earnings/deductions/{id}`, and delete via
`DELETE /api/v1/payroll/admin/earnings/deductions/{id}`, with delete guarded by a
danger confirm.

#### Scenario: Add a deduction

- **WHEN** a manager submits a deduction with `type`, `amount`, and `description`
- **THEN** `POST .../{id}/deductions` is sent and the deduction table and totals refresh

#### Scenario: Delete requires danger confirm

- **WHEN** a manager clicks delete on a deduction
- **THEN** a `Popconfirm` with `okType="danger"` requires confirmation before `DELETE .../deductions/{id}` is sent

#### Scenario: Deduction blocked without manage permission

- **WHEN** a user with only `payroll.read` views the deduction table
- **THEN** no add, edit, or delete deduction control is rendered

### Requirement: Status control performs mark-paid with danger confirm

The console SHALL let a `payroll.manage` user change a batch status via
`POST /api/v1/payroll/admin/earnings/{id}/status`, and the PENDING→CLOSE (mark-paid)
transition SHALL require a danger confirm stating the consequence before the request is sent.

#### Scenario: Mark a pending batch as paid

- **WHEN** a manager changes a PENDING batch to CLOSE and confirms the danger dialog
- **THEN** `POST .../{id}/status` is sent with `{ status: "CLOSE" }` and the row shows CLOSE with paidAt set

#### Scenario: Invalid transition rejected

- **WHEN** the backend rejects a status change with `PAYROLL_INVALID_STATUS`
- **THEN** a Vietnamese message explaining the OPEN → PENDING → CLOSE flow is shown and the status is unchanged

#### Scenario: Status change forbidden without manage permission

- **WHEN** a user with only `payroll.read` somehow issues a status change
- **THEN** the backend returns 403 and a "không có quyền" message is shown

### Requirement: Payroll error codes mapped to Vietnamese messages

The console SHALL map payroll backend error codes to Vietnamese messages in
`src/shared/api/errors.ts` so raw codes never surface in the UI, reusing
`handleAdminMutationError` / `adminErrorMessage`.

#### Scenario: Known payroll error code

- **WHEN** a payroll mutation fails with `PAYROLL_INVALID_STATUS`, `PAYROLL_LOCKED`, or `PAYROLL_NOT_FOUND`
- **THEN** the corresponding Vietnamese message from the error map is shown instead of the raw code

#### Scenario: Unknown code falls back safely

- **WHEN** a payroll mutation fails with a code absent from the map
- **THEN** the backend envelope message is shown and no raw error object leaks to the UI
