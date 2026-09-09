# admin-challenge-authoring

## ADDED Requirements

### Requirement: Challenge kinds describe the learner submission experience

The AI challenge generator SHALL label code choices by learner workflow. Project code SHALL state
GitHub/ZIP submission and AI grading; sandbox choices SHALL state inline editor and test-case grading.

#### Scenario: Mentor chooses a challenge kind

- **WHEN** the challenge kind selector opens
- **THEN** Project and Sandbox SHALL each explain their submission and grading behavior

### Requirement: Generated code drafts remain configurable before creation

Each CODE/CODING draft SHALL independently select Sandbox or Project. Project SHALL persist as CODE
with submissionMethod and AI question/criteria but no test cases. Sandbox SHALL persist as CODING
with test cases and no submissionMethod.

#### Scenario: Draft becomes Project

- **WHEN** Project is selected with GitHub and/or ZIP
- **THEN** the payload SHALL contain CODE + submissionMethod + AI grading content
- **AND** SHALL omit test cases and sandbox pass ratio

#### Scenario: Draft becomes Sandbox

- **WHEN** Sandbox is selected for a CODE/CODING draft
- **THEN** the payload SHALL contain CODING + test cases and no submissionMethod

#### Scenario: Sandbox has no test cases

- **WHEN** a selected draft uses Sandbox but contains no test cases
- **THEN** creation SHALL be blocked with a message naming that draft

### Requirement: Edit uses full, race-safe authoring detail

The edit modal SHALL hydrate once from the current `GET /admin/challenges/{id}` response and SHALL
not enable save while that request is fetching. A cached/background response SHALL NOT overwrite
dirty form values.

#### Scenario: Cached detail is refetched

- **WHEN** cached data exists while the current request is fetching
- **THEN** the form SHALL remain disabled until the request settles
- **AND** SHALL hydrate only once from the settled result

### Requirement: Full AI question and criteria round-trip

ESSAY and CODE Project editing SHALL show complete question/criteria from flat detail fields with a
gradingConfig fallback, and PATCH only fields that change.

#### Scenario: Existing Project has long grading content

- **WHEN** a short summary and long question/criteria are loaded
- **THEN** the complete grading content SHALL be editable without truncation
- **AND** an unchanged save SHALL NOT patch those fields

### Requirement: Project and Sandbox controls remain exclusive

Project SHALL show AI question/criteria and hide sandbox tools. Sandbox SHALL show starter/test-case
tools without requiring grading text. Only explicit sandbox→Project conversion SHALL require full
question/criteria and warn that test cases stop grading.

#### Scenario: Legacy sandbox title changes

- **WHEN** a CODE challenge without submissionMethod changes only title
- **THEN** the edit SHALL succeed without adding submissionMethod or clearing hidden grading keys

#### Scenario: Incomplete legacy Project metadata changes

- **WHEN** an existing Project lacks one grading field
- **THEN** a warning SHALL be shown
- **AND** unrelated edits SHALL remain possible

#### Scenario: Existing grading content is cleared

- **WHEN** a Project already has a non-empty question or criteria and that field is cleared
- **THEN** save SHALL be blocked and no blank patch SHALL be produced
