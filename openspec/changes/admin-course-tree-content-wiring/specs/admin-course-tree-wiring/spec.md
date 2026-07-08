## ADDED Requirements

### Requirement: Load course detail tree from adminCourse(id)

The course detail SHALL be loaded via GraphQL `adminCourse(id)`, mapping sections/lessons into the tree with each node carrying its backend id.

#### Scenario: Detail loads with real ids

- **WHEN** an admin opens a course detail
- **THEN** the tree shows sections and their lessons, each node's `id` set to the backend section/lesson id

#### Scenario: Missing course shows error

- **WHEN** `adminCourse(id)` returns null
- **THEN** the detail page shows its error state

### Requirement: Save syncs tree changes granularly

Saving the tree SHALL reconcile the draft against the loaded tree using the creator endpoints: create/update/delete sections and lessons, setting sortOrder from position; then refresh the detail so new nodes get their real ids.

#### Scenario: Create a new section and lesson

- **WHEN** the admin adds a section and a lesson under it and saves
- **THEN** the section is created (`POST /courses/{id}/sections`), then the lesson under it (`POST /sections/{sectionId}/lessons`), and the detail is refetched

#### Scenario: Rename and reorder existing nodes

- **WHEN** the admin renames or reorders existing sections/lessons and saves
- **THEN** each changed node is PATCHed with its new name and sortOrder

#### Scenario: Delete removed nodes

- **WHEN** the admin removes a section or lesson and saves
- **THEN** the corresponding backend node is deleted (`DELETE /sections/{id}` or `DELETE /lessons/{id}`)

#### Scenario: Assignment nodes are not persisted

- **WHEN** the draft contains "assignment" nodes (a FE-only concept)
- **THEN** they are skipped on save (backend has no assignment level) without failing the save
