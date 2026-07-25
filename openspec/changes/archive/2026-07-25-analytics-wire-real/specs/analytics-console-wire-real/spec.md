## ADDED Requirements

### Requirement: Analytics console reads real dashboards via the admin REST proxy (no mock)

The analytics console SHALL source per-domain dashboard reads from the BE REST proxy
`/api/v1/admin/analytics/dashboards/{domain}` (guard `admin.analytics.read`), not from mock generators
or GraphQL queries with arguments. The BE widget shape (`widgets:[{key,title,series|value|table}]`) SHALL
be mapped generically into the FE `DomainResponse{kpis,charts}` and `OverviewResponse`. Endpoints the BE
proxy does not expose (moderation stats, contribution stats, CSV export, a global "overview" domain) SHALL
be derived client-side or left as clearly-marked placeholders — never fabricated as mock data. No
`MOCK_ENABLED` code path SHALL remain.

#### Scenario: Domain dashboard loads from the REST proxy

- **WHEN** an admin opens a domain dashboard (e.g. `/analytics/business`)
- **THEN** data comes from `GET /api/v1/admin/analytics/dashboards/business`, mapping `value` widgets to
  KPIs and `series`/`table` widgets to line/bar charts (axis = first non-numeric column, datasets =
  numeric columns)

#### Scenario: Overview is composed from real domain dashboards

- **WHEN** an admin views the overview KPIs
- **THEN** revenue is derived from the `business` dashboard, AI cost from the `ai` dashboard, and
  users/engagement from the `community` dashboard — because BE has no "overview" domain

#### Scenario: Breakdown and CSV derive from the same domain dashboard

- **WHEN** an admin pages the breakdown table or clicks Export CSV
- **THEN** rows come from the already-fetched domain dashboard widgets (paged client-side / serialized to
  CSV client-side), because the proxy exposes no breakdown or export endpoint

#### Scenario: Missing-endpoint widgets show empty placeholders

- **WHEN** moderation or contribution stats are requested
- **THEN** a deterministic empty (zeroed) placeholder is returned with a TODO to wire the real endpoint
  once BE adds `/analytics/moderation-stats` and `/analytics/contribution-stats`
