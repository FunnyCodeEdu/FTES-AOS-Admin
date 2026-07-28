# admin-lesson-authoring (delta)

## ADDED Requirements

### Requirement: Reorder lessons and sections by drag-and-drop only

The curriculum editor SHALL let admins reorder lessons within a section and reorder sections by
drag-and-drop, and SHALL NOT show separate up/down arrow buttons for reordering. Moving a lesson to a
different section stays available both by dragging onto the target section and via the "move to another
section" menu.

#### Scenario: Reorder without arrow buttons

- **WHEN** an admin views the lesson list
- **THEN** no up/down arrow buttons are shown on a lesson row or a section card
- **AND** dragging a lesson row (or a section handle) reorders it, persisted on "Lưu thay đổi"

### Requirement: Inline lesson documents and challenges panel

Each saved lesson SHALL expose an expand ("+") control that opens an inline panel directly under the
lesson row, without leaving the list. The panel SHALL let the admin upload/list/remove the lesson's
documents and add/link/list its challenges (and assignments/quizzes), reusing the lesson authoring
panels, gated by manage permission, and SHALL load a lesson's attachments only when its panel is opened.

#### Scenario: Open the panel to see and add attachments

- **WHEN** an admin clicks the "+" control on a saved lesson
- **THEN** an inline panel opens under that lesson showing its documents and challenges
- **AND** the admin can upload a document and add a challenge from that panel

#### Scenario: Unsaved lesson has no panel

- **WHEN** a lesson has not been saved yet (no id)
- **THEN** no "+" control is shown for that lesson

#### Scenario: Lazy load

- **WHEN** a lesson's panel is not open
- **THEN** its documents and challenges are not fetched
