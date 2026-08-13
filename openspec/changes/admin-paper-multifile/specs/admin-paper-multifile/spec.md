# admin-paper-multifile

## ADDED Requirements

### Requirement: Attaching several files to an exam paper
The paper dialog SHALL let an author attach several files in one go and SHALL list what is currently
attached, showing for each file its name, size and whether learners will view it in place or download
it. The author SHALL be able to remove an individual file and change the order.

#### Scenario: Author attaches pages plus a template
- **WHEN** an author selects three page images and one template archive
- **THEN** all four SHALL be uploaded and listed
- **AND** each SHALL show whether it is viewable or download-only

#### Scenario: Author removes one file
- **WHEN** the author removes a single attachment
- **THEN** only that file SHALL be removed and the rest SHALL keep their order

### Requirement: Rejections are explained without losing existing files
The dialog SHALL surface the reason whenever the backend rejects an upload — too many files,
combined size exceeded, wrong type, failed signature check — and SHALL leave the already-attached
files visible and unchanged.

#### Scenario: Upload over the limit
- **WHEN** an upload is rejected for exceeding a limit
- **THEN** the reason SHALL be shown
- **AND** the existing attachments SHALL still be listed

### Requirement: Creating a paper challenge applies tags in the same request
The create dialog SHALL send the tags together with the challenge creation rather than as a separate
follow-up call, so a challenge can never be left created-but-untagged.

#### Scenario: Create with prefilled tags
- **WHEN** an author creates an exam for a subject
- **THEN** the tags SHALL be submitted with the creation request
- **AND** no separate tagging step SHALL be needed
