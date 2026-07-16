# admin-ai-difficulty-suggest

## ADDED Requirements

### Requirement: Quiz difficulty analysis action
The system SHALL add a "Phân tích độ khó (AI)" action to the quiz page submitting `POST /api/v1/ai/teacher/difficulty` with `{quizId}`, polling the job, and rendering the result (markdown/structured output plus the serving model) in a side panel.

#### Scenario: Analyze a quiz
- **WHEN** a lecturer triggers the analysis on their quiz
- **THEN** a panel opens showing the AI difficulty assessment when the job completes

#### Scenario: Failure is honest
- **WHEN** the job reaches FAILED
- **THEN** the panel shows the error state with the job errorCode and a retry affordance
