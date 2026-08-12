# challenge-testcase-sample-ui

## ADDED Requirements

### Requirement: Sample count is chosen when importing an archive
The ZIP import panel SHALL let the author choose how many leading cases become visible samples,
defaulting to a small number, and SHALL state that a sample-named directory inside the archive takes
precedence. The preview SHALL show which parsed cases will be samples before the author confirms.

#### Scenario: Author imports with the default
- **WHEN** an author imports an archive without changing the setting
- **THEN** a small number of leading cases SHALL be marked as samples
- **AND** the preview SHALL indicate which ones

#### Scenario: Author asks for no samples
- **WHEN** the author sets the sample count to zero
- **THEN** every imported case SHALL be hidden

### Requirement: The editor makes sample versus hidden obvious
The test-case editor SHALL clearly distinguish sample cases from hidden ones and SHALL warn when a
test-case graded challenge has no sample at all, because a learner would then have no example of the
expected input and output format.

#### Scenario: No sample present
- **WHEN** every case in the editor is hidden
- **THEN** a warning SHALL be shown

### Requirement: AI feedback attempts are configurable by the mentor
The challenge form SHALL expose the number of AI feedback attempts a learner gets on the challenge,
defaulting to one and not accepting more than five, with wording that makes clear the AI only
comments while the score comes from the test cases.

#### Scenario: Mentor sets the allowance
- **WHEN** a mentor sets the AI feedback attempts to three
- **THEN** that value SHALL be submitted with the challenge

#### Scenario: Mentor tries to exceed the maximum
- **WHEN** a mentor enters a value above five
- **THEN** the form SHALL not accept it
