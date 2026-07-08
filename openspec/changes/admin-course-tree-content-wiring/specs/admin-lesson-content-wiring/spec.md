## ADDED Requirements

### Requirement: Lesson content reads/writes the real backend

Lesson content SHALL be loaded and saved via `GET/PUT /api/v1/lessons/{id}/content` (through `coreClient`) instead of the in-memory mock.

#### Scenario: Load existing content

- **WHEN** the admin opens a lesson's content editor
- **THEN** the current markdown body is fetched from `GET /api/v1/lessons/{id}/content`

#### Scenario: Save content

- **WHEN** the admin saves the markdown body
- **THEN** it is written via `PUT /api/v1/lessons/{id}/content` with `{ bodyMd, readingMinutes }` and the content query is invalidated
