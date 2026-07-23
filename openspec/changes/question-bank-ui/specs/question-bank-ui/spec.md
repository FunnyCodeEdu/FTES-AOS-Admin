# question-bank-ui

## ADDED Requirements

### Requirement: Question bank list gated by question.bank.manage

The system SHALL expose a question-bank console at `/question-banks` that lists every bank the
caller can manage from `GET /api/v1/question-banks` via `coreClient`, gated by the
`question.bank.manage` permission leaf, with client-side title/description search and a create
action.

#### Scenario: Manager views the bank list

- **WHEN** a user holding `question.bank.manage` opens `/question-banks`
- **THEN** a table lists the banks they manage with title, item count, status, and created date
- **AND** a "Tạo kho câu hỏi" button is rendered for that user

#### Scenario: User without the leaf is refused

- **WHEN** a user lacking `question.bank.manage` navigates to `/question-banks`
- **THEN** the `/403` page is shown naming the missing `question.bank.manage` permission
- **AND** the "Kho câu hỏi" navigation entry is not rendered for that user

#### Scenario: Client-side search

- **WHEN** the manager types text into the search box
- **THEN** the table shows only banks whose title or description matches
- **AND** an empty state is shown when no bank matches

### Requirement: Create question bank

The console SHALL let a `question.bank.manage` user create a bank via
`POST /api/v1/question-banks` with `{ title, description? }`, and SHALL invalidate the bank list
on success.

#### Scenario: Create a bank

- **WHEN** a manager submits the create form with a title
- **THEN** `POST /question-banks` is sent with `{ title, description? }`
- **AND** on success the modal closes, a success message shows, and the bank list query is invalidated

#### Scenario: Title is required

- **WHEN** a manager submits the create form without a title
- **THEN** a validation error is shown and no request is sent

### Requirement: Batch image upload as multipart

The bank detail page SHALL let a `question.bank.manage` user drag-and-drop a folder of images
and upload them in one `POST /api/v1/question-banks/{id}/images` multipart request whose
`files` field carries the accumulated files, overriding the client's default JSON
`Content-Type` so the browser sets the multipart boundary, and SHALL show upload progress.

#### Scenario: Upload a batch of images

- **WHEN** a manager drops image files and clicks the upload button
- **THEN** a single multipart request is sent with the files under `files` and a per-request `Content-Type` override
- **AND** a progress indicator reflects `onUploadProgress` during the request

#### Scenario: Non-image or oversize files are filtered

- **WHEN** the dropped folder contains non-webp/png/jpg files or more than the ~50 cap
- **THEN** the rejected or overflow files are excluded and a warning is shown before uploading

#### Scenario: Uploaded items appear as pending

- **WHEN** the upload succeeds
- **THEN** the bank detail query is invalidated and the newly created items appear with status PENDING

### Requirement: Poll pending items until terminal

The bank detail query SHALL refetch on a 3s interval while any item has status `PENDING` and
SHALL stop refetching once no item is `PENDING`, without refetching in the background, so that
`SOLVED`/`FAILED` results appear and polling ends on terminal state.

#### Scenario: Polling runs while items are pending

- **WHEN** the detail page shows at least one item with status PENDING
- **THEN** the detail query refetches every 3 seconds
- **AND** an alert indicates how many images are still being processed

#### Scenario: Polling stops on terminal state

- **WHEN** every item has reached SOLVED or FAILED
- **THEN** the detail query stops its interval refetch
- **AND** each SOLVED item renders its questions, answers, and explanations while FAILED items show a failure note

#### Scenario: Stale copy after a long wait

- **WHEN** an item remains PENDING beyond roughly 90 seconds
- **THEN** the wording changes to indicate a longer wait without stopping the poll

### Requirement: Re-solve and delete items restricted to question.bank.manage

The detail page SHALL let a `question.bank.manage` user re-run AI on an item via
`POST /api/v1/question-banks/{id}/items/{itemId}/resolve` and delete an item via
`DELETE /api/v1/question-banks/{id}/items/{itemId}` guarded by a danger confirm, invalidating
the detail query on success.

#### Scenario: Re-solve a failed item

- **WHEN** a manager clicks "Giải lại" on a FAILED item
- **THEN** `POST .../items/{itemId}/resolve` is sent and the item returns to PENDING with polling resumed

#### Scenario: Delete requires danger confirm

- **WHEN** a manager clicks delete on an item
- **THEN** a danger confirm requires confirmation before `DELETE .../items/{itemId}` is sent

#### Scenario: Item actions hidden without the leaf

- **WHEN** a user without `question.bank.manage` views an item card
- **THEN** no re-solve or delete control is rendered

### Requirement: Delete question bank with danger confirm

The console SHALL let a `question.bank.manage` user delete a bank via
`DELETE /api/v1/question-banks/{id}` behind a danger confirm, invalidating the bank list on
success.

#### Scenario: Delete a bank

- **WHEN** a manager confirms the delete-bank danger dialog
- **THEN** `DELETE /question-banks/{id}` is sent and the bank list refreshes without the deleted bank

#### Scenario: Delete hidden without the leaf

- **WHEN** a user without `question.bank.manage` views the list or detail
- **THEN** no delete-bank control is rendered

### Requirement: Question bank error codes mapped to Vietnamese messages

The console SHALL map question-bank backend error codes to Vietnamese messages in
`src/shared/api/errors.ts` so raw codes never surface in the UI, reusing
`handleAdminMutationError` / `adminErrorMessage`.

#### Scenario: Known question-bank error code

- **WHEN** a mutation fails with `QUESTION_BANK_NOT_FOUND`, `QUESTION_BANK_FORBIDDEN`, or `QUESTION_BANK_UPLOAD_INVALID`
- **THEN** the corresponding Vietnamese message from the error map is shown instead of the raw code

#### Scenario: Unknown code falls back safely

- **WHEN** a mutation fails with a code absent from the map
- **THEN** the backend envelope message is shown and no raw error object leaks to the UI
