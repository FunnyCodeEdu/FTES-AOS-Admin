# admin-course-editor

## ADDED Requirements

### Requirement: Course detail tabs are slimmed

`CourseDetailPage` SHALL NOT render a separate "Nội dung" tab nor a separate "Publish" tab nor a
"Kho thử thách" tab. Editing the chapter/lesson tree SHALL happen only in the "Bài học" tab, and
the publish checklist + publish action SHALL live in the "Tổng quan" tab.

#### Scenario: Publish from overview

- **WHEN** a manager with `course.publish` opens the "Tổng quan" tab
- **THEN** the publish checklist and publish action SHALL be shown there without a dedicated tab

### Requirement: Trial preview is edited inline on the lesson row

Each VIDEO/DOCUMENT lesson row SHALL expose an inline trial editor. It SHALL distinguish the three
backend states: an explicit override (`previewSeconds`/`previewPercent` > 0) shows the switch on
with the value; an inherited state (value is null) shows the switch off but, when the course
default is active (effective > 0), also shows an "kế thừa · <effective>" tag and a "Tắt hẳn"
action that writes 0 directly; an explicit off (value === 0) shows the switch off with no tag.

#### Scenario: Inherited trial is not mistaken for off

- **WHEN** a lesson inherits an active course-level trial (own value is null, effective > 0)
- **THEN** the row SHALL show the switch off together with a "kế thừa" tag showing the effective
  duration/percent, and offer "Tắt hẳn" to persist 0 without first persisting a positive override

### Requirement: Move controls are disabled for non-lesson rows

Up/Down and "Chuyển chương" controls SHALL be disabled for rows backed by a tree node whose type is
not `lesson` (legacy `assignment` nodes), and dropping such a row onto another section SHALL show a
warning instead of silently doing nothing.

#### Scenario: Legacy assignment row cannot be moved silently

- **WHEN** a manager drags a legacy assignment row onto another section
- **THEN** a warning SHALL explain only lessons can be moved, and no silent no-op SHALL occur

### Requirement: Challenge visibility and paid-content warning move to the lesson

Publishing a challenge to the workspace (`WORKSPACE_PUBLIC`) SHALL be triggered from the
per-lesson exercises card, guarded by a confirm whose wording reflects the course pricing: for a
paid course/package it SHALL warn that public exposure leaks paid content. The lesson editor SHALL
supply the course `basePrice`/`saleMode` so this precise warning is reachable.

#### Scenario: Paid course shows the strong warning

- **WHEN** a manager publishes a challenge on a lesson of a paid course
- **THEN** the confirm SHALL show the "nội dung trả phí" warning (not the generic fallback)

### Requirement: Unattached course challenges stay reachable

`LessonExercisesCard` SHALL surface challenges of the course that are not attached to any lesson
(`GET /admin/challenges?courseId`, including DRAFT). Each SHALL offer attach-to-this-lesson,
publish, and visibility actions so a challenge created but never linked (wizard closed early, or a
409 lesson-attach conflict) is never orphaned out of the admin UI.

#### Scenario: Orphaned challenge can be recovered

- **WHEN** a challenge was created but its lesson link failed or was abandoned
- **THEN** it SHALL appear under "Thử thách chưa gắn" with an action to attach it to the current
  lesson

### Requirement: Challenge actions honor challenge.manage

Creating a challenge and toggling its visibility SHALL be permitted when the caller can manage the
course (`course.manage`/ownership) OR holds `challenge.manage` globally, independently of the
lesson-editing gate.

#### Scenario: Moderator with only challenge.manage

- **WHEN** a moderator holding only `challenge.manage` opens a lesson's exercises card
- **THEN** they SHALL be able to open the challenge wizard and toggle visibility, even though the
  lesson-content controls are read-only for them
