## ADDED Requirements

### Requirement: Deduction mutations call the real backend path

The admin payroll console SHALL update and delete a deduction via `PUT`/`DELETE`
`/payroll/admin/deductions/{deductionId}` (coreClient base `/api/v1`), matching the backend
`PayrollAdminController`. Creating a deduction stays on `POST /payroll/admin/earnings/{earningId}/deductions`.

#### Scenario: Edit an existing deduction

- **WHEN** an admin edits a deduction's amount/description
- **THEN** the request goes to `PUT /api/v1/payroll/admin/deductions/{deductionId}` and succeeds (no 404)

#### Scenario: Delete a deduction

- **WHEN** an admin deletes a deduction
- **THEN** the request goes to `DELETE /api/v1/payroll/admin/deductions/{deductionId}` and succeeds

### Requirement: Admin payroll console is gated on payroll.manage

The `/payroll` admin console route and its nav SHALL require `payroll.manage`, not `payroll.read`, so a
LECTURER (who holds `payroll.read` only for their own earnings) does not see the admin nav or land on a
page whose admin APIs return 403. The instructor self-earnings view remains at `/instructor/earnings`
under COURSE-scope.

#### Scenario: LECTURER does not see admin payroll

- **WHEN** a LECTURER without `payroll.manage` loads the admin shell
- **THEN** the "Lương" admin nav is hidden and `/payroll` is not accessible to them

#### Scenario: Admin sees payroll console

- **WHEN** a user with `payroll.manage` navigates to `/payroll`
- **THEN** the console renders

### Requirement: Instructor total counts distinct instructors

The "Tổng giảng viên" stat SHALL count distinct `instructorId` values, not the number of earning rows,
so it stays correct when an instructor has multiple earning periods.

#### Scenario: One instructor with multiple periods

- **WHEN** the list contains several earning rows that belong to the same instructor
- **THEN** the stat counts that instructor once

### Requirement: Payroll error codes map to backend PayrollError

The admin error-message map SHALL key on the backend `PayrollError` codes (`PAYROLL_ILLEGAL_TRANSITION`,
`PAYROLL_EARNING_NOT_FOUND`, `PAYROLL_EARNING_NOT_OPEN`, `PAYROLL_DEDUCTION_NOT_FOUND`,
`PAYROLL_INVALID_AMOUNT`, `PAYROLL_NO_OPEN_BATCH`, `PAYROLL_FORBIDDEN`, `PAYROLL_BALANCE_NOT_ENOUGH`) so a
backend error renders its localized message.

#### Scenario: Illegal status transition shows localized message

- **WHEN** the backend returns `PAYROLL_ILLEGAL_TRANSITION`
- **THEN** the UI shows the mapped Vietnamese message, not the raw code

### Requirement: Instructor course workspace shows only owner-authorized tabs

The instructor MyCourseDetail workspace SHALL show only tabs backed by owner/COURSE-scope authorization:
Tổng quan (view-only), Nội dung, Giá & gói, and Học thử. Tabs requiring global admin permission
(Publish → `course.publish`; Kho thử thách → `admin.challenge.manage`) SHALL be hidden until the backend
authorizes them by ownership.

#### Scenario: Instructor opens own course detail

- **WHEN** an owning LECTURER opens their course detail
- **THEN** the Publish and Kho-thử-thách tabs are not shown, and the Tổng quan tab is read-only

#### Scenario: Content and pricing remain editable

- **WHEN** the owning LECTURER edits the content tree or pricing/packages
- **THEN** those tabs remain editable (owner-authorized via the course module)
