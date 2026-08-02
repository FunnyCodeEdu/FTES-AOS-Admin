# admin-lesson-authoring (delta)

## ADDED Requirements

### Requirement: Toggle a lesson's free ("học thử") flag from the exercises panel

The lesson exercises panel SHALL show a "Miễn phí (học thử)" toggle bound to the lesson's current `free`
flag, gated by manage permission. Toggling it SHALL PATCH the lesson meta (`free`), show a loading state
and a success message, and reflect the new state immediately (optimistic), reverting on error. A
tooltip SHALL explain that enabling it opens the whole lesson to logged-in learners without enroll, so
the lesson's "học thử" exercises also open.

#### Scenario: Enable free on a premium lesson

- **WHEN** an author toggles "Miễn phí (học thử)" on for a lesson
- **THEN** the lesson's `free` flag is PATCHed to true and a success message is shown
- **AND** the toggle reflects the on state immediately

#### Scenario: Read-only viewer cannot toggle

- **WHEN** a user without manage permission views the exercises panel
- **THEN** the lesson free toggle is disabled

### Requirement: Toggle a challenge's free ("học thử") flag inline on its row

Each attached-challenge row in the lesson exercises panel SHALL show a "Học thử" toggle bound to the
challenge's current `free` flag, for users who can manage challenges. Toggling it SHALL update the
challenge (`free`), show a per-row loading state and a success message, and refresh the row via the
challenge list invalidation. A tooltip SHALL note that the challenge only opens when the lesson itself
is also free/open. The unattached ("chưa gắn") bank list SHALL NOT show this toggle. Read-only viewers
SHALL still see the "Miễn phí" tag for a free challenge.

#### Scenario: Toggle a challenge free on its row

- **WHEN** an author toggles "Học thử" on an attached challenge row
- **THEN** the challenge's `free` flag is updated and a success message is shown
- **AND** the row refreshes to the new state

#### Scenario: Unattached challenges have no inline toggle

- **WHEN** the "thử thách chưa gắn" (bank) list is shown
- **THEN** its rows do not show the inline "Học thử" toggle
