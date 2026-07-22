# instructor-workspace

## ADDED Requirements

### Requirement: Scoped instructor console gated by COURSE grants

The system SHALL expose an instructor console at `/instructor/*` that a user can enter only
when they hold at least one active (non-expired) scoped grant with `scopeType` `COURSE`, and
SHALL render its single navigation entry without a navigation group so it stays a separate
workspace rail rather than mixing into the admin navigation.

#### Scenario: Lecturer with an active COURSE grant enters the console

- **WHEN** a user holding an active `COURSE` scoped grant opens `/instructor`
- **THEN** the instructor home renders one scope card per active COURSE grant
- **AND** shortcuts to "Khoá của tôi" (`/instructor/courses`) and "Lương của tôi" (`/instructor/earnings`) are shown

#### Scenario: User without any COURSE grant is refused

- **WHEN** a user with no active COURSE scoped grant navigates to `/instructor`
- **THEN** the `/403` page is shown with a scope message explaining an active course scope is required
- **AND** no instructor navigation entry appears for that user

#### Scenario: All course grants expired

- **WHEN** a lecturer whose COURSE grants have all expired opens `/instructor`
- **THEN** an empty state explains their course access has expired and how to request an extension

### Requirement: MyCourses shows only owned courses and never leaks others

The console SHALL list at `/instructor/courses` exactly the courses backed by the user's
active COURSE grants, and direct navigation to `/instructor/courses/:courseId` for a course
outside those grants SHALL yield the `/403` page without issuing any request for that course
or revealing its name.

#### Scenario: Course list matches grants

- **WHEN** a lecturer with active COURSE grants on two courses opens `/instructor/courses`
- **THEN** exactly those two courses are listed with their grant expiry
- **AND** no other course is listed

#### Scenario: Out-of-scope course URL is blocked

- **WHEN** a lecturer edits the URL to `/instructor/courses/:courseId` for a course outside their grants
- **THEN** the `ScopeGuard` redirects to `/403` stating the resource is outside their assigned scope
- **AND** no request for that course's data is issued and no course name is revealed

#### Scenario: Owned course detail reuses academic components

- **WHEN** a lecturer opens `/instructor/courses/:courseId` for a course they hold a COURSE grant on
- **THEN** the course detail renders using the existing academic course components behind the COURSE `ScopeGuard`
- **AND** no admin-only action exceeding the lecturer's scope is rendered

### Requirement: MyEarnings self-view scoped to the signed-in owner

The console SHALL display at `/instructor/earnings` only the signed-in user's own payroll
rows, sourced from `GET /api/v1/payroll/me/earnings` and `GET /api/v1/payroll/me/earnings/current`
via `coreClient`, and SHALL surface the current OPEN batch with `grossRevenue`, `allowance`,
`totalDeduction`, `netPayable`, `status`, and its deductions.

#### Scenario: Lecturer views own earnings

- **WHEN** a lecturer opens `/instructor/earnings`
- **THEN** the current batch card shows netPayable prominently with a status tag
- **AND** a history table lists the user's past earning rows with amounts formatted as VND

#### Scenario: No earnings yet

- **WHEN** a lecturer with no payroll rows opens `/instructor/earnings`
- **THEN** an empty state "Chưa có kỳ lương nào" is shown and no error is raised

#### Scenario: Requests carry no explicit owner id

- **WHEN** the console requests `/payroll/me/earnings`
- **THEN** the request is sent through `coreClient` without an owner id in the URL or query
- **AND** the owner is enforced from the JWT by the backend

### Requirement: Request payout transitions the current batch OPEN to PENDING

The console SHALL let the lecturer request payout of the current batch only when its
`status` is `OPEN` and `netPayable` is at least 50000, SHALL confirm the consequence before
sending `POST /api/v1/payroll/me/earnings/request-payout`, and SHALL reflect the returned
`PENDING` status on success.

#### Scenario: Successful payout request

- **WHEN** a lecturer whose current batch is OPEN with netPayable ≥ 50000 confirms "Yêu cầu chi trả"
- **THEN** `POST /payroll/me/earnings/request-payout` is sent and on success the batch shows status PENDING
- **AND** the payout button becomes disabled and the earnings queries are invalidated

#### Scenario: Balance below minimum is rejected

- **WHEN** the backend rejects the payout with 400 `PAYROLL_BALANCE_NOT_ENOUGH`
- **THEN** a Vietnamese message stating the 50.000đ minimum is shown and the batch status is unchanged

#### Scenario: Confirm before transition

- **WHEN** the lecturer clicks "Yêu cầu chi trả"
- **THEN** a confirm dialog states the batch will move from OPEN to PENDING for admin approval before any request is sent

### Requirement: Grant expiry awareness in the instructor console

The console SHALL warn the lecturer when a COURSE grant expires within 7 days and SHALL
remove that course's access from the UI once the refreshed profile no longer contains the grant.

#### Scenario: Course grant nearing expiry

- **WHEN** a lecturer's COURSE grant expires in fewer than 7 days
- **THEN** a warning on that course card names the expiry date and suggests contacting the admin

#### Scenario: Grant revoked mid-session

- **WHEN** an admin revokes a COURSE grant and the lecturer's profile refreshes
- **THEN** the corresponding course card disappears and staying on that course's page redirects to `/403`
