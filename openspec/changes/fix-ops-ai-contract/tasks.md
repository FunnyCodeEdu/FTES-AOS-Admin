## 1. System Configuration (flat shape)

- [x] 1.1 `config.api.ts`: query `systemConfigurations { key value sensitive }`; add flat `ConfigItem { key; value: string | null; sensitive: boolean }`; `useConfig()` → `ConfigItem[]`; add `groupByPrefix()` helper.
- [x] 1.2 `config.api.ts`: remove phantom `useUpdateConfig` (PUT `/config/{key}`) and mock `useConfigHistory` — no BE endpoint; leave `TODO`.
- [x] 1.3 `ConfigPage.tsx`: consume flat items, Tabs grouped by key prefix, read-only rows (key / value / sensitive mask). Drop save/diff/history UI + `ConfigDiffModal` import.

## 2. Feature Toggles (flat shape)

- [x] 2.1 `flags.api.ts`: query `featureFlags { key enabled description }`; add flat `FlagItem { key; enabled; description }`; `useFlags()` → `FlagItem[]`; remove phantom `useUpdateFlag`; `TODO`.
- [x] 2.2 `FlagsPage.tsx`: read-only table (key / description / enabled Tag); drop env/rollout/segment columns.
- [x] 2.3 `FlagEditModal.tsx`: read-only detail view (enabled + description) + `TODO` (no BE mutation).

## 3. AI Insights (object → perFeature)

- [x] 3.1 `ai/api/index.ts`: `useAiInsights` reads `data.perFeature` (fallback `[]`); add `tokenInput`/`tokenOutput` aliases to `normalizeInsight`; return `{rows, windowDays, totalTokens, estimatedCostUsd}`.
- [x] 3.2 `AiInsightsPage.tsx`: consume the object; totals from BE (`totalTokens`, `estimatedCostUsd`).

## 4. Verification

- [x] 4.1 Probe apitest with `admin.test` token to confirm live shapes (config flat, flags flat, insights object) — done before mapping.
- [ ] 4.2 `npm run build` green (owner verifies — not run here per constraint).
- [ ] 4.3 `tsc --noEmit` clean (owner verifies — not run here per constraint).
