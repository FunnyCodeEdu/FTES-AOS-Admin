# blog-editorial-admin

## ADDED Requirements

### Requirement: Author and manage blog posts
The admin console SHALL provide a blog module to list posts and to create/edit a post with
title, slug, category, thumbnail, and markdown content, calling the `/api/v1/blog` endpoints
under `blog.manage`.

#### Scenario: Create a draft
- **WHEN** an editor with `blog.manage` saves a new post as draft
- **THEN** the post is created unpublished and appears in the list with a draft status

#### Scenario: Edit an existing post
- **WHEN** an editor opens an existing post and changes its content
- **THEN** the update is persisted

### Requirement: Publish lifecycle
The console SHALL let an editor publish and unpublish a post, and a published post SHALL
become visible on the public blog.

#### Scenario: Publish makes it public
- **WHEN** an editor publishes a post
- **THEN** the post is marked published and is retrievable via the public blog endpoints

#### Scenario: Unpublish hides it
- **WHEN** an editor unpublishes a post
- **THEN** the post no longer appears in public listings

### Requirement: Markdown content is edited and previewed safely
The console SHALL edit post content as markdown (matching the backend `content_md`) and
render any preview through a sanitizing renderer.

#### Scenario: Preview sanitizes
- **WHEN** an editor previews content containing an unsafe HTML snippet
- **THEN** the preview strips/escapes the unsafe markup rather than executing it

### Requirement: Manage blog categories
The console SHALL let an editor create, update, and delete blog categories used to
classify posts.

#### Scenario: Add a blog category
- **WHEN** an editor with `blog.manage` creates a blog category
- **THEN** it becomes selectable when authoring a post
