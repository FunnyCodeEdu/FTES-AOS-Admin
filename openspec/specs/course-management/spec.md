# course-management

## Purpose
Quản lý khoá học (Course): CRUD, tree editor section-lesson-assignment, pricing/packages, publish workflow.

## Requirements

### Requirement: Server-side course list
The system SHALL list courses at `/academic/courses` with server-side pagination, sorting, search by name, and filters for subject, status, and lecturer.

#### Scenario: Admin filters courses by subject and status
- **WHEN** an admin holding `course.view` applies subject and status filters
- **THEN** the system requests the list with those parameters and renders the returned page with total count
- **AND** shows skeleton, empty, and error-with-retry states appropriately

#### Scenario: Admin without course.view
- **WHEN** a signed-in admin lacking `course.view` navigates to `/academic/courses` by URL
- **THEN** the system renders the Forbidden page and the courses navigation item is not rendered

### Requirement: Course creation and editing
The system SHALL allow creating courses (gated `course.create`) and editing course information, content tree, and pricing (gated `course.update`); callers with only `course.view` get a read-only detail.

#### Scenario: Admin creates a draft course
- **WHEN** an admin holding `course.create` submits the create form with subject, name, and summary
- **THEN** the system creates the course in draft status and opens its detail page

#### Scenario: Viewer opens a course detail
- **WHEN** an admin holding `course.view` but not `course.update` opens a course detail
- **THEN** all tabs render read-only and no edit, save, or drag-and-drop controls are present

### Requirement: Section-lesson-assignment tree editor
The system SHALL provide a three-level tree editor (section → lesson → assignment) with add, edit, delete, and drag-and-drop reordering, persisted as a whole on explicit save.

#### Scenario: Admin restructures and saves the tree
- **WHEN** an admin holding `course.update` reorders nodes and adds a lesson, then clicks save
- **THEN** the system sends the full tree to `PUT /api/v1/admin/courses/:id/tree` and replaces the local draft with the persisted tree from the response

#### Scenario: Admin deletes a section with children
- **WHEN** the admin deletes a section that contains lessons or assignments
- **THEN** the system requires a confirmation stating how many child nodes will be removed before applying the deletion to the draft

#### Scenario: Tree save is rejected by validation
- **WHEN** the tree save returns a validation error
- **THEN** the system maps each error to the offending node in the editor
- **AND** keeps the unsaved draft intact for correction

#### Scenario: Admin navigates away with unsaved changes
- **WHEN** the tree draft has unsaved changes and the admin attempts to leave the page
- **THEN** the system blocks navigation with an unsaved-changes prompt until confirmed

### Requirement: Pricing, packages, and entitlements
The system SHALL let admins holding `course.update` manage a course's base price and its packages with entitlements.

#### Scenario: Admin adds a package
- **WHEN** the admin adds a package with name, price, and entitlement selections and saves
- **THEN** the system persists pricing via `PUT /api/v1/admin/courses/:id/pricing`
- **AND** shows field-level validation errors returned by the backend

### Requirement: Publish workflow gated by course.publish
The system SHALL move courses through the draft → review → published workflow, with the publish and unpublish actions rendered only for callers holding `course.publish`.

#### Scenario: Admin publishes a ready course
- **WHEN** an admin holding `course.publish` clicks Publish and accepts the confirmation stating the course becomes visible to learners
- **THEN** the system calls `POST /api/v1/admin/courses/:id/publish` and updates the status badge to published
- **AND** the publish action is recorded in the audit log by the backend

#### Scenario: Publish blocked by unmet conditions
- **WHEN** the publish request is rejected because preconditions are unmet (empty tree or missing pricing)
- **THEN** the system renders the returned checklist of unmet conditions inside the publish tab

#### Scenario: Unpublish requires a reason
- **WHEN** the admin unpublishes a published course
- **THEN** the system requires a written reason and a confirmation before calling the unpublish endpoint

#### Scenario: Caller lacks course.publish
- **WHEN** an admin lacking `course.publish` opens the publish tab
- **THEN** the workflow status remains visible but the publish and unpublish buttons SHALL NOT be rendered
- **AND** a direct API attempt would be rejected by the backend with 403
