# subject-management (delta)

## ADDED Requirements

### Requirement: Admin assigns multiple majors to a subject

The subject info tab SHALL let an admin select multiple majors for a subject and save them (replacing
the full set), reflecting that a subject may belong to multiple majors.

#### Scenario: Assign majors

- **WHEN** an admin selects majors A and B and clicks Lưu ngành
- **THEN** the subject is assigned to A and B (PUT /admin/subjects/{id}/majors)
