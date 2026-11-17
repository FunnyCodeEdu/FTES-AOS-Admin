## ADDED Requirements

### Requirement: Unified login without privilege expansion
Both account types SHALL use the same admin login page and server-dispatched login endpoint while retaining distinct signed sessions.

#### Scenario: Existing report account supplies incorrect credentials
- **WHEN** a registered report identifier fails report authentication
- **THEN** no ordinary identity login SHALL be attempted.

#### Scenario: Ordinary administrator logs in
- **WHEN** an identifier is not registered in the report realm
- **THEN** the existing complete identity authentication flow SHALL run unchanged.

### Requirement: Shared dashboard governed by permissions
The shared root dashboard SHALL show all permitted administration and usage sections to ordinary admins and usage statistics only to report reviewers.

#### Scenario: Reviewer opens an editing URL
- **WHEN** a report reviewer opens a management route
- **THEN** the UI SHALL redirect to root statistics and the API SHALL continue denying business edits.

### Requirement: Concrete measured feature usage
The statistics SHALL show measured action counts, distinct actors and post-payment usage by feature and allowlisted AI tool without raw payloads.

#### Scenario: An AI payload contains private or unknown feature text
- **WHEN** the feature string is not in the approved enum
- **THEN** the report SHALL aggregate it as generic AI activity and SHALL NOT return that string.

### Requirement: Explain refund totals
The dashboard SHALL explain completed cash refunds for the payment-date cohort and distinguish pending refunds and coins.

#### Scenario: A refund is awaiting completion
- **WHEN** a refund request is pending
- **THEN** it SHALL NOT enter completed cash refunds.
