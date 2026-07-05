# analytics-tiered-dashboard Specification

## Purpose
TBD - created by archiving change admin-analytics-audit. Update Purpose after archive.
## Requirements
### Requirement: Permission-driven dashboard composition

The system SHALL compose the home dashboard at `/` from widgets selected by the user's
permission list — not by role string — so that each admin tier sees exactly the analytics scope
their permissions allow.

#### Scenario: Super Admin overview

- **WHEN** a user holding `analytics.view.overview` opens `/`
- **THEN** the dashboard renders KPI cards for users, revenue, engagement, and AI cost fetched
  from `GET /api/v1/admin/analytics/overview`
- **AND** domain widgets render for every `analytics.view.<domain>` permission the user holds

#### Scenario: Domain admin sees only their domains

- **WHEN** a user holds `analytics.view.community` but no other analytics permission
- **THEN** the dashboard renders only the community widget and no overview KPI cards
- **AND** no other domain widget is rendered

#### Scenario: No analytics permission at all

- **WHEN** a user holds no analytics permission
- **THEN** the dashboard renders a welcome card without metrics instead of a 403 page

### Requirement: Moderator queue stats widget

The system SHALL render a moderation statistics widget for users holding
`analytics.view.moderation`, showing pending counts by report type, items resolved in the last
7 days, and average resolution time.

#### Scenario: Moderator opens the dashboard

- **WHEN** a Moderator holding `analytics.view.moderation` opens `/`
- **THEN** the queue stats widget renders data from
  `GET /api/v1/admin/analytics/moderation-stats`
- **AND** no revenue or AI cost widget is rendered for that user

### Requirement: CTV contribution widget scoped to grants

The system SHALL render a contribution statistics widget for users whose
`analytics.view.contribution` permission is a scoped grant, automatically restricting queries to
the granted scopes and offering a scope picker when the user holds multiple scopes.

#### Scenario: CTV with one scope

- **WHEN** a CTV with a single scoped grant opens `/`
- **THEN** the contribution widget queries
  `GET /api/v1/admin/analytics/contribution-stats` with that scope's type and id and shows
  approved, rejected, and pending contribution counts

#### Scenario: CTV cannot see data outside scope

- **WHEN** a CTV's dashboard requests contribution stats
- **THEN** the request always carries a scope from the user's grants, and no unscoped analytics
  widget (overview or domain) is rendered for a user without those permissions

### Requirement: Widget-level fault isolation

The system SHALL load each dashboard widget through an independent query so that a failing
widget shows a local error card with retry while other widgets continue to render.

#### Scenario: One widget fails

- **WHEN** the overview query fails while domain queries succeed
- **THEN** the overview area shows an error card with a retry action and the domain widgets
  render normally

### Requirement: Dashboard loading states

The system SHALL render skeletons mirroring each widget layout (KPI numbers with sparkline
placeholders, chart blocks) while widget queries are in flight.

#### Scenario: Initial dashboard load

- **WHEN** the dashboard queries are loading
- **THEN** each widget area shows a skeleton matching its final layout instead of a global
  spinner

