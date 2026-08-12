# admin-lesson-authoring (delta)

## ADDED Requirements

### Requirement: Lesson list shows challenge count

The lesson list SHALL show, per lesson, how many challenges are attached to it (derived from the
course's challenge bank), so an admin sees which lessons have exercises without expanding each row.

#### Scenario: Lesson with challenges

- **WHEN** a lesson has one or more challenges
- **THEN** its row shows the challenge count

### Requirement: Challenge bank labels lessons by description

The challenge bank's lesson tree and lesson pickers SHALL label a lesson by its description when present
(falling back to its name), because lesson names are frequently duplicated and non-distinguishing.

#### Scenario: Duplicated names disambiguated

- **WHEN** several lessons share the same name but have distinct descriptions
- **THEN** the tree/picker shows each lesson's description so they are distinguishable
