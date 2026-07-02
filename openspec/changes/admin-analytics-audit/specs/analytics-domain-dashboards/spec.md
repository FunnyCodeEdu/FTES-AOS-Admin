# analytics-domain-dashboards

## ADDED Requirements

### Requirement: Domain dashboard pages

The system SHALL provide a dashboard page at `/analytics/:domain` for each domain in learning,
subject, community, ai, gamification, and business, rendering KPI blocks and charts fetched from
the domain analytics endpoint, gated by the matching `analytics.view.<domain>` permission.

#### Scenario: Viewing a permitted domain

- **WHEN** a user holding `analytics.view.community` opens `/analytics/community`
- **THEN** the system fetches `GET /api/v1/admin/analytics/domains/community` with the active
  date range and renders its KPI blocks and charts

#### Scenario: Missing domain permission

- **WHEN** a user without `analytics.view.business` navigates directly to `/analytics/business`
- **THEN** the system renders the 403 Forbidden page listing the missing permission
- **AND** the Business analytics nav item is not rendered for that user

#### Scenario: Unknown domain parameter

- **WHEN** the URL contains a domain outside the supported list
- **THEN** the system renders a not-found state instead of calling the API

### Requirement: Date range selection synced to URL

The system SHALL provide a date range picker with 7, 30, and 90 day presets plus a custom range,
defaulting to 30 days, persisting the selection in the URL query string so dashboard links are
shareable, and refetching all page data when the range changes.

#### Scenario: Changing the range

- **WHEN** the user selects the 90 day preset
- **THEN** the URL query parameters update, and the KPI, chart, and breakdown queries refetch
  with the new from/to values

### Requirement: Breakdown table with server-side pagination

The system SHALL render the domain breakdown table using server-side pagination and sorting via
the breakdown endpoint.

#### Scenario: Paging the breakdown

- **WHEN** the user moves to page 2 of the breakdown table
- **THEN** the system queries
  `GET /api/v1/admin/analytics/domains/:domain/breakdown` with the new page parameter and
  renders the returned rows and total

### Requirement: CSV export

The system SHALL provide a CSV export of the domain dashboard data for the active date range,
gated by `analytics.export`, showing a loading state on the button during the download and an
error notification on failure.

#### Scenario: Exporting a domain dashboard

- **WHEN** a user holding `analytics.export` clicks Export CSV
- **THEN** the system requests
  `GET /api/v1/admin/analytics/domains/:domain/export` with the active range and downloads the
  returned CSV file

#### Scenario: User without export permission

- **WHEN** a user holds `analytics.view.community` but not `analytics.export`
- **THEN** the Export CSV button is not rendered on `/analytics/community`

### Requirement: Domain dashboard UX states

The system SHALL render chart-shaped skeletons while loading, an in-chart empty state when the
range contains no data, and error states with retry per section.

#### Scenario: Range with no data

- **WHEN** the domain query succeeds but a chart series is empty for the selected range
- **THEN** that chart shows an empty state message instead of an axis-only blank chart
