## ADDED Requirements

### Requirement: The instructor area is gated on leaves a LECTURER actually holds

Every `/instructor/*` route SHALL be gated on at least one permission leaf that role LECTURER holds
today (`course.content.edit` for the course pages, `payroll.read` for earnings), and SHALL NOT depend
on `course.manage`, which V27 revoked from LECTURER. `course.manage` may still appear in the OR-list so
ADMIN/ADMIN_ACADEMIC keep access.

#### Scenario: LECTURER opens their course workspace

- **WHEN** a user holding the LECTURER leaf set (no `course.manage`) navigates to `/instructor/courses`
- **THEN** the page renders instead of redirecting to `/403`

#### Scenario: Academic admin keeps access

- **WHEN** a user holding `course.manage` navigates to the same route
- **THEN** the page renders

### Requirement: Salary and course list are reachable from the nav

`/instructor/courses` and `/instructor/earnings` SHALL each have their own nav entry in the "Giảng viên"
group, so reaching them does not depend on any other page rendering correctly.

#### Scenario: Instructor finds their salary

- **WHEN** a LECTURER loads the admin shell
- **THEN** the nav shows "Giảng viên" containing "Khoá của tôi" and "Lương của tôi"

#### Scenario: Admin payroll console stays hidden from instructors

- **WHEN** the same LECTURER (holding `payroll.read` but not `payroll.manage`) loads the shell
- **THEN** the admin "Lương" console nav is not shown

### Requirement: The instructor home page is driven by course ownership

`InstructorHomePage` SHALL list the caller's courses from `GET /courses/teaching` (ownership, enforced
by the backend from the JWT) merged with any COURSE-scope grants, and SHALL NOT replace the whole page
with a warning when there are no scoped grants — an owner-only instructor has none by construction.

#### Scenario: Owner-only instructor sees their courses and the salary shortcut

- **WHEN** a LECTURER owns courses but holds zero COURSE-scope grants
- **THEN** the page lists those courses and still shows the "Lương của tôi" shortcut

#### Scenario: Instructor with nothing assigned

- **WHEN** a LECTURER owns no course and holds no grant
- **THEN** only the course card shows an empty state; the rest of the page still renders

### Requirement: The signed-in user's identity is loaded from the backend

The `Me` query SHALL request `user { id username displayName }` and `useMe` SHALL expose the real user
id, so that any surface comparing the caller to a record (course ownership, authorship) is not comparing
against an empty string.

#### Scenario: Course workspace enables authoring for the owner

- **WHEN** the owner of a course opens `/instructor/courses/{id}` and `GET /courses/{id}/manage` succeeds
- **THEN** the workspace is editable and the "Kho challenge" and "Học thử" tabs are rendered
