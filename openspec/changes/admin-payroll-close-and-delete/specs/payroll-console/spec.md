# payroll-console (delta)

## MODIFIED Requirements

### Requirement: Payroll console can close and delete a period

The payroll console SHALL let an admin close a payroll period that is still running, and SHALL provide
a delete action for a payroll record that collects a reason before deleting.

#### Scenario: Close a running period

- **WHEN** an admin opens a period whose status is OPEN
- **THEN** the status control offers PENDING and CLOSE, with a confirmation before CLOSE

#### Scenario: Delete a payroll record

- **WHEN** an admin confirms deletion with a reason
- **THEN** the record is deleted and the list refreshes
