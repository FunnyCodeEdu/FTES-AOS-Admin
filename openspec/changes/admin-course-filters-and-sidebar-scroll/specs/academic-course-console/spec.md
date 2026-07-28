# academic-course-console (delta)

## ADDED Requirements

### Requirement: Course list keyword search

The course list console SHALL provide a keyword search input that filters courses by name. The typed
query SHALL flow through the existing `search` list param (mapped to the backend `q` filter), reset the
page to 1, and clearing it SHALL remove the filter.

#### Scenario: Search by name

- **WHEN** an admin types a course name and submits the search
- **THEN** the list requests courses filtered by that keyword (page reset to 1)

#### Scenario: Clearing the search

- **WHEN** an admin clears the search input
- **THEN** the keyword filter is removed and the full (other-filters-applied) list returns

### Requirement: Course list status filter

The course list console SHALL provide a status filter allowing the admin to narrow the list to a single
course status — published (đang hoạt động), draft, review, or archived. The selection SHALL flow through
the existing `status` list param and clearing it SHALL remove the filter.

#### Scenario: Filter by published status

- **WHEN** an admin selects the "Đã xuất bản" status
- **THEN** the list shows only published courses

#### Scenario: Clearing the status filter

- **WHEN** an admin clears the status select
- **THEN** the status filter is removed
