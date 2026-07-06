## Why

The admin CMS frontend currently runs mostly on in-memory mocks or legacy REST paths for read data, while the FTES-AOS-Backend admin API and GraphQL schema are now fully implemented. We need to wire the frontend to the real backend: reads go through the admin GraphQL endpoint, writes keep using the existing `/api/v1/admin` REST envelope, and permission gating stays leaf/scoped-permission based.

## What Changes

- Add a lightweight GraphQL client at `src/shared/api/graphql.ts` (no Apollo) that targets `POST {VITE_API_BASE_URL}/api/v1/graphql`, attaches the access token, parses `{data,errors}`, and maps `ADMIN_ACCESS_DENIED` to `ForbiddenError`.
- Migrate `useMe` in `src/features/auth/api.ts` from `apiClient.get("/auth/me")` to a GraphQL `me { permissions scopedGrants { permission scopeType scopeId expiresAt } }` query while keeping the existing `MeResponse` shape.
- Wire read queries in mock `.api.ts` modules to the corresponding admin GraphQL queries already available in the backend (`adminUsers`, `adminSubjects`, `adminCourses`, `adminResources`, `communityPosts`, `communityReports`, `adminEvents`, `marketplaceProducts`, `marketplaceOrders`, `workflowQueues`, `adminAuditLogs`, `featureFlags`, `systemConfigurations`, `adminBanners`, `adminAnnouncements`, `adminDashboard`, `analytics`).
- Wire mutations in those modules to documented `/api/v1/admin/**` REST command endpoints, reusing `apiClient` and the existing envelope format.
- Keep `MOCK_ENABLED=true` only for hooks whose backend query/endpoint is not yet confirmed; document them in `tasks.md`.
- Reuse existing permission helpers (`hasScopedPermission`, `Can`) and scoped-grant auto-scope behavior; do not introduce role-string checks.
- Preserve existing confirm-modal + audit-reason flows for dangerous mutations and map backend error codes (`ADMIN_REASON_REQUIRED`, `ADMIN_PRIVILEGE_ESCALATION`, `ADMIN_CTV_EXPIRES_*`, `ADMIN_ACCESS_DENIED`) to AntD notifications/messages.

## Capabilities

### New Capabilities

- `admin-graphql-client`: Lightweight GraphQL transport for admin read queries.

### Modified Capabilities

- `admin-auth-session`: `useMe` now fetches from GraphQL instead of REST `/auth/me`; response shape stays compatible.
- `user-directory`, `user-detail`, `user-account-actions`: read users from `adminUsers`/`adminUser`, mutations remain REST.
- `subject-management`, `course-management`, `resource-management`, `quiz-bank-management`, `learning-pack-management`: read from `adminSubjects`, `adminCourses`, `adminResources`; mutations remain REST.
- `community-posts-management`, `community-groups-management`, `community-moderation-queue`, `community-events-moderation`: read posts/groups/reports/events from GraphQL; mutations remain REST.
- `commerce-catalog`, `order-management`, `refund-management`, `wallet-management`, `payment-reconciliation`: read products/orders from GraphQL; mutations remain REST where endpoints exist.
- `operations-banner-announcement`, `operations-system-configuration`, `operations-feature-toggle`, `operations-official-events`, `operations-notification-broadcast`: read banners/announcements/config/flags/events from GraphQL; mutations remain REST.
- `audit-log-viewer`, `security-log-viewer`: read audit/security logs from GraphQL where available.
- `analytics-tiered-dashboard`, `analytics-domain-dashboards`: read from GraphQL `analytics`/`adminDashboard`.
- `ctv-workspace`, `ctv-grant-lifecycle`, `ctv-invitation`, `ctv-kpi-tracking`, `ctv-onboarding`: keep mock for unconfirmed backend endpoints; otherwise wire reads.

## Impact

- `src/shared/api/graphql.ts` (new)
- `src/features/auth/api.ts`
- `src/features/*/api/*.api.ts` mock modules
- No new runtime dependencies beyond existing `axios`/`fetch`.
- No UI/UX changes; no backend changes.
