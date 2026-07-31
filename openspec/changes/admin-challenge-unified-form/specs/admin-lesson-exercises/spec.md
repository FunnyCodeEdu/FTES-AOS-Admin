# admin-lesson-exercises

## MODIFIED Requirements

### Requirement: Exercises are authored per lesson

The per-lesson exercises card SHALL allow authoring challenges (via the challenge wizard in
fixed-lesson mode) and SHALL list quizzes. There SHALL NOT be a separate assignment editor: a
graded practice item that a learner submits (formerly an "assignment") SHALL be authored as a
`CODE` challenge with a submission method. Creating a challenge and its submission-based grading
config SHALL be gated on the ability to manage challenges (`canManageChallenge`).

#### Scenario: Author adds a submission-based practice item

- **WHEN** a manager opens a lesson and clicks "Thêm thử thách", picks type `CODE`, and chooses the
  "bài nộp" input style
- **THEN** they SHALL configure the submission method and rubric in the challenge wizard, and no
  separate "add assignment" affordance SHALL be shown

### Requirement: Assignment submission method is a first-class choice

A `CODE` challenge authored as a submission-based item SHALL declare `submissionMethod` of
`GITHUB`, `FILE`, or `BOTH`, sent as a top-level field on the challenge create payload. When `FILE`
or `BOTH` is selected, a `fileExtension` whitelist SHALL be required and captured. The free-text
rubric (question, expectedOutput, criteria) and the check toggles (checkLogic, checkPerform,
checkEdgeCase) SHALL be serialized into the challenge's `gradingConfig` JSON string. A `CODE`
challenge that uses inline test cases SHALL carry neither `submissionMethod` nor a submission
`gradingConfig`.

#### Scenario: File submission requires an extension whitelist

- **WHEN** an author sets the submission method to `FILE` or `BOTH`
- **THEN** the `fileExtension` whitelist field SHALL be shown and required before create; for
  `GITHUB` it SHALL be omitted from `gradingConfig`

#### Scenario: One input style per CODE challenge

- **WHEN** an author picks the submission-based input style for a `CODE` challenge
- **THEN** the wizard's content step SHALL NOT render the inline structured test-case editor, and
  the submission method + rubric SHALL travel on the create payload instead

## ADDED Requirements

### Requirement: Editing a CODE challenge can change its submission method

The challenge edit modal SHALL, for a `CODE` challenge, allow editing `submissionMethod` and
(when the method allows file upload) `fileExtension`, applied as a partial diff: only fields that
changed from the challenge's current values SHALL be sent. Switching to `GITHUB` SHALL clear the
file-extension whitelist.

#### Scenario: Change a CODE challenge submission method

- **WHEN** a manager edits a `CODE` challenge and switches the submission method from `FILE` to
  `GITHUB`
- **THEN** the update request SHALL include the new `submissionMethod` and an emptied
  `fileExtension`, and SHALL NOT include unchanged fields

## REMOVED Requirements

### Requirement: Editing an assignment warns about overwritten grading config

**Reason**: The separate assignment editor (`LessonAssignmentEditor`) and its create/update/delete
API block are removed. Graded submission items are now authored/edited through the challenge form,
which does not use the assignment full-overwrite PUT, so the overwrite-warning confirm no longer
applies.

**Migration**: Author and edit submission-based practice items as `CODE` challenges via
`ChallengeWizardDrawer` / `ChallengeEditModal`. Existing assignments remain served by the backend
assignment read endpoints for learners; only the Admin authoring surface is consolidated.
