## ADDED Requirements

### Requirement: Purchasers-only resource visibility

The system SHALL let editors set a resource's visibility to a purchasers-only tier — the FE
vocabulary `enrolled`, mapped to the backend `ENROLLED_ONLY` enum (a dedicated value, distinct from
`MEMBERS`) — meaning the material is locked for viewers who have not purchased/enrolled in the linked
course. The mapping SHALL be applied on the create flow (`POST /api/v1/resources`). The resource list
and detail SHALL render a consistent purchasers-only label; because the admin list query returns the
raw backend enum name, the list read SHALL normalize the backend visibility to the FE vocabulary so
its label matches the detail page.

#### Scenario: Editor marks a resource purchasers-only

- **WHEN** an editor selects the purchasers-only visibility and creates a resource
- **THEN** the system persists `ENROLLED_ONLY` as the backend visibility (not `MEMBERS`, not the raw FE vocabulary)
- **AND** the resource list and detail render a consistent purchasers-only label

#### Scenario: List label matches detail label

- **WHEN** the resource list loads an item whose backend visibility is `ENROLLED_ONLY`
- **THEN** the list normalizes it to the FE `enrolled` vocabulary and renders the same purchasers-only label as the detail page

#### Scenario: Visibility label communicates the gate

- **WHEN** an editor opens the visibility selector
- **THEN** the purchasers-only option is labelled to convey that the material is locked for
  viewers who have not purchased the linked course
