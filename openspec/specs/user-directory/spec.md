# user-directory

## Purpose

(TBD — capability purpose for user-directory)

## Requirements

### Requirement: Server-side paginated user list
The system SHALL display the user list at `/users` using server-side pagination, sorting, and filtering, never loading the full dataset into the client.

#### Scenario: Admin opens the user list
- **WHEN** an admin holding `user.view` navigates to `/users`
- **THEN** the system requests page 1 with the default page size from `GET /api/v1/admin/users`
- **AND** renders a table skeleton while loading, then the returned rows with total count and pagination controls

#### Scenario: Admin changes page or sort
- **WHEN** the admin changes page, page size, or clicks a sortable column header
- **THEN** the system issues a new server request with the updated `page`, `pageSize`, `sortBy`, and `sortOrder` parameters
- **AND** keeps the previous rows visible (no full-page flash) until the new page arrives

### Requirement: Search by name or email
The system SHALL provide a search box that filters users by name or email on the server.

#### Scenario: Admin searches for a user
- **WHEN** the admin types at least one character into the search box and pauses (debounce)
- **THEN** the system requests the list with the `search` parameter and resets to page 1
- **AND** reflects the search term in the URL query string so the view is shareable

#### Scenario: Search returns no results
- **WHEN** the search yields zero users
- **THEN** the system shows an empty state with the message that no users were found
- **AND** offers a control to clear the search and filters

### Requirement: Filter by role, status, and campus
The system SHALL provide server-side filters for role, account status, and campus that can be combined with search.

#### Scenario: Admin combines filters
- **WHEN** the admin selects a role, a status, and a campus
- **THEN** the system sends all selected filter values in one list request
- **AND** displays active filters so each can be individually removed

### Requirement: Export user list
The system SHALL let admins holding `user.export` export the currently filtered user list as an asynchronous job.

#### Scenario: Admin exports with active filters
- **WHEN** an admin holding `user.export` clicks Export and confirms the dialog showing the active filters
- **THEN** the system submits the current filter set to the export endpoint and receives a job id
- **AND** polls job status and presents a download link when the job completes

#### Scenario: Export job fails
- **WHEN** the export job ends in a failed status
- **THEN** the system shows an error message with the failure reason
- **AND** offers a retry action that submits a new job

#### Scenario: Admin without export permission
- **WHEN** an admin lacking `user.export` views the user list
- **THEN** the Export button SHALL NOT be rendered

### Requirement: Access control for the users console
The system SHALL gate the `/users/*` navigation entry and routes on the `user.view` permission.

#### Scenario: Admin without user.view opens the URL directly
- **WHEN** a signed-in admin lacking `user.view` navigates to `/users` by URL
- **THEN** the system renders the Forbidden page identifying `user.view` as the missing permission
- **AND** the "Người dùng" navigation item is not rendered anywhere in the shell

### Requirement: List error handling
The system SHALL surface list request failures without losing entered filters.

#### Scenario: List request fails
- **WHEN** the list request fails with a network or server error
- **THEN** the system shows an inline error state with a retry control
- **AND** preserves the current search and filter values for the retry
