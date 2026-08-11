# challenge-bank-global-ui

## ADDED Requirements

### Requirement: Browse the challenge bank across all subjects
The challenge bank SHALL offer a mode that lists challenges from every subject, not only the current
course, so an author can reuse an existing problem. The current-course view SHALL remain the default
so existing habits are preserved.

#### Scenario: Switching to the shared bank
- **WHEN** an author turns on the all-subjects mode
- **THEN** challenges from other courses and subjects SHALL be listed, subject to their authorization

### Requirement: Search and filter the bank
The bank SHALL provide a title search box and filters for tag, difficulty, type, subject, status and
unattached-only, driven by the server rather than by filtering an already-loaded page, with
pagination.

#### Scenario: Finding a problem by title
- **WHEN** an author types part of a challenge title
- **THEN** matching challenges SHALL be listed even if they were not on the first page

#### Scenario: Filtering by tag
- **WHEN** an author selects a tag
- **THEN** only challenges carrying that tag SHALL be listed

### Requirement: Attach one challenge to several lessons
The UI SHALL present attachment as adding a place of use rather than moving the challenge: it SHALL
show how many lessons a challenge is currently used in and which ones, adding a placement SHALL not
remove the others, and the remove action SHALL clearly remove only the selected placement.

#### Scenario: Reusing a problem
- **WHEN** an author attaches a challenge that is already used elsewhere to the selected lesson
- **THEN** the challenge SHALL be shown as used in both places
- **AND** no warning about losing the previous attachment SHALL be implied by the wording

### Requirement: Manage challenge tags
The UI SHALL let an author view and edit a challenge's tags with autocomplete over existing tags and
the ability to introduce a new one.

#### Scenario: Tagging a challenge
- **WHEN** an author saves a new set of tags
- **THEN** those tags SHALL be persisted and reflected in the bank filters

### Requirement: Course overview shows challenge tags
The course overview SHALL show a summary of the tags used by that course's challenges, and selecting
one SHALL open the bank filtered by that tag.

#### Scenario: Jumping from overview to bank
- **WHEN** an author selects a tag in the course overview
- **THEN** the challenge bank SHALL open filtered by that tag

### Requirement: Lesson tree shows descriptions
The chapter and lesson tree used to choose an attachment target SHALL display each lesson's
description beneath its title when one exists, matching how the lessons tab already renders it.

#### Scenario: Choosing the right lesson
- **WHEN** lessons in the tree have descriptions
- **THEN** each description SHALL be shown as secondary text under the lesson title
