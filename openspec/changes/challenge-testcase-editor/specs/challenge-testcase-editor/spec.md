# challenge-testcase-editor

## ADDED Requirements

### Requirement: Multi-line test-case authoring
The test-case editor SHALL accept multi-line input and expected output, and SHALL let the author set
per-case weight, hidden flag, time limit, and memory limit rather than using fixed hardcoded values.

#### Scenario: Multi-line stdin
- **WHEN** an author pastes several lines into a test case's input
- **THEN** the line breaks SHALL be preserved in what is submitted to the backend

#### Scenario: Per-case limits
- **WHEN** an author raises a case's time limit
- **THEN** that value SHALL be sent for that case instead of the default

### Requirement: Test cases editable after creation
The admin UI SHALL provide a way to load a saved challenge's existing test cases and save changes to
them, reachable from the challenge bank list and from the challenge edit dialog, so test cases are
no longer write-once at creation time.

#### Scenario: Fixing a published challenge
- **WHEN** an author opens the test-case manager for an existing challenge
- **THEN** the saved test cases SHALL be shown for editing
- **AND** saving SHALL persist the edited list

### Requirement: ZIP import with preview
The admin UI SHALL allow uploading a ZIP archive of test cases and SHALL show the parsed cases and
any skipped entries with reasons before the author confirms. Upload SHALL use multipart and SHALL
not rely on the client's default JSON content type.

#### Scenario: Author imports an archive
- **WHEN** an author uploads a valid archive
- **THEN** the parsed test cases SHALL be listed for review
- **AND** entries that could not be paired SHALL be listed with a reason

#### Scenario: Rejected archive
- **WHEN** the backend rejects the archive
- **THEN** the failure reason SHALL be surfaced and no test case SHALL be changed

### Requirement: Optional close time
The challenge schedule control SHALL allow the close time to be left empty, meaning the challenge
never closes, and SHALL submit an absent close time in that case. Where a schedule is displayed, an
absent close time SHALL be rendered as unlimited rather than as a date.

#### Scenario: Author leaves close empty
- **WHEN** an author sets only an open time and submits
- **THEN** the request SHALL be accepted with no close time
- **AND** the form SHALL NOT block submission for a missing close time

### Requirement: Verdict display
Where automatic test-case results are shown, the UI SHALL display the per-case verdict returned by
the backend rather than only a pass/fail indicator.

#### Scenario: Timed-out submission
- **WHEN** a case result carries a time-limit verdict
- **THEN** the UI SHALL show that verdict distinctly from a wrong answer
