# admin-ai-exam-to-quiz-editor

## ADDED Requirements

### Requirement: AI question generation inside the quiz editor
The system SHALL add a "Sinh câu hỏi bằng AI" action to the quiz editor opening a modal that takes a context source (a lesson of the course, or a free topic), a question count (1..50) and a difficulty, submits `POST /api/v1/ai/teacher/exam-generate`, and polls `GET /api/v1/ai/jobs/{id}` until COMPLETED/FAILED.

#### Scenario: Generate from a lesson
- **WHEN** a lecturer picks a lesson, 10 questions, MEDIUM and submits
- **THEN** the request body carries `{lessonId, questionCount: 10, difficulty: "MEDIUM"}` and the modal shows a polling state until the job finishes

### Requirement: Preview with human curation before insertion
The system SHALL render the generated questions (mapping `prompt→question`, `answer_key→correct`) as an editable preview — inline edits and per-question keep/drop — and only append the kept questions into the quiz editor's local question list on explicit confirm; the quiz itself is saved only through the editor's existing save action.

#### Scenario: Drop a bad question then insert
- **WHEN** the preview shows 10 questions and the lecturer unchecks 2 and confirms
- **THEN** exactly 8 questions append to the editor list and no quiz save request fires automatically

#### Scenario: Model attribution visible
- **WHEN** the preview renders
- **THEN** the generating model from the job result is displayed

### Requirement: Job envelope and failure handling
The system SHALL treat the submit envelope code 1002 (Accepted) as success, surface FAILED jobs with their errorCode, and show a permission-clear message on 403 (lesson not taught by the caller).

#### Scenario: Foreign lesson rejected
- **WHEN** the BE answers 403 for a lesson outside the lecturer's courses
- **THEN** the modal shows an ownership error and nothing is inserted
