# admin-challenge-editor

## MODIFIED Requirements

### Requirement: Submission limit is editable
The admin client SHALL let an authorized manager update a positive maximum submission count.

#### Scenario: Manager raises the limit
- **WHEN** a manager changes the value and saves
- **THEN** the PATCH request contains the changed `maxSubmissions`.
