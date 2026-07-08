## ADDED Requirements

### Requirement: System configuration consumes the flat AdminConfiguration shape
The System Configuration screen SHALL query `systemConfigurations { key value sensitive }` and consume the backend's flat `AdminConfiguration { key, value, sensitive }` list, where `value` is a raw String (often JSON-encoded). It SHALL NOT request `group`, `entries`, `type`, or `description` (which the backend does not define and which cause a GraphQL validation error).

#### Scenario: Load configuration list
- **WHEN** `useConfig` runs
- **THEN** it sends the GraphQL query selecting only `key`, `value`, `sensitive`
- **AND** returns `ConfigItem[]` where each item is `{ key, value: string | null, sensitive: boolean }`

#### Scenario: Group flat keys for display
- **WHEN** the page renders the flat items
- **THEN** it groups them into Tabs by the first dotted segment of `key` (e.g. `platform.ai.quota.default` → tab `platform`)
- **AND** keys without a dot fall into a `khác` group

#### Scenario: Read-only display, sensitive masked
- **WHEN** an item has `sensitive: true`
- **THEN** its value is masked instead of shown
- **AND** no save/edit control is rendered, because the backend exposes no configuration mutation (GraphQL has no Mutation type and there is no REST `/config/{key}`)
