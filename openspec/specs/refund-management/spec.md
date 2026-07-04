# refund-management

## Purpose
Quản lý hoàn tiền: yêu cầu → duyệt (4-eyes) → thực thi → audit đầy đủ.

## Requirements

### Requirement: Refund request creation
The system SHALL let callers holding `commerce.refund.request` create a refund request from an order detail, with an amount not exceeding the paid total and a mandatory reason.

#### Scenario: Admin requests a refund
- **WHEN** an admin holding `commerce.refund.request` submits a refund request with a valid amount and reason
- **THEN** the system creates the request in requested status and it appears in the refund list
- **AND** the creation is recorded in the audit log by the backend

#### Scenario: Amount exceeds the paid total
- **WHEN** the entered amount exceeds the order's paid total
- **THEN** the system blocks submission with a validation message, and the backend independently rejects any oversized amount

#### Scenario: Caller lacks refund request permission
- **WHEN** an admin lacking `commerce.refund.request` opens an order detail
- **THEN** the create-refund-request control SHALL NOT be rendered

### Requirement: Server-side refund list and detail timeline
The system SHALL list refund requests with server-side pagination and filters for status and date range, and SHALL show each request's step timeline with actor and timestamp.

#### Scenario: Admin tracks a refund
- **WHEN** an admin holding `commerce.view` opens a refund detail
- **THEN** the system shows the request data and a timeline of steps (requested, approved or rejected, executed) each with the acting admin and time
- **AND** the list supports filtering by status and date range with skeleton, empty, and error states

### Requirement: Four-eyes approval
The system SHALL allow approving or rejecting a refund request only for callers holding `commerce.refund.approve` who are not the request creator; rejection requires a written reason.

#### Scenario: A second admin approves
- **WHEN** an admin holding `commerce.refund.approve` who did not create the request confirms approval
- **THEN** the system calls the approve endpoint and the status becomes approved
- **AND** the approval with the approver identity is recorded in the audit log by the backend

#### Scenario: Creator attempts to approve their own request
- **WHEN** the request creator views the refund detail with approve permission
- **THEN** the approve and reject controls are disabled with an explanation that the approver must differ from the creator
- **AND** any direct API attempt is rejected by the backend with a conflict

#### Scenario: Caller lacks approve permission
- **WHEN** an admin lacking `commerce.refund.approve` opens a refund detail in requested status
- **THEN** the approve and reject controls SHALL NOT be rendered

### Requirement: Refund execution
The system SHALL allow executing an approved refund only for callers holding `commerce.refund.execute`, after a confirmation stating the amount and refund channel.

#### Scenario: Admin executes an approved refund
- **WHEN** an admin holding `commerce.refund.execute` confirms execution of an approved request
- **THEN** the system calls the execute endpoint and the status becomes executed with the payout result on the timeline

#### Scenario: Execution fails at the payment channel
- **WHEN** the execute call fails at the refund channel
- **THEN** the system sets the visible status to execution-failed with the error on the timeline
- **AND** offers a retry of the execution step

#### Scenario: Execution attempted on a non-approved request
- **WHEN** a caller attempts to execute a request that is not in approved status
- **THEN** the execute control is not available and the backend rejects the transition

### Requirement: Fully audited refund lifecycle
The system SHALL ensure every refund step (request, approve, reject, execute, retry) is recorded in the audit log with actor, reason or note, and timestamp.

#### Scenario: Auditor reviews a completed refund
- **WHEN** an executed refund is inspected
- **THEN** the timeline reconstructs every step with its actor and reason as recorded by the backend audit log
