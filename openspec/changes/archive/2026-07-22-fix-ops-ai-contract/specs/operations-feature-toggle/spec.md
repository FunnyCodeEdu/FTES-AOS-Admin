## ADDED Requirements

### Requirement: Feature toggles consume the flat AdminFeatureFlag shape
The Feature Toggles screen SHALL query `featureFlags { key enabled description }` and consume the backend's flat `AdminFeatureFlag { key, enabled, description }` list. It SHALL NOT request `envs`, `rolloutPercent`, or `targetSegment` (which the backend does not define and which cause a GraphQL validation error).

#### Scenario: Load feature flags
- **WHEN** `useFlags` runs
- **THEN** it sends the GraphQL query selecting only `key`, `enabled`, `description`
- **AND** returns `FlagItem[]` where each item is `{ key, enabled: boolean, description: string | null }`

#### Scenario: Read-only status display
- **WHEN** the page renders a flag
- **THEN** it shows the `enabled` state as a status tag and the `description`
- **AND** no toggle mutation is issued, because the backend exposes no feature-flag mutation (GraphQL has no Mutation type and there is no REST `/flags/{key}/envs/{env}`)

#### Scenario: Flag detail modal is read-only
- **WHEN** the user opens a flag's detail modal
- **THEN** it displays `key`, `description`, and `enabled` in a read-only view with no submit action
