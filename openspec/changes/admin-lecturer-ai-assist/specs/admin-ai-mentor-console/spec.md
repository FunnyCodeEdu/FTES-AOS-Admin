# admin-ai-mentor-console

## ADDED Requirements

### Requirement: Mentor assistant page in the academic console
The system SHALL add a "Trợ lý AI" page to the academic console navigation with three tabs — Student brief (pick course then student → `POST /ai/mentor/student-brief`), Feedback assist (context + intent → drafted feedback with a copy button, never auto-sent to the student), Cohort insight (pick course → `POST /ai/mentor/cohort-insight`) — each rendering the synchronous response with loading/error states and the serving model when present.

#### Scenario: Student brief flow
- **WHEN** a lecturer selects a course and one enrolled student and requests a brief
- **THEN** the brief renders as formatted text after the call completes

#### Scenario: Feedback stays mentor-in-the-loop
- **WHEN** feedback assist returns a draft
- **THEN** the UI offers copy only — no send-to-student action exists

### Requirement: Permission-gated visibility
The system SHALL show the "Trợ lý AI" menu entry and the quiz-editor AI actions only when the session carries the `ai.teacher.use` permission, using the console's existing permission gating mechanism.

#### Scenario: Non-teaching admin does not see the tools
- **WHEN** a session lacks `ai.teacher.use`
- **THEN** neither the menu entry nor the generate button renders
