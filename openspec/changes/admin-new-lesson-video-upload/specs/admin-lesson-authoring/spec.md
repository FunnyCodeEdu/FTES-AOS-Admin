# admin-lesson-authoring (delta)

## ADDED Requirements

### Requirement: Upload a video file when creating a video lesson

The new-lesson modal SHALL let the author upload a video file directly for a VIDEO lesson (not only
paste an id/link), with a progress indicator. On create, if a file is chosen the lesson is created then
the video is uploaded and bound to it; pasting an id/link remains an alternative.

#### Scenario: Upload a file at create time

- **WHEN** the author picks a video file and creates the lesson
- **THEN** the lesson is created and the video file is uploaded and attached to it

#### Scenario: Paste id/link alternative

- **WHEN** the author pastes a video id/link instead of choosing a file
- **THEN** the lesson is created with that reference
