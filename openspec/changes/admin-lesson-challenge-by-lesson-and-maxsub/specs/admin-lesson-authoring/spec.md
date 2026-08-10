# admin-lesson-authoring (delta)

## ADDED Requirements

### Requirement: Lesson challenge panel shows all of a lesson's challenges

The per-lesson exercise panel SHALL list every challenge attached to the lesson regardless of status
(including DRAFT) and visibility (including COURSE_ONLY), sourced from the admin by-lesson endpoint —
not the public challenge list which omits course-only/draft challenges.

#### Scenario: Course-only challenge is visible

- **WHEN** a lesson has a COURSE_ONLY (or DRAFT) challenge attached
- **THEN** that challenge appears in the lesson's exercise panel

### Requirement: CODE challenge kind is clearly chosen

When authoring a CODE challenge, the wizard SHALL make the kind an explicit, clearly labeled choice
between "Test case (chấm tự động)" and "Bài nộp / Project (AI chấm)", with a description stating that a
project/submission has no test cases and no code area. A test-case CODE challenge SHALL provide
per-case input and expected output fields; a project/submission SHALL show only submission config and
rubric.

#### Scenario: Project shows no code area

- **WHEN** the author selects "Bài nộp / Project"
- **THEN** no test-case editor or starter-code area is shown — only submission method + rubric

#### Scenario: Test case has input/output

- **WHEN** the author selects "Test case"
- **THEN** each test case row has an input and an expected-output field

### Requirement: Edit a challenge's max submissions

The challenge quick-edit SHALL let an admin change the maximum submission count (số lần nộp tối đa) of an
existing challenge, sent as a partial update (only when changed to a positive value).

#### Scenario: Change max submissions

- **WHEN** the admin sets a new positive "Số lần nộp tối đa" and saves
- **THEN** the challenge's max submissions is updated (partial PATCH)
