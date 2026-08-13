# admin-device-oversight

## ADDED Requirements

### Requirement: Admins see accounts that sign in from many devices
The interface SHALL present accounts whose distinct device count within a trailing window reaches a
threshold, SHALL let the operator change both the threshold and the window without leaving the page,
and SHALL show for each account the device count, recent device descriptions, the number of previous
locks and the current lock state.

#### Scenario: Reviewing shared accounts
- **WHEN** an operator opens the page
- **THEN** accounts at or above the default threshold of four devices over thirty days SHALL be listed
- **AND** each row SHALL show the device count, recent devices, prior lock count and lock state

#### Scenario: Adjusting the threshold
- **WHEN** the operator changes the threshold or the window
- **THEN** the list SHALL reload against the new values

### Requirement: Locking from the list states its consequences
The interface SHALL require a confirmation before locking, and that confirmation SHALL state the
device count observed, that every session will be signed out, and that the account holder will be
emailed. It SHALL warn separately when the account has been locked before. The lock action SHALL be
available only to operators permitted to lock accounts.

#### Scenario: Operator locks an account
- **WHEN** the operator chooses to lock an account from the list
- **THEN** a confirmation SHALL state the device count and the consequences before anything happens

#### Scenario: Repeat offender
- **WHEN** the account has previous locks
- **THEN** the confirmation SHALL say so

### Requirement: The appeal queue is reviewable
The interface SHALL list unlock appeals filtered by state, showing the appellant, their message, the
reason of the lock being appealed and the number of previous locks, and SHALL allow approving or
rejecting a pending appeal with an optional note that reaches the user.

#### Scenario: Approving an appeal
- **WHEN** the operator approves a pending appeal
- **THEN** the account SHALL be unlocked and the list SHALL reflect the new state

#### Scenario: Rejecting an appeal
- **WHEN** the operator rejects a pending appeal with a note
- **THEN** the appeal SHALL be recorded as rejected with that note
- **AND** the account SHALL remain locked

#### Scenario: Already-decided appeal
- **WHEN** an appeal already carries a decision
- **THEN** no approve or reject action SHALL be offered for it
