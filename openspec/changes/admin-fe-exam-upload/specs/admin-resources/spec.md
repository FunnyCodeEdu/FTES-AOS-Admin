# admin-resources

## ADDED Requirements

### Requirement: Final-exam resources show their album in the console
The console SHALL show, for a resource that holds a final-exam album, the pages that album
contains, distinguishing pages held as text from pages held as pictures and naming the source file
of pages that came from one. This view SHALL NOT be offered for resources that cannot hold an album.

#### Scenario: Opening a final-exam resource
- **WHEN** an operator opens a final-exam resource
- **THEN** the album's pages SHALL be listed with their kind and source file

#### Scenario: Opening a resource of another kind
- **WHEN** an operator opens a resource that is not a final exam
- **THEN** no album view SHALL be offered

### Requirement: Operators can add exam content from the console
The console SHALL let a permitted operator add exam content to the album, offering text files and
picture digitising as SEPARATE actions, and SHALL state that digitising does not keep the original
picture. Files SHALL be sent one at a time so a refusal names the file it belongs to, and the
refusal reason SHALL be shown.

#### Scenario: Adding text exam files
- **WHEN** a permitted operator picks text exam files
- **THEN** the files SHALL be sent one at a time
- **AND** the album view SHALL refresh when the run finishes

#### Scenario: A file is refused
- **WHEN** the server refuses one file
- **THEN** the operator SHALL be shown that file's name and the reason

#### Scenario: More files than the album can hold
- **WHEN** the pick exceeds the album's remaining room
- **THEN** the overflow SHALL be reported rather than silently dropped
