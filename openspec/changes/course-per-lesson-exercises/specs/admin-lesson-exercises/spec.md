# admin-lesson-exercises

## ADDED Requirements

### Requirement: Exercises are authored per lesson

`LessonEditPage` SHALL show a "Thực hành" card listing and authoring the lesson's challenges
(via the challenge wizard in fixed-lesson mode), assignments (create/edit/delete), and quizzes
(listed). Assignment and quiz authoring SHALL be gated on the ability to manage the lesson.

#### Scenario: Author adds an assignment to a lesson

- **WHEN** a manager opens a lesson and adds an assignment
- **THEN** it SHALL be created against that lesson and appear in the card's assignment list

### Requirement: Assignment submission method is a first-class choice

An assignment SHALL declare `submissionMethod` of `GITHUB`, `FILE`, or `BOTH`. When `FILE` or
`BOTH` is allowed, `fileExtension` SHALL be a required whitelist of accepted extensions. Absent or
unrecognized values SHALL be treated as `BOTH`, matching the backend default and the V270 backfill.

#### Scenario: File-only assignment requires an extension whitelist

- **WHEN** an author selects "Nộp file" (FILE)
- **THEN** the file-extension whitelist field SHALL become required before saving

#### Scenario: Legacy assignment without a stored method

- **WHEN** an assignment is rendered whose `submissionMethod` is absent
- **THEN** the UI SHALL treat it as `BOTH`

### Requirement: Editing an assignment warns about overwritten grading config

Saving an edited assignment SHALL require an explicit confirm that lists which grading fields will
be overwritten with the current form values. This is because the assignment read model omits the
expected output, test cases, and the three check flags while the update is a full overwrite, so an
untouched form would otherwise clear them silently.

#### Scenario: Renaming an assignment surfaces the overwrite risk

- **WHEN** a manager edits only the title of an existing assignment and presses "Lưu"
- **THEN** a confirm SHALL list the grading fields that will be overwritten (cleared/reset) before
  the update is sent
