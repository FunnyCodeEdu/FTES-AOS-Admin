# academic-course-console (delta)

## MODIFIED Requirements

### Requirement: Package entitlements are managed with a scope picker

The package editor SHALL present entitlements as a compact summary list, and SHALL add or edit an
entitlement through a scope picker that lets an admin choose the whole course, a whole section, or
specific lessons within sections. Choosing a whole section grants the section; choosing specific
lessons grants only those lessons. Fields the editor does not manage (exercise entitlements, legacy
single-lesson grants) SHALL be round-tripped unchanged so already-purchased students keep access.

#### Scenario: Add a section grant

- **WHEN** an admin opens the scope picker and ticks a whole section
- **THEN** an entitlement granting that whole section is added

#### Scenario: Add a partial-section grant

- **WHEN** an admin ticks only some lessons inside a section
- **THEN** an entitlement granting exactly those lessons (not the whole section) is added

#### Scenario: Widen a partial grant to the whole section

- **WHEN** an admin edits a partial-section entitlement and ticks the whole section
- **THEN** the saved entitlement grants the whole section instead of the previous lesson subset

#### Scenario: Untouched entitlements keep their scope

- **WHEN** an admin saves a package without re-picking an entitlement's scope
- **THEN** that entitlement's stored scope (including exercise grants) is sent back unchanged
