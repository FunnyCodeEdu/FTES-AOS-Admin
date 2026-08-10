# admin-lesson-authoring (delta)

## ADDED Requirements

### Requirement: Delete a challenge from the per-lesson panel

The per-lesson exercise panel SHALL let an admin delete a challenge (attached or unattached) via a
confirmation requiring an audit reason, using the same delete endpoint as the challenge bank.

#### Scenario: Delete a challenge in the lesson panel

- **WHEN** the admin clicks Xoá on a challenge row, enters a reason, and confirms
- **THEN** the challenge is deleted and the panel refreshes

### Requirement: Subject and resource deletion sends the audit reason

Deleting a subject or a resource SHALL collect a reason and send it in the delete request body, so the
reason-guarded backend accepts it (previously the request omitted the reason and always failed).

#### Scenario: Delete a subject with reason

- **WHEN** the admin confirms deleting a subject with a reason
- **THEN** the delete request includes the reason and succeeds (no 400)
