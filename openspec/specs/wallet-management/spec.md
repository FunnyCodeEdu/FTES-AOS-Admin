# wallet-management

## Purpose
Quản lý ví ngưởi dùng: tra cứu, ledger, điều chỉnh số dư có lý do và duyệt 2 ngưởi khi vượt ngưỡng.

## Requirements

### Requirement: Wallet lookup
The system SHALL let callers holding `wallet.view` look up a user's wallet by searching name or email and open its detail at `/commerce/wallets/:userId`.

#### Scenario: Admin looks up a wallet
- **WHEN** an admin holding `wallet.view` searches for a user and selects a result
- **THEN** the system opens the wallet detail showing balance, currency, and wallet status

#### Scenario: Admin without wallet.view
- **WHEN** a signed-in admin lacking `wallet.view` navigates to a wallet route by URL
- **THEN** the system renders the Forbidden page and the wallet navigation entry is not rendered

### Requirement: Server-side transaction ledger
The system SHALL display the wallet's transaction ledger with server-side pagination and filters for transaction type and date range, each entry showing amount sign, balance after, actor, and reason where applicable.

#### Scenario: Admin audits a wallet's history
- **WHEN** the admin filters the ledger by type and date range
- **THEN** the system requests the ledger with those parameters and renders entries with signed amounts and resulting balance
- **AND** shows skeleton, empty, and error-with-retry states appropriately

### Requirement: Balance adjustment with mandatory reason
The system SHALL let callers holding `wallet.adjust` submit a positive or negative balance adjustment with a mandatory reason and a confirmation stating the consequence.

#### Scenario: Admin applies a small adjustment
- **WHEN** an admin holding `wallet.adjust` submits an adjustment below the dual-approval threshold with a reason and confirms
- **THEN** the backend applies it immediately and the system refreshes the balance and ledger
- **AND** the adjustment with its reason and actor is recorded in the audit log by the backend

#### Scenario: Reason is missing
- **WHEN** the admin attempts to submit an adjustment without a reason
- **THEN** the system blocks submission with a validation message

#### Scenario: Caller lacks wallet.adjust
- **WHEN** an admin holding only `wallet.view` opens a wallet detail
- **THEN** the adjustment control SHALL NOT be rendered

### Requirement: Dual approval above threshold
The system SHALL route adjustments whose absolute amount exceeds the configured threshold into a pending-approval state that requires a second approver holding `wallet.adjust_approve` who differs from the creator.

#### Scenario: Large adjustment enters the approval queue
- **WHEN** an admin submits an adjustment exceeding the threshold
- **THEN** the system warns before submission that a second approver is required, and the backend returns pending-approval instead of applying it
- **AND** the wallet balance remains unchanged until approval

#### Scenario: Second admin approves the adjustment
- **WHEN** a different admin holding `wallet.adjust_approve` approves the pending adjustment
- **THEN** the backend applies it, and the system refreshes the balance, ledger, and pending queue
- **AND** both creator and approver are recorded in the audit log

#### Scenario: Creator attempts to approve their own adjustment
- **WHEN** the adjustment creator opens the pending queue holding `wallet.adjust_approve`
- **THEN** the approve control for their own adjustment is disabled with an explanation
- **AND** any direct API attempt is rejected by the backend with a conflict

#### Scenario: Approver rejects the adjustment
- **WHEN** the approver rejects a pending adjustment with a mandatory reason
- **THEN** the adjustment is discarded without changing the balance and the rejection is audited

### Requirement: Threshold sourced from backend configuration
The system SHALL read the dual-approval threshold from backend configuration rather than hardcoding it, treating the backend decision as authoritative.

#### Scenario: FE and BE thresholds disagree
- **WHEN** the frontend predicts immediate application but the backend returns pending-approval
- **THEN** the system displays the pending-approval outcome returned by the backend
