## Context

FTES-AOS-Admin is a Vite + React + AntD admin CMS. The existing `apiClient` (`src/shared/api/client.ts`) talks to `/api/v1/admin/**` with an envelope `{code,message,data}` and already handles auth, refresh, and 403 permission errors. Most feature modules under `src/features/*/api/*.api.ts` still ship mock data because the backend admin API was not ready.

The backend team has now implemented the admin layer in FTES-AOS-Backend with:
- **Reads**: GraphQL endpoint `POST {VITE_API_BASE_URL}/api/v1/graphql` exposing admin queries (`me`, `adminUsers`, `adminSubjects`, `adminCourses`, `adminResources`, `communityPosts`, `communityReports`, `adminChallenges`, `adminEvents`, `marketplaceProducts`, `marketplaceOrders`, `aiProviders`, `aiUsage`, `workflowQueues`, `adminAuditLogs`, `rbacRoles`, `rbacPermissions`, `rbacGrants`, `featureFlags`, `systemConfigurations`, `adminBanners`, `adminAnnouncements`, `adminDashboard`, `analytics`).
- **Writes**: REST commands under `/api/v1/admin/**` using the same envelope.

We need to connect the frontend reads to GraphQL while leaving writes on the existing REST `apiClient`.

## Goals / Non-Goals

**Goals:**
- Provide a small, dependency-free GraphQL client (`src/shared/api/graphql.ts`) reusing the auth token store and the existing error model.
- Migrate `useMe` to GraphQL `me` while preserving `MeResponse` shape so `Can`/`hasScopedPermission` keep working.
- Convert read hooks in mock `.api.ts` files to real GraphQL queries where the backend query is confirmed.
- Convert mutations in those files to real REST endpoints where the endpoint follows the documented `/api/v1/admin/**` convention and is confirmed.
- Keep `MOCK_ENABLED=true` per-hook for anything not yet confirmed by the backend, and record those in `tasks.md`.
- Preserve existing type shapes, hook signatures, query keys, and UI behavior.
- Map dangerous-mutation backend error codes to user-visible messages.

**Non-Goals:**
- Adding Apollo, Relay, urql, or any other GraphQL client dependency.
- Changing UI components, routes, navigation, or permission catalog.
- Modifying backend code or schemas.
- Committing, pushing, or archiving the change.

## Decisions

1. **GraphQL transport: plain `fetch` over axios**
   - GraphQL has a single POST endpoint and returns `{data,errors}`. A simple `fetch` wrapper keeps the bundle small and avoids another dependency. It reuses `useAuthStore.getState().accessToken` for the `Authorization` header.
   - Error mapping mirrors `apiClient`: network failures become `NetworkError`, `ADMIN_ACCESS_DENIED` in `errors` becomes `ForbiddenError`, otherwise `ApiError`.

2. **GraphQL query interface**
   - `graphqlRequest<T>(query: string, variables?: object): Promise<T>` returns the typed `data` field. The caller is responsible for building the query string and typing the response.
   - Variables are serialized as JSON and sent in the standard GraphQL request body.

3. **Keep REST for writes**
   - The backend contract is CQRS-lite: reads via GraphQL, commands via REST. `apiClient` already handles envelopes, auth, refresh, and 403 mapping, so all mutations continue using it.

4. **Per-hook `MOCK_ENABLED` flag**
   - Each `.api.ts` keeps a local `const MOCK_ENABLED = false;` for hooks that are wired, and `true` for hooks waiting for backend confirmation. This lets us wire modules incrementally without breaking unrelated UI.

5. **Permission gating unchanged**
   - `useMe` feeds `permissions` and `scopedGrants` into the existing `Can` and `hasScopedPermission` helpers. No role-string comparisons are introduced.

6. **Auto-scope for CTV single scope**
   - Where a read query accepts a `scopeId` and the current user has exactly one scoped grant for that permission, the hook automatically injects that `scopeId` so the picker can stay hidden.

7. **Dangerous mutation error mapping**
   - A shared helper maps backend error codes to AntD `notification.error` / `message.error` text:
     - `ADMIN_REASON_REQUIRED`
     - `ADMIN_PRIVILEGE_ESCALATION`
     - `ADMIN_CTV_EXPIRES_*`
     - `ADMIN_ACCESS_DENIED`

## Risks / Trade-offs

- **[Risk] GraphQL query shapes may drift from backend schema** → Mitigation: keep queries minimal, use only fields that exist in the frontend types, and rely on TypeScript + `tsc --noEmit` to catch renames. Hooks whose schema is uncertain stay mocked.
- **[Risk] REST command endpoints may differ from convention** → Mitigation: only wire endpoints that match the obvious resource-path convention; document unconfirmed ones in `tasks.md` with `MOCK_ENABLED=true`.
- **[Risk] Envelope vs raw GraphQL error codes** → Mitigation: parse `errors[].extensions.code` when present and normalize to existing `ApiError`/`ForbiddenError` classes.

## Migration Plan

1. Implement `src/shared/api/graphql.ts`.
2. Migrate `useMe` to GraphQL.
3. Wire mock `.api.ts` modules one by one, toggling `MOCK_ENABLED=false` for confirmed hooks.
4. Run `npm run build` and `tsc --noEmit` until clean.
5. Run `openspec validate admin-be-wiring`.

## Open Questions

- Exact field list for each admin GraphQL type (we will request only fields present in the frontend type definitions).
- Full inventory of REST command endpoints for commerce refunds, wallet adjustments, and CTV grant lifecycle; these areas stay partially mocked until confirmed.
