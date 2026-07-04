# quiz-bank-management

## Purpose
Quản lý ngân hàng câu hỏi (Quiz bank): CRUD câu hỏi theo subject, tag/độ khó, import hàng loạt, review status.

## Requirements

### Requirement: Server-side question list
The system SHALL list quiz questions at `/academic/quiz-bank` with server-side pagination, search by question text, and filters for subject, tag, difficulty, and review status.

#### Scenario: Admin filters the question bank
- **WHEN** an admin holding `quiz.view` filters by subject and difficulty with a search term
- **THEN** the system requests the list with the combined parameters and renders the returned page
- **AND** shows skeleton, empty, and error-with-retry states appropriately

#### Scenario: Admin without quiz.view
- **WHEN** a signed-in admin lacking `quiz.view` navigates to `/academic/quiz-bank` by URL
- **THEN** the system renders the Forbidden page and the quiz bank navigation item is not rendered

### Requirement: Question CRUD gated by quiz.manage
The system SHALL allow creating, editing, and deleting questions only for callers holding `quiz.manage`.

#### Scenario: Admin creates a question
- **WHEN** an admin holding `quiz.manage` submits a question with subject, content, answers, correct answer, tags, and difficulty
- **THEN** the system persists the question and shows it in the list
- **AND** field-level validation errors from the backend are shown on the corresponding fields

#### Scenario: Admin deletes a question
- **WHEN** the admin confirms the delete dialog warning that quizzes referencing this question are affected
- **THEN** the system deletes the question and the action is recorded in the audit log by the backend

#### Scenario: Caller lacks quiz.manage
- **WHEN** an admin holding only `quiz.view` opens the question bank
- **THEN** create, edit, delete, and import controls SHALL NOT be rendered

### Requirement: Bulk import with per-row error report
The system SHALL support bulk question import as an asynchronous job that reports imported counts and per-row errors.

#### Scenario: Admin imports a question file
- **WHEN** an admin holding `quiz.manage` uploads an import file
- **THEN** the system submits the file, receives a job id, and polls until completion
- **AND** displays the number of imported questions and a per-row error list for rejected rows

#### Scenario: Import file is entirely invalid
- **WHEN** the import job finishes with zero imported rows
- **THEN** the system shows a failure summary with the row errors and no questions are added to the bank

### Requirement: Question review status
The system SHALL display each question's review status and let callers holding `quiz.manage` move questions between draft and ready states.

#### Scenario: Admin marks a question ready
- **WHEN** the admin marks a draft question as ready
- **THEN** the system persists the status change and the question becomes selectable for quizzes
