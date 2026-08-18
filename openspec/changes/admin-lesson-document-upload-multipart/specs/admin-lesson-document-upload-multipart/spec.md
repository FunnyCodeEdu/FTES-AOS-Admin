# admin-lesson-document-upload-multipart

## ADDED Requirements

### Requirement: Uploading a lesson document sends multipart
Attaching a document to a lesson from the admin app SHALL send the file as a `multipart/form-data`
request body, both from the new-lesson dialog and from the lesson editing screen.

#### Scenario: The file survives the request pipeline
- **WHEN** an admin picks a slide deck and saves
- **THEN** the request body reaching the transport SHALL still be the form data carrying the file
- **AND** SHALL NOT have been converted into a JSON document

#### Scenario: A shared JSON default does not leak into file uploads
- **WHEN** the shared API client declares a JSON content type for ordinary requests
- **THEN** a file upload made through that same client SHALL override it rather than inherit it
