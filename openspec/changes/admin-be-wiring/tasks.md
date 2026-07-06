## 1. GraphQL client & auth

- [x] 1.1 Create `src/shared/api/graphql.ts` with `graphqlRequest`, auth header, and error mapping (`ADMIN_ACCESS_DENIED` → `ForbiddenError`).
- [x] 1.2 Update `src/features/auth/api.ts` `useMe` to call GraphQL `me { permissions scopedGrants { permission scopeType scopeId expiresAt } }` and keep `MeResponse` shape.

## 2. Academic modules

- [x] 2.1 `src/features/academic/subjects/api/subjects.api.ts`: read `useSubjects` via GraphQL `adminSubjects`; keep REST mutations and `useSubject` detail on REST (no `adminSubject` query confirmed).
- [x] 2.2 `src/features/academic/courses/api/courses.api.ts`: read `useCourses` via GraphQL `adminCourses`; keep REST mutations and `useCourse` detail on REST (no `adminCourse` query confirmed).
- [x] 2.3 `src/features/academic/resources/api/resources.api.ts`: read `useResources`/`useReviewQueue` via GraphQL `adminResources`; keep REST mutations and detail/versions on REST (no `adminResource` query confirmed).
- [x] 2.4 `src/features/academic/lessons/api/lessons.api.ts`: keep mock (`MOCK_ENABLED=true`) — backend course-freemium-preview endpoints not confirmed.

## 3. Users & RBAC

- [x] 3.1 `src/features/users/api/users.api.ts`: read `useUsers`/`useUser` via GraphQL `adminUsers`/`adminUser`; keep REST account-action mutations and detail sub-queries on REST.
- [x] 3.2 RBAC hooks: already on REST `apiClient`; no mock to replace in this change.

## 4. Community & moderation

- [x] 4.1 `src/features/community/api/community.api.ts`: read `usePosts` via `communityPosts`, `useCommunityEvents` via `adminEvents`, and `useGroups`/`useGroup` via `adminGroups`/`adminGroup`; keep REST mutations.
- [x] 4.2 `src/features/moderation/api/moderation.api.ts`: read `useReports` via `communityReports` and `useWorkflowItems` via `workflowQueues`; keep `useReport`/`useModerationLog` mocked (no detail/log query confirmed); keep REST mutations.

## 5. Commerce

- [x] 5.1 `src/features/commerce/catalog/api/catalog.api.ts`: read `useProducts` via GraphQL `marketplaceProducts`; keep REST product mutations. Coupons/fulfillments remain mocked.
- [x] 5.2 `src/features/commerce/orders/api/orders.api.ts`: read `useOrders` via GraphQL `marketplaceOrders` and `useOrder` via `marketplaceOrder`; keep REST mutations.
- [x] 5.3 `src/features/commerce/refunds/api/refunds.api.ts`: keep mock (`MOCK_ENABLED=true`) — refund command endpoints not confirmed.
- [x] 5.4 `src/features/commerce/payments/api/payments.api.ts`: keep mock (`MOCK_ENABLED=true`) — reconciliation/revenue endpoints not confirmed.
- [x] 5.5 `src/features/commerce/wallets/api/wallets.api.ts`: keep mock (`MOCK_ENABLED=true`) — wallet adjustment endpoints not confirmed.

## 6. Operations

- [x] 6.1 `src/features/operations/api/banners.api.ts`: read `useBanners` via GraphQL `adminBanners`; keep REST mutations.
- [x] 6.2 `src/features/operations/api/announcements.api.ts`: read `useAnnouncements` via GraphQL `adminAnnouncements`; keep REST mutations.
- [x] 6.3 `src/features/operations/api/events.api.ts`: read `useEvents` via GraphQL `adminEvents`; keep `useEvent`/`useRegistrations` mocked (no detail/registration query confirmed); keep REST mutations.
- [x] 6.4 `src/features/operations/api/flags.api.ts`: read `useFlags` via GraphQL `featureFlags`; keep REST mutations.
- [x] 6.5 `src/features/operations/api/config.api.ts`: read `useConfig` via GraphQL `systemConfigurations`; keep REST mutations.
- [x] 6.6 `src/features/operations/api/notifications.api.ts`: keep mock (`MOCK_ENABLED=true`) — broadcast endpoints not confirmed.

## 7. Audit & analytics

- [x] 7.1 `src/features/audit/api/audit.api.ts`: read `useAuditLogs` via GraphQL `adminAuditLogs`; keep `useAuditLog`/`useSecurityEvents` mocked (global security events query not confirmed). `src/features/users/api/users.api.ts` `useSecurityLog` wired to `adminUserSecurityLog`; no mutations.
- [x] 7.2 `src/features/analytics/api/analytics.api.ts`: read `useAnalyticsOverview` via `adminDashboard` and `useAnalyticsDomain` via `analytics`; keep breakdown/moderation/contribution/CSV export mocked.

## 8. CTV program

- [x] 8.1 `src/features/ctv-program/api/*.api.ts` and `src/features/ctv-workspace/api/*.api.ts`: keep mock (`MOCK_ENABLED=true`) for reads/mutations — CTV GraphQL queries and REST command endpoints not confirmed.

## 9. Error handling & verification

- [x] 9.1 Add `src/shared/api/errors.ts` with `handleAdminMutationError` mapping `ADMIN_REASON_REQUIRED`, `ADMIN_PRIVILEGE_ESCALATION`, `ADMIN_CTV_EXPIRES_*`, `ADMIN_ACCESS_DENIED` to AntD `notification.error`; wire `onError` into dangerous mutations across users, academic, commerce, and operations modules.
- [x] 9.2 Run `npm run build` and fix errors until green.
- [x] 9.3 Run `tsc --noEmit` and fix errors until clean.
- [x] 9.4 Run `openspec validate admin-be-wiring` and ensure pass.

## 10. Fix list-query arg contract

- [x] 10.1 Rewrite every admin list GraphQL query in `src/features/*/api/*.api.ts` to use the BE schema contract (`filter: XFilter`, `page: PageInput`) and select only fields that exist on the BE type. Map `search` → `q`, `page` → `page.page`, `pageSize` → `page.size`. Drop any filter/sort fields the BE input type does not define.

## 11. BE cần bổ sung filter/sort (Hướng 2)

Filters/sort currently sent by the UI but **not present** in the current BE schema. FE now ignores them instead of sending invalid args; add them to BE input types when extending.

- **users**: `campus`, `sortBy`, `sortOrder`; `useSecurityLog` also sends `eventType`, `from`, `to` but `adminUserSecurityLog` only accepts `userId` + `page`.
- **subjects**: `lecturerId`, `sortBy`, `sortOrder`.
- **courses**: `subjectId`, `lecturerId`, `sortBy`, `sortOrder`.
- **resources**: `type`, `sortBy`, `sortOrder`.
- **community posts**: `pinned`, `featured`.
- **community events**: `groupId`.
- **community reports**: `search` (`q`), `severity`, `scopeId`.
- **moderation workflowQueues**: `page`, `pageSize`, `search`, `stage`, `type` — BE `workflowQueues` currently returns a non-paginated array with no args.
- **marketplace orders**: `userId`, `dateFrom`, `dateTo`, `amountMin`, `amountMax`, `sortBy`, `sortOrder`.
- **banners/announcements**: BE trả array không phân trang/lọc (`adminBanners`, `adminAnnouncements`) — hiện tại lọc/phân trang client-side; nếu list lớn cần BE thêm `filter` + `PageInput`.

## 12. Mock inventory (awaiting backend)

- `lessons.api.ts` — course preview/content endpoints.
- `catalog.api.ts` — coupons, fulfillments.
- `refunds.api.ts` — refund lifecycle commands.
- `payments.api.ts` — reconciliation, revenue summary, commerce config.
- `wallets.api.ts` — wallet adjustments/ledger.
- `notifications.api.ts` — broadcast create/cancel/preview.
- `ctv-program/*.api.ts`, `ctv-workspace/*.api.ts` — CTV scopes/members/invites/performance.
