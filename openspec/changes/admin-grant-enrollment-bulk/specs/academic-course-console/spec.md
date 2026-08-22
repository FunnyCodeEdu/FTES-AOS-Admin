# academic-course-console (delta)

## MODIFIED Requirements

### Requirement: Granting course access accepts many usernames

The "grant students" action on the course list SHALL accept a comma-separated list of usernames and
grant access to each of them independently. A username that cannot be granted (unknown account or an
error) SHALL NOT prevent the other usernames from being granted.

#### Scenario: All usernames succeed

- **WHEN** an admin submits usernames that all resolve to accounts
- **THEN** all are granted and a single success message is shown

#### Scenario: Some usernames fail

- **WHEN** some usernames cannot be granted
- **THEN** the remaining usernames are still granted and only the failing usernames are reported
