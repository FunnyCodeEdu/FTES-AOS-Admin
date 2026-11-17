## 1. Contracts and data
- [x] 1.1 Implement new analytics migration, permission preset and constrained browser event ingress.
- [x] 1.2 Implement timezone-correct revenue, feature/cohort and safe paginated journey queries.

## 2. Restricted access
- [x] 2.1 Enforce isolated report-session allowlist; ordinary REST/GraphQL reject report tokens.
- [x] 2.2 Prepare dedicated account provisioner; do not activate before runtime guard is deployed.

## 3. Interfaces
- [x] 3.1 Add Admin market tab with range/cohort filters, actionable charts/tables and safe journey drilldown.
- [x] 3.2 Add Web best-effort telemetry with privacy redaction, dedupe and lifecycle cleanup.

## 4. Verification and release
- [x] 4.1 Test metric/time/payment boundaries, ingress validation/rate/idempotency and privilege denials.
- [x] 4.2 Test Admin restricted routing/empty/error views and Web tracker privacy/cleanup.
- [x] 4.3 Complete required builds/tests and inspect actual UI.
- [x] 4.4 Request final push/deploy approval for scoped changes and activate/check the dedicated account after release.
