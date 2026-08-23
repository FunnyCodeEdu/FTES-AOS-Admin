# payroll-console (delta)

## MODIFIED Requirements

### Requirement: Delete action is reachable from the payroll list

The payroll list SHALL expose a delete action on each row (guarded by `payroll.manage`) that collects a
reason before deleting, so an admin does not have to open the detail drawer to find it.

#### Scenario: Delete from the list

- **WHEN** an admin clicks Xoá on a payroll row and confirms with a reason
- **THEN** the record is deleted and the list refreshes
