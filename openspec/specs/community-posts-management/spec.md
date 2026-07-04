# community-posts-management Specification

## Purpose
TBD - created by archiving change admin-community-console. Update Purpose after archive.
## Requirements
### Requirement: Posts list with server-side pagination and search

The system SHALL display community posts at `/community/posts` in a table using server-side
pagination and sorting, with free-text search on title/author and filters for group, status,
pinned, and featured, for users holding `community.post.view`.

#### Scenario: Searching posts

- **WHEN** a user with `community.post.view` enters a search term and applies a group filter
- **THEN** the system queries `GET /api/v1/admin/community/posts` with the search, filter, and
  pagination parameters and renders the returned page with total count

#### Scenario: User without view permission

- **WHEN** a user lacking `community.post.view` navigates directly to `/community/posts`
- **THEN** the system renders the 403 Forbidden page listing the missing permission
- **AND** the Posts nav item is not rendered for that user

### Requirement: Pin and unpin posts

The system SHALL allow users holding `community.post.pin` to pin or unpin a post, confirming the
action before submitting, and SHALL refresh the list after the mutation succeeds.

#### Scenario: Pinning a post

- **WHEN** a user with `community.post.pin` confirms the Pin action on a row
- **THEN** the system calls `POST /api/v1/admin/community/posts/:id/pin` and the row reflects
  the pinned state after the list is invalidated

#### Scenario: User without pin permission

- **WHEN** a user holds `community.post.view` but not `community.post.pin`
- **THEN** the Pin/Unpin action is not rendered on any row

### Requirement: Feature and unfeature posts

The system SHALL allow users holding `community.post.feature` to feature or unfeature a post,
with a confirmation dialog stating that featured posts are promoted on community surfaces.

#### Scenario: Featuring a post

- **WHEN** a user with `community.post.feature` confirms the Feature action
- **THEN** the system calls `POST /api/v1/admin/community/posts/:id/feature` and shows the
  featured badge on the row after success

### Requirement: Hide post with mandatory reason and audit

The system SHALL allow users holding `community.post.hide` to hide a post only through a
confirmation dialog that states the consequence and requires a reason, and the action SHALL be
recorded to the audit/moderation log by the backend; unhide SHALL require confirmation but no
reason.

#### Scenario: Hiding a post

- **WHEN** a user with `community.post.hide` confirms Hide with a non-empty reason
- **THEN** the system calls `POST /api/v1/admin/community/posts/:id/hide` with `{reason}`
- **AND** the post row shows the hidden state and the action appears in the moderation log

#### Scenario: Hide without reason is blocked

- **WHEN** the user submits the Hide confirmation with an empty reason
- **THEN** submission is blocked with a validation message and no API call is made

### Requirement: Posts list UX states

The system SHALL render a skeleton table while loading, an empty state when no posts match the
filters, and an error state with retry on query failure.

#### Scenario: No posts match filters

- **WHEN** the posts query returns zero items for the active filters
- **THEN** the system shows an empty state suggesting the user adjust search or filters

