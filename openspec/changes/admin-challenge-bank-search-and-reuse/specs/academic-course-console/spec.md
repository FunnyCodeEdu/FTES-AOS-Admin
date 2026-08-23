# academic-course-console (delta)

## MODIFIED Requirements

### Requirement: Attaching challenges to lessons is searchable and shows lesson descriptions

The course challenge-bank tab SHALL let an admin search the course's challenges, SHALL show each
lesson's description alongside its name when picking the lesson to attach to, and SHALL offer
attaching an existing challenge from the shared bank (searchable and filterable by tag) to the
selected lesson without removing it from other courses.

#### Scenario: Find a challenge by name

- **WHEN** an admin types part of a challenge name in the search box
- **THEN** the challenge list narrows to matching challenges

#### Scenario: Distinguish lessons with duplicate names

- **WHEN** an admin opens the lesson picker for a challenge
- **THEN** each option shows the lesson's description as well as its name

#### Scenario: Reuse a challenge across courses

- **WHEN** an admin picks a lesson and attaches a challenge from the shared bank filtered by tag
- **THEN** the challenge is added to that lesson and remains attached wherever it was already used
