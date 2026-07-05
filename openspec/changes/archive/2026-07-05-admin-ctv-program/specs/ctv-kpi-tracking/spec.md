# ctv-kpi-tracking

## ADDED Requirements

### Requirement: Personal KPI dashboard for CTV
The system SHALL provide each CTV a personal dashboard at `/ctv/kpi` showing resources processed, posts moderated, and contribution counts over time, broken down by scope, covering only their own activity.

#### Scenario: CTV views own KPI
- **WHEN** a CTV opens `/ctv/kpi`
- **THEN** their processed-resource count, moderated-post count, and a contribution time series render for the selected range
- **AND** a per-scope breakdown shows only their granted scopes

#### Scenario: No activity yet
- **WHEN** a newly onboarded CTV opens `/ctv/kpi`
- **THEN** an empty state explains that contributions will appear as they work

### Requirement: Team performance dashboard for domain admins
The system SHALL provide domain admins holding `ctv.performance.read` a team dashboard ranking their domain's CTVs by KPI, filterable by time range and scope, with drill-down to member detail.

#### Scenario: Admin reviews team performance
- **WHEN** an admin with `ctv.performance.read` opens `/ctv-program/performance`
- **THEN** CTVs of their domain are ranked with processed/moderated counts for the selected range
- **AND** clicking a row opens that member's detail

#### Scenario: Admin lacks ctv.performance.read
- **WHEN** a user without `ctv.performance.read` opens `/ctv-program/performance`
- **THEN** the 403 page is shown naming the missing permission

#### Scenario: CTV attempts team dashboard
- **WHEN** a CTV navigates to `/ctv-program/performance`
- **THEN** the 403 page is shown
- **AND** no team performance data is requested

### Requirement: KPI on member profile
The member detail page SHALL include a KPI tab showing the individual CTV's contribution metrics consistent with the CTV's own dashboard.

#### Scenario: Admin inspects one CTV's KPI
- **WHEN** an admin with `ctv.member.read` opens a member's KPI tab
- **THEN** the same metric definitions used on the CTV personal dashboard are displayed for that member

### Requirement: KPI data states
KPI dashboards SHALL handle loading with chart placeholders, empty ranges, and fetch errors with retry, without breaking the surrounding page.

#### Scenario: KPI endpoint fails
- **WHEN** a KPI request fails
- **THEN** the chart area shows an error state with a retry action
- **AND** the rest of the page remains functional
