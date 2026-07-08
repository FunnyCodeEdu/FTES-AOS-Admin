## ADDED Requirements

### Requirement: AI insights read the perFeature array from the insights object
The AI Insights screen SHALL treat the `GET /api/v1/ai/admin/insights` response `data` as an object `{ windowDays, perFeature, totalTokens, estimatedCostUsd }` and read the per-feature rows from `data.perFeature`. It SHALL NOT cast `data` to an array and `.map` it directly (which throws because `data` is an object).

#### Scenario: Parse insights response
- **WHEN** `useAiInsights` receives the envelope-unwrapped `r.data`
- **THEN** it reads `r.data.perFeature` (defaulting to `[]` when absent)
- **AND** returns `{ windowDays, rows, totalTokens, estimatedCostUsd }`

#### Scenario: Map backend token field names
- **WHEN** a per-feature row is normalized
- **THEN** `inputTokens` is read from `tokenInput` and `outputTokens` from `tokenOutput` (the backend `FeatureInsight` record field names), with older aliases kept as fallbacks

#### Scenario: Totals from backend
- **WHEN** the summary cards render
- **THEN** the estimated cost uses the backend `estimatedCostUsd` total directly rather than re-summing per-row costs
