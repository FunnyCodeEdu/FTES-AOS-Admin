# admin-challenge-authoring Specification

## Purpose

Cho quản trị viên/mentor tạo và sửa thử thách mà không nhầm giữa Project nộp GitHub/ZIP do AI
chấm với Code Sandbox chấm test case, đồng thời tải và lưu nguyên vẹn đề/rubric đầy đủ.

## Requirements

### Requirement: Challenge kinds describe the learner submission experience

The AI challenge generator SHALL label code challenge choices by learner workflow instead of
showing only internal enum values. Project code SHALL state that learners submit GitHub and/or a
ZIP file for AI grading. Code and SQL sandbox SHALL state that learners work in an inline editor
and are graded by test cases.

#### Scenario: Mentor chooses a challenge kind before generation

- **WHEN** a mentor opens the challenge kind selector
- **THEN** the Project and Sandbox choices SHALL name their submission and grading behavior
- **AND** raw values such as `CODE` and `CODING` SHALL NOT be the only explanation shown

### Requirement: Every generated code draft remains configurable before creation

After AI generation, each selected CODE/CODING draft SHALL independently allow the mentor to choose
either Sandbox or Project. A Project SHALL be created as `CODE` with `submissionMethod`, AI grading
question/criteria, and no test cases. A Sandbox SHALL be created canonically as `CODING`, preserve
its test cases, and omit `submissionMethod`.

#### Scenario: CODE draft is changed to Sandbox

- **WHEN** a mentor selects Sandbox for an AI draft originally typed CODE
- **THEN** the batch item SHALL use type `CODING`
- **AND** SHALL preserve the draft test cases and omit `submissionMethod`

#### Scenario: CODING draft is changed to Project

- **WHEN** a mentor selects Project and allows GitHub or ZIP submission
- **THEN** the batch item SHALL use type `CODE` and the selected `submissionMethod`
- **AND** SHALL carry explicit AI `question` and `criteria`
- **AND** SHALL NOT carry stdin/stdout test cases or sandbox-only pass ratio

#### Scenario: Project accepts a file

- **WHEN** FILE or BOTH is selected for a generated Project
- **THEN** at least one allowed file extension SHALL be required before creation

#### Scenario: Sandbox draft has no test cases

- **WHEN** a selected draft is configured as Sandbox but contains no test cases
- **THEN** creation SHALL be blocked with a message naming the affected draft

### Requirement: Editing waits for complete authoring detail

The edit modal SHALL fetch `GET /api/v1/admin/challenges/{id}` and hydrate from its full authoring
response rather than from a truncated list row. The modal SHALL wait for the current fetch before
enabling save and SHALL hydrate a form only once per open challenge so a later cached-data refetch
cannot overwrite the mentor's typing.

#### Scenario: Cached detail is refetched on modal open

- **WHEN** cached detail exists while a current detail request is still fetching
- **THEN** the modal SHALL keep editing disabled until the current request settles
- **AND** SHALL hydrate once from the settled response
- **AND** a later background response SHALL NOT reset dirty form values

#### Scenario: Detail endpoint fails

- **WHEN** detail cannot be loaded
- **THEN** the modal SHALL warn the mentor and fall back to available list fields
- **AND** hidden authoring fields SHALL NOT be cleared by an unrelated edit

### Requirement: Project question and criteria round-trip independently

The edit modal SHALL show full `question` and `criteria` for ESSAY and CODE Project challenges. It
SHALL prefer flat detail fields, fall back to `gradingConfig` for older responses, and PATCH only a
changed flat field so unknown grading keys and file/starter/seed configuration remain intact.

#### Scenario: Existing HSF Project is opened

- **WHEN** its summary description is short but `question` and `criteria` are long in grading config
- **THEN** both complete values SHALL be shown without truncation
- **AND** saving unchanged values SHALL send no question/criteria patch

#### Scenario: One grading text field changes

- **WHEN** the mentor changes only `question`
- **THEN** PATCH SHALL include only flat `question`
- **AND** SHALL NOT replace the complete `gradingConfig` blob

### Requirement: Project and Sandbox editing controls are mutually exclusive

CODE Project editing SHALL show GitHub/ZIP submission plus AI question/criteria and hide sandbox
feedback, starter-code, and test-case tools. CODE Sandbox editing SHALL show the sandbox tools and
SHALL NOT require question/criteria. Only an intentional Sandbox-to-Project conversion SHALL require
question and criteria before save.

#### Scenario: Legacy CODE Sandbox is edited

- **WHEN** it has no `submissionMethod`, question, or criteria and the mentor changes its title
- **THEN** the edit SHALL remain valid
- **AND** SHALL NOT add a submission method or clear hidden grading keys

#### Scenario: Sandbox is converted to Project

- **WHEN** the mentor selects GITHUB, FILE, or BOTH for a CODE Sandbox
- **THEN** the UI SHALL warn that test cases stop grading the challenge
- **AND** SHALL require full question and criteria
- **AND** SHALL offer a way to keep the existing Sandbox mode before saving

#### Scenario: Legacy Project is missing criteria

- **WHEN** an existing Project has incomplete grading text
- **THEN** the UI SHALL warn that content should be completed
- **AND** SHALL still allow an unrelated metadata edit for backward compatibility

#### Scenario: Existing Project content is cleared

- **WHEN** a Project already has a non-empty question or criteria and the mentor clears that field
- **THEN** save SHALL be blocked and the existing grading content SHALL NOT be removed
