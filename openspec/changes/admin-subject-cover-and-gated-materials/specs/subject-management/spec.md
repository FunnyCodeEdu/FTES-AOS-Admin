## ADDED Requirements

### Requirement: Subject cover image management

The system SHALL let admins holding `subject.manage` set, update, and clear a subject's cover
image URL (`imageUrl`) from the subject Info tab. Because `imageUrl` is exposed and accepted only on
the core subject endpoint keyed by subject CODE (`GET`/`PATCH /api/v1/subjects/{code}`) — not on the
admin subject endpoint keyed by id — the cover control SHALL read and write through that core
endpoint by CODE. The field SHALL be optional and nullable.

#### Scenario: Admin sets a cover image

- **WHEN** an admin holding `subject.manage` enters an image URL in the subject cover control and saves
- **THEN** the system sends `imageUrl` in the core subject `PATCH /api/v1/subjects/{code}` body and shows a success message
- **AND** an inline preview of the entered URL is shown while editing

#### Scenario: Admin clears the cover image

- **WHEN** an admin holding `subject.manage` empties the cover field and saves
- **THEN** the system sends `imageUrl: ""` (empty string) so the backend clears the stored cover
- **AND** the empty string is used rather than `null` because the backend only writes the cover when the value is non-null

#### Scenario: Caller lacks subject.manage

- **WHEN** an admin lacking `subject.manage` opens the subject Info tab
- **THEN** the cover control is not rendered and the cover image cannot be changed
