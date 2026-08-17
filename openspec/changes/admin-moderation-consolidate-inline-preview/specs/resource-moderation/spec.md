# resource-moderation (delta)

## MODIFIED Requirements

### Requirement: Single moderation surface

The admin SHALL expose exactly one resource-moderation queue (the BE approval-scoped queue). The older
GraphQL admin-global review screen SHALL be removed so approvers are not split across two lists.

#### Scenario: Only one moderation nav entry

- **WHEN** an approver opens the admin nav
- **THEN** there is a single "Duyệt đề thi & học liệu" entry and no separate "Duyệt học liệu" screen

## ADDED Requirements

### Requirement: Inline content preview in moderation drawer

The moderation detail drawer SHALL preview the submitted file's content inline (PDF, image, and text
rendered in place; other formats show a notice plus a download fallback), so an approver can review
content without downloading and opening the file.

#### Scenario: PDF submission

- **WHEN** an approver opens a pending PDF resource
- **THEN** the PDF renders inline in the drawer

#### Scenario: Non-previewable format

- **WHEN** the file is a format that cannot render inline (e.g. a zip)
- **THEN** the drawer shows a notice and a download-original action
