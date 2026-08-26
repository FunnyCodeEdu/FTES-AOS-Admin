# challenge-authoring (delta)

## MODIFIED Requirements

### Requirement: Challenge description is authored as markdown

The challenge create and edit forms SHALL provide a markdown editor for the description, tall enough
to review a full problem statement, with preview and image insertion (toolbar, paste, drag-and-drop).
Images SHALL upload through the challenge media endpoint so a challenge author does not need blog
permissions.

#### Scenario: Write a long problem statement

- **WHEN** an author opens the description field
- **THEN** a markdown editor with preview is shown instead of a two-row textarea

#### Scenario: Insert an image

- **WHEN** an author pastes or drops an image into the description
- **THEN** the image is uploaded and a markdown image link is inserted at the cursor
