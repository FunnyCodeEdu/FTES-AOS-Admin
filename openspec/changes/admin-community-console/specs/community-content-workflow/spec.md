# community-content-workflow

## ADDED Requirements

### Requirement: Kanban workflow board

The system SHALL display a content workflow board at `/moderation/workflow` for users holding
`workflow.review`, with six columns — Draft, AI Review, Mod Review, Approved, Published,
Archived — populated from a server-side query supporting stage, type, search, and pagination
parameters.

#### Scenario: Reviewer opens the board

- **WHEN** a user with `workflow.review` opens `/moderation/workflow`
- **THEN** the system fetches workflow items from
  `GET /api/v1/admin/moderation/workflow/items` and renders each item as a card in the column
  matching its stage

#### Scenario: User without review permission

- **WHEN** a user lacking `workflow.review` navigates directly to `/moderation/workflow`
- **THEN** the system renders the 403 Forbidden page listing the missing permission
- **AND** the Workflow nav item is not rendered for that user

### Requirement: Permission-guarded drag-and-drop transitions

The system SHALL perform stage transitions via drag-and-drop, where each target stage maps to a
required permission, and SHALL prevent dropping a card into any column the user is not permitted
to transition into, indicating the blocked columns while dragging.

#### Scenario: Permitted transition

- **WHEN** a user with `workflow.review` drags a card from AI Review to Mod Review
- **THEN** the system optimistically moves the card and calls
  `POST /api/v1/admin/moderation/workflow/items/:id/transition` with `{toStage: "mod_review"}`

#### Scenario: Publishing requires workflow.publish

- **WHEN** a user without `workflow.publish` starts dragging a card in the Approved column
- **THEN** the Published column is marked as a non-droppable target and the drop is rejected
  client-side without any API call

#### Scenario: Backend rejects a transition

- **WHEN** the transition mutation returns a 403 or validation error
- **THEN** the system rolls the card back to its original column and shows an error notification
  containing the backend message

### Requirement: Workflow item detail

The system SHALL provide a detail drawer for each workflow card showing the content summary,
author, current stage, and full transition history including actor, timestamp, and note.

#### Scenario: Opening a card

- **WHEN** the user clicks a workflow card
- **THEN** a drawer opens showing the item detail and its transition history in reverse
  chronological order

### Requirement: Invalid transitions are blocked client-side

The system SHALL only allow transitions along the defined sequence
Draft → AI Review → Mod Review → Approved → Published → Archived (plus rejection back to Draft
from a review stage), and SHALL reject any other drag target before calling the API.

#### Scenario: Skipping stages

- **WHEN** a user drags a card from Draft directly onto Published
- **THEN** the drop is rejected client-side, the card stays in Draft, and no API call is made

### Requirement: Board UX states

The system SHALL render skeleton cards per column while loading, a muted placeholder for empty
columns, and an error state with retry when the board query fails.

#### Scenario: Board fetch fails

- **WHEN** the workflow items query fails
- **THEN** the system shows an error state with a retry action instead of empty columns
