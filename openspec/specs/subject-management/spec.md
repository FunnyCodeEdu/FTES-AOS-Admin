# subject-management

## Purpose
Quản lý môn học (Subject): CRUD, learning outcomes, prerequisites, gán lecturer/moderator.

## Requirements

### Requirement: Server-side subject list
The system SHALL list subjects at `/academic/subjects` with server-side pagination, sorting, search by code or name, and filters for status and lecturer.

#### Scenario: Admin browses subjects
- **WHEN** an admin holding `subject.view` opens the subject list and applies a status filter with a search term
- **THEN** the system requests the list with the combined parameters and renders the returned page
- **AND** shows a table skeleton while loading, an empty state when no subjects match, and an inline error with retry on failure

#### Scenario: Admin without subject.view
- **WHEN** a signed-in admin lacking `subject.view` navigates to `/academic/subjects` by URL
- **THEN** the system renders the Forbidden page identifying the missing permission
- **AND** the subjects navigation item is not rendered

### Requirement: Subject CRUD
The system SHALL allow creating, updating, and deleting subjects gated by `subject.create`, `subject.update`, and `subject.delete` respectively.

#### Scenario: Admin creates a subject
- **WHEN** an admin holding `subject.create` submits the create form with code, name, and description
- **THEN** the system calls `POST /api/v1/admin/subjects` and navigates to the new subject detail
- **AND** field-level validation errors from the backend are shown on the corresponding fields

#### Scenario: Admin deletes a subject still in use
- **WHEN** an admin holding `subject.delete` confirms deletion of a subject that still has courses or resources referencing it
- **THEN** the backend responds with a conflict and the system explains that the subject is still referenced
- **AND** the subject is not removed from the list

#### Scenario: Admin without mutation permissions
- **WHEN** an admin holding only `subject.view` opens the subject list and detail
- **THEN** the create, edit, and delete controls SHALL NOT be rendered

### Requirement: Learning outcomes management
The system SHALL let admins holding `subject.update` maintain an ordered list of learning outcomes on a subject.

#### Scenario: Admin edits outcomes
- **WHEN** the admin adds, reorders, or removes outcome entries and saves
- **THEN** the system persists the full ordered outcome list via the subject update endpoint
- **AND** the detail view reflects the saved order after success

### Requirement: Prerequisites with cycle protection
The system SHALL let admins holding `subject.update` set prerequisite subjects and SHALL surface backend cycle-detection errors without saving.

#### Scenario: Admin sets a valid prerequisite
- **WHEN** the admin selects one or more other subjects as prerequisites and saves
- **THEN** the system calls `PUT /api/v1/admin/subjects/:id/prerequisites` and shows the updated prerequisite list

#### Scenario: Prerequisite would create a cycle
- **WHEN** the backend rejects the prerequisite update because it would create a dependency cycle
- **THEN** the system displays the cycle path returned by the backend
- **AND** keeps the admin's selection editable without persisting it

### Requirement: Staff assignment per subject
The system SHALL allow assigning lecturers and moderators to a subject only for callers holding `subject.assign_staff`.

#### Scenario: Admin assigns a lecturer
- **WHEN** an admin holding `subject.assign_staff` adds a lecturer in the staff tab and confirms
- **THEN** the system calls `PUT /api/v1/admin/subjects/:id/staff` with the updated lists
- **AND** the assignment is recorded in the audit log by the backend

#### Scenario: Caller lacks subject.assign_staff
- **WHEN** an admin lacking `subject.assign_staff` opens the staff tab
- **THEN** the tab renders read-only and the assign and remove controls SHALL NOT be present
