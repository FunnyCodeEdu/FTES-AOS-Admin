# external-reviewer-readonly Specification

## Purpose
TBD - created by archiving change admin-market-insights-readonly. Update Purpose after archive.
## Requirements
### Requirement: Truthful market metrics
The system SHALL report measured activity and settled revenue with explicit source coverage, date range and Asia/Ho_Chi_Minh timezone.

#### Scenario: Missing historical browser data
- **WHEN** no browser events existed before deployment
- **THEN** the dashboard SHALL label that coverage boundary and SHALL NOT fabricate historical visits.

### Requirement: Paid feature use
The system SHALL distinguish feature activity after the actor's first actual payment from unpaid activity.

#### Scenario: Activity before payment
- **WHEN** a user performs an action before their first payment
- **THEN** it SHALL NOT count as post-purchase feature usage.

### Requirement: Privacy bounded telemetry
The system SHALL accept only bounded allowlisted events, derive actor identity server-side and never persist query strings, form content, tokens or client-declared actor ids.

#### Scenario: Invalid or excessive telemetry
- **WHEN** an event or batch fails validation or rate limits
- **THEN** it SHALL be rejected without changing business state.

### Requirement: Read-only external reviewer
The system SHALL restrict the reviewer to analytics and minimal own-session bootstrap at the server.

#### Scenario: Direct mutation request
- **WHEN** a reviewer calls a business write or a GraphQL mutation directly
- **THEN** the server SHALL deny it even if UI controls are bypassed.

### Requirement: Pseudonymous journeys
The system SHALL return only pseudonymous keys and safe event metadata to the reviewer.

#### Scenario: Inspect a user journey
- **WHEN** a reviewer opens a journey
- **THEN** no email, phone, IP, raw event payload or payment credential SHALL be returned.

### Requirement: Existing administrator compatibility
The system SHALL preserve ordinary administrator access and existing dashboard functionality.

#### Scenario: Super-admin has permission bypass
- **WHEN** a super-admin can access every permission through bypass
- **THEN** that bypass alone SHALL NOT mark the super-admin as a read-only reviewer.
