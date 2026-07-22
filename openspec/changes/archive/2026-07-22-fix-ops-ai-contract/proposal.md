## Why

Three admin screens query/parse response shapes the FTES-AOS-Backend never returns. The endpoints are alive, so the request succeeds — but the FE asks for GraphQL fields that don't exist (hard GraphQL validation error → whole page throws) or force-casts an object into an array (`.map` on non-array → render crash). Shapes verified live against `apitest.ftes.vn` with the `admin.test` token.

1. **System Configuration** — FE query `systemConfigurations { group entries { key value type description } }` (grouped tree). BE `schema.graphqls` + `AdminPlatformReadController.systemConfigurations()` return a **flat** list `AdminConfiguration { key, value, sensitive }` (`value` is a raw String, often JSON; no `group`/`type`/`description`/`entries`). Probe: `[{key:"platform.ai.quota.default", value:"{\"requestsPerDay\":500}", sensitive:false}, …]`. The unknown-field selection fails GraphQL validation → `ConfigPage` errors out.
2. **Feature Toggles** — FE query `featureFlags { key description envs { dev/staging/prod { enabled rolloutPercent targetSegment } } }`. BE returns flat `AdminFeatureFlag { key, enabled, description }` — no `envs`/`rolloutPercent`/`targetSegment`. Same GraphQL validation failure → `FlagsPage` errors out.
3. **AI Insights** — `GET /api/v1/ai/admin/insights` returns an **object** `{windowDays, perFeature:[{feature,requests,failed,errorRate,tokenInput,tokenOutput,estimatedCostUsd}], totalTokens, estimatedCostUsd}` (envelope unwrapped by the axios interceptor → `r.data` is that object). FE casts `r.data as Record<string,unknown>[]` and `.map`s it → crash. Also `normalizeInsight` has no alias for BE's `tokenInput`/`tokenOutput`, so tokens would read 0 even if the array were right.

No GraphQL `Mutation` type exists and there is no REST `/config` or `/flags` controller on the BE, so config edits and flag toggles have **no backend to write to**. Those screens become read-only (display truth) with a `TODO` until a BE mutation ships. AI Insights is read-only by nature.

## What Changes

- `src/features/operations/api/config.api.ts`: query `systemConfigurations { key value sensitive }`; new flat `ConfigItem { key; value: string | null; sensitive: boolean }`; `useConfig()` returns `ConfigItem[]`; add `groupByPrefix()` helper (first dotted segment of `key`) so the page can still tab-group. Drop the phantom `useUpdateConfig` PUT `/config/{key}` and mock `useConfigHistory` (no BE endpoint) — leave a `TODO`.
- `src/features/operations/pages/ConfigPage.tsx`: consume flat `ConfigItem[]`, group by prefix into Tabs, render **read-only** rows (key / value / sensitive-masked). Remove save/diff/history UI (no BE write). `ConfigDiffModal.tsx` no longer imported.
- `src/features/operations/api/flags.api.ts`: query `featureFlags { key enabled description }`; new flat `FlagItem { key; enabled; description }`; `useFlags()` returns `FlagItem[]`. Drop phantom `useUpdateFlag` PUT `/flags/{key}/envs/{env}` — `TODO`.
- `src/features/operations/pages/FlagsPage.tsx`: read-only table key / description / enabled (Tag). Remove env/rollout/segment columns.
- `src/features/operations/components/FlagEditModal.tsx`: reduced to a read-only detail view (enabled + description) with a `TODO` noting no BE mutation exists.
- `src/features/ai/api/index.ts`: `useAiInsights` reads `data.perFeature` (fallback `[]`); `normalizeInsight` gains `tokenInput`/`tokenOutput` aliases. Return the whole insight object (`windowDays`, `totalTokens`, `estimatedCostUsd`, `rows`) so the page can show BE-authoritative totals.
- `src/features/ai/pages/AiInsightsPage.tsx`: consume `{rows, totalTokens, estimatedCostUsd, windowDays}`; totals from BE.

## Impact

- FE only: 3 api files + 3 pages + 1 modal in `src/features/operations` and `src/features/ai`. No shared/types edits, no other folders, no backend changes.
- Config/Flags become read-only until a BE mutation exists (tracked by `TODO`).
