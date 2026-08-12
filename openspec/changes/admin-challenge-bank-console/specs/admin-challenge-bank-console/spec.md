# admin-challenge-bank-console

## ADDED Requirements

### Requirement: Browse the challenge bank without entering a course
The admin console SHALL provide a top-level screen that lists challenges from the shared bank without
requiring the operator to open a course first, so an exam paper can be administered for a subject that
has no course yet.

#### Scenario: Opening the bank from the main navigation
- **WHEN** an operator with global bank access opens the challenge bank screen
- **THEN** challenges from every subject SHALL be listed
- **AND** no course SHALL have to be selected first

#### Scenario: Operator limited to one course
- **WHEN** the server refuses a bank listing that carries no course filter because the operator lacks
  global scope
- **THEN** the screen SHALL explain that a course must be chosen in the filters and SHALL keep the
  filters usable
- **AND** the screen SHALL NOT silently retry, hide the refusal, or guess the operator's scope

### Requirement: Search and filter the bank server-side
The bank screen SHALL filter by title text, tags, type, difficulty, status, subject, course and
unattached-only, with the filtering and pagination performed by the server rather than over an
already-loaded page.

#### Scenario: Finding an exam by title
- **WHEN** an operator types part of a challenge title
- **THEN** matching challenges SHALL be listed even when they were not on the page shown before

#### Scenario: Filtering by several tags
- **WHEN** an operator selects more than one tag
- **THEN** only challenges carrying every selected tag SHALL be listed

#### Scenario: Paging through results
- **WHEN** an operator moves to another page
- **THEN** the active filters SHALL still apply and the previously loaded rows SHALL remain visible
  until the new page arrives

### Requirement: Manage the tags of a challenge
The console SHALL let an operator view and replace a challenge's tags, offering completion over the
existing tag vocabulary while still accepting a tag that does not exist yet. The tag editor SHALL be
reachable both from a bank row and from the existing challenge edit dialog.

#### Scenario: Classifying an exam as PE for a subject
- **WHEN** an operator saves the tag set for a challenge
- **THEN** the saved set SHALL become the challenge's complete tag set, tags left out SHALL be removed
- **AND** the row SHALL show the new tags without a manual page reload

#### Scenario: Introducing a tag that does not exist yet
- **WHEN** an operator types a tag that is absent from the vocabulary
- **THEN** the tag SHALL be accepted and saved

### Requirement: Attach an exam paper file to a challenge
The console SHALL let an operator upload a PDF or image file as the exam paper of a challenge, see the
paper currently attached, open or download it, replace it, and remove it. The console SHALL reject a
file whose type or size the server would reject, before uploading it.

#### Scenario: Uploading a paper
- **WHEN** an operator picks a PDF within the size limit
- **THEN** the file SHALL be uploaded to that challenge
- **AND** the challenge SHALL then show the paper's name with a way to open it

#### Scenario: Picking an unsupported or oversized file
- **WHEN** an operator picks a file whose type is not PDF, PNG, JPEG or WebP, or which exceeds the
  size limit
- **THEN** the console SHALL refuse it with a message naming the actual reason
- **AND** no upload request SHALL be sent

#### Scenario: Removing the paper
- **WHEN** an operator removes the attached paper
- **THEN** the operator SHALL be asked to confirm first
- **AND** after removal the challenge SHALL show that it has no paper

### Requirement: Create an exam straight into the bank
The console SHALL let an operator create a challenge without choosing a course, capturing at least a
title, a subject, a difficulty and tags, with the tags pre-filled as the PE marker plus the subject's
code, and SHALL offer to attach the exam paper immediately afterwards.

#### Scenario: Creating a PE exam for a subject
- **WHEN** an operator creates a challenge from the bank screen and picks a subject
- **THEN** the tag field SHALL be pre-filled with the PE marker and that subject's code, still editable
- **AND** after saving, the challenge SHALL appear in the bank carrying those tags

#### Scenario: Challenge created but tagging fails
- **WHEN** the challenge is created but saving its tags or its paper fails
- **THEN** the console SHALL say that the challenge exists and what is still missing
- **AND** the console SHALL NOT report the whole creation as failed

### Requirement: Review queue for pending challenges
The console SHALL provide a queue of challenges awaiting approval where each row can be approved or
rejected, and rejection SHALL require a reason.

#### Scenario: Rejecting without a reason
- **WHEN** an operator opens the rejection dialog and the reason is empty or only whitespace
- **THEN** the confirm control SHALL stay disabled and no request SHALL be sent

#### Scenario: Approving an item
- **WHEN** an operator approves a challenge
- **THEN** the operator SHALL be asked to confirm, and after the decision the item SHALL leave the queue

#### Scenario: Approver whose grant is per-subject
- **WHEN** the queue is opened by an operator whose approval rights are granted per subject rather than
  globally
- **THEN** the queue and its decision controls SHALL be rendered, letting the server decide the outcome
- **AND** the console SHALL NOT hide the screen or the decision controls based on a client-side list of
  global permissions

#### Scenario: Operator with no approval scope
- **WHEN** the server returns an empty queue because the operator has no approval scope
- **THEN** the screen SHALL show a neutral empty state rather than claiming there is nothing pending in
  the system

### Requirement: A course picks a challenge from the bank
The console SHALL show every lesson a challenge is currently used in and SHALL let an operator add
another place of use or remove a single one. Adding a place of use SHALL NOT detach the challenge from
the lessons it already serves.

#### Scenario: Reusing a bank exam in a second course
- **WHEN** an operator adds a lesson of another course as a place of use
- **THEN** the challenge SHALL be listed as used in both lessons
- **AND** the wording of the action SHALL NOT suggest the challenge was moved

#### Scenario: Removing one place of use
- **WHEN** an operator removes one place of use
- **THEN** the operator SHALL be asked to confirm
- **AND** only that place SHALL disappear while the remaining ones stay

### Requirement: No grading interface
The console SHALL NOT expose any control that starts, configures or displays AI grading of challenge
submissions, because that capability is deliberately withheld.

#### Scenario: Looking for grading controls
- **WHEN** an operator uses the bank screen, the review queue, the paper dialog or the creation dialog
- **THEN** no control for AI grading SHALL be present
