# admin-shortvideo-studio

## ADDED Requirements

### Requirement: Studio distinguishes a live story from an expired one

The clip list SHALL mark a published clip as live only while its story is still within the community
visibility window (24 hours from publishing). Past that window the clip SHALL be marked as no longer
displayed, and SHALL NOT be presented as being on the story rail.

#### Scenario: A clip published an hour ago

- **WHEN** the studio lists a clip whose story was published one hour ago
- **THEN** it SHALL be marked as currently on the story rail

#### Scenario: A clip published two days ago

- **WHEN** the studio lists a clip whose story was published two days ago
- **THEN** it SHALL be marked as no longer displayed, and removing it SHALL still be offered

#### Scenario: Publish time unknown

- **WHEN** a published clip carries no publish time
- **THEN** it SHALL be treated as live rather than labelled expired
