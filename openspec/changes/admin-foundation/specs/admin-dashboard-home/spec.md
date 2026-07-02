# admin-dashboard-home

## ADDED Requirements

### Requirement: Widget list driven by permission tier
The dashboard SHALL render widgets from the backend-provided widget list, which is filtered by the user's permissions, and SHALL apply a client-side permission filter as defense in depth.

#### Scenario: Super Admin opens dashboard
- **WHEN** a user holding system-wide permissions opens `/`
- **THEN** system-level widgets (all domains, RBAC, audit summaries) render

#### Scenario: Domain admin opens dashboard
- **WHEN** an admin whose permissions cover only one domain opens `/`
- **THEN** only widgets of that domain render
- **AND** widgets of other domains are neither rendered nor fetched

#### Scenario: Widget without matching permission slips through
- **WHEN** the widget list contains a widget whose `requiredPermissions` the user does not hold
- **THEN** the client filter drops it before render
- **AND** its data endpoint is never called

### Requirement: CTV scope statistics
The dashboard SHALL show a CTV whose access consists of scoped grants only the statistics of their assigned scopes.

#### Scenario: CTV opens dashboard
- **WHEN** a CTV with grants on two groups opens `/`
- **THEN** widgets show counts and pending work for exactly those two groups
- **AND** no system-wide or other-scope figure appears

#### Scenario: CTV with all grants expired
- **WHEN** a CTV whose grants have all expired opens `/`
- **THEN** the dashboard shows the "no access granted" empty state instead of stale scope data

### Requirement: Per-widget data loading and failure isolation
Each widget SHALL fetch its own data endpoint and handle loading and error states independently, so one failing widget does not break the dashboard.

#### Scenario: One widget's endpoint fails
- **WHEN** a single widget's data request returns an error
- **THEN** that widget shows an inline error with a retry action
- **AND** all other widgets render normally

#### Scenario: Dashboard initial load
- **WHEN** the widget list is loading
- **THEN** a skeleton grid mirroring the expected layout is shown

### Requirement: Empty dashboard state
The dashboard SHALL show an explanatory empty state when the user has no widgets available.

#### Scenario: Account with no granted permissions
- **WHEN** an authenticated user with no permissions opens `/`
- **THEN** an empty state explains that no access has been granted and whom to contact
- **AND** no widget data request is issued
