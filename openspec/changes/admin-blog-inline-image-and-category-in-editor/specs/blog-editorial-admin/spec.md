# blog-editorial-admin (delta)

## ADDED Requirements

### Requirement: Insert images inline while writing a post

The blog editor SHALL let an author add an image at the cursor position by uploading it (not only by
pasting an external URL): via a toolbar upload button, by pasting an image from the clipboard, and by
drag-and-dropping an image file. Each SHALL upload through the blog media endpoint and insert the
returned image markdown at the current cursor, showing an uploading indicator.

#### Scenario: Upload button inserts at cursor

- **WHEN** the author clicks the editor's upload-image button and picks an image
- **THEN** the image is uploaded and its markdown inserted at the cursor position

#### Scenario: Paste an image

- **WHEN** the author pastes an image from the clipboard into the editor
- **THEN** the image is uploaded and inserted at the cursor

#### Scenario: Drag and drop an image

- **WHEN** the author drops an image file onto the editor
- **THEN** the image is uploaded and inserted at the cursor

### Requirement: Manage categories from the editor

The blog editor SHALL provide access to category management (create/edit/delete) from beside the
category selector, so an author can add or edit a category without leaving the post they are writing;
the selector reflects the updated categories after managing.

#### Scenario: Add a category while writing

- **WHEN** the author opens category management from the editor and creates a category
- **THEN** the new category becomes selectable in the post's category selector
