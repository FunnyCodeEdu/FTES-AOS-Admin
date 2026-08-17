# subject-management (delta)

## ADDED Requirements

### Requirement: Admin sets subject recommended semester

The subject create/edit forms SHALL let an admin set the subject's recommended semester ("Kì", 1..9,
optional), and the subject info tab SHALL show the current value, so an admin can assign which
curriculum semester a subject belongs to.

#### Scenario: Assign semester

- **WHEN** an admin enters 4 in the "Kì" field and saves
- **THEN** the subject's recommended semester is set to 4 and shown on reopening the info tab
