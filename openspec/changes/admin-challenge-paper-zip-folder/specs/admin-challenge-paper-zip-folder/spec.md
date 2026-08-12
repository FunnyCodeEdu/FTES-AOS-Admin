# admin-challenge-paper-zip-folder

## ADDED Requirements

### Requirement: Exam papers accept archives as well as images and PDFs

The console SHALL accept a `.zip` archive as the exam paper of a challenge, in addition to the image
and PDF formats already supported. The console SHALL recognise an archive by its MIME type
(`application/zip`, `application/x-zip-compressed`) or, when the browser reports no MIME type or a
generic one, by its `.zip` file extension.

#### Scenario: Uploading a zip archive as the paper

- **WHEN** an operator picks a `.zip` file within the archive size limit and confirms the upload
- **THEN** the archive SHALL be sent to the server as the challenge's exam paper
- **AND** the challenge SHALL then show the archive's name, its size and a way to open it

#### Scenario: Browser reports no MIME type for a zip

- **WHEN** the operating system gives the browser no MIME type for a picked `.zip` file
- **THEN** the console SHALL still recognise it as an archive from its extension
- **AND** SHALL NOT reject it merely for the missing MIME type

#### Scenario: A renamed non-archive is refused before upload

- **WHEN** a file whose name ends in `.zip` is not a real archive by its leading bytes
- **THEN** the console SHALL refuse it on the operator's machine and say it is not a real zip
- **AND** SHALL NOT spend the upload

#### Scenario: A format outside the accepted set

- **WHEN** an operator picks a file that is neither an accepted image, a PDF, nor an archive
- **THEN** the console SHALL refuse it and name the formats that are accepted

### Requirement: Every paper format has its own stated size limit

The console SHALL enforce a size limit per format — image, PDF and archive each have their own —
and SHALL state each limit in the dialog before a file is chosen. A refusal for size SHALL name the
format, the size of the offending file and the limit that applies to that format.

#### Scenario: A file over the limit for its own format

- **WHEN** an operator picks a file larger than the limit for that file's format
- **THEN** the console SHALL refuse it without contacting the server
- **AND** the message SHALL state the file's size and the limit for that format

#### Scenario: A file allowed by its own format's larger limit

- **WHEN** an operator picks a file that exceeds the limit of a stricter format but is within the
  limit of its own format
- **THEN** the console SHALL accept it

#### Scenario: An empty file

- **WHEN** an operator picks a file of zero bytes
- **THEN** the console SHALL refuse it and ask for the file to be picked again

### Requirement: A whole folder can be supplied as the exam paper

The console SHALL offer, next to the single-file option, a way to pick a whole folder, and SHALL
compress the folder's contents into one archive in the browser before uploading it. The relative
path of each file inside the picked folder SHALL be preserved inside the archive so the folder
structure survives the round trip. The two options SHALL be labelled so it is clear which is for a
single image or PDF and which is for a folder of many files.

#### Scenario: Picking a folder

- **WHEN** an operator picks a folder
- **THEN** the console SHALL compress its files into a single archive
- **AND** each file SHALL keep its path relative to the picked folder inside that archive
- **AND** the archive SHALL then be uploaded through the same paper upload as a single file

#### Scenario: A folder with nothing to send

- **WHEN** every file in the picked folder is skipped
- **THEN** the console SHALL say the folder has nothing to compress
- **AND** SHALL NOT upload an empty archive

#### Scenario: A folder too large to compress in the browser

- **WHEN** the picked folder's total size is beyond what the browser is asked to compress
- **THEN** the console SHALL refuse before starting to compress
- **AND** SHALL state the total size it measured

### Requirement: Compressing a folder shows progress and the resulting size before upload

The console SHALL show progress while it compresses a folder, and SHALL show the size of the
resulting archive before the operator commits to uploading it. The archive size limit SHALL be
enforced against the produced archive, not against the folder's raw contents.

#### Scenario: Progress while compressing

- **WHEN** compression of a picked folder is under way
- **THEN** the console SHALL show that it is compressing and how far along it is
- **AND** the upload and file-picking controls SHALL be unavailable until it finishes

#### Scenario: Archive size shown before upload

- **WHEN** compression finishes
- **THEN** the console SHALL show the archive's name, its size and how many files it contains
- **AND** the upload SHALL only start when the operator asks for it

#### Scenario: The produced archive exceeds the archive limit

- **WHEN** the archive produced from a folder is larger than the archive size limit
- **THEN** the console SHALL refuse it and state the archive's size and the limit
- **AND** SHALL NOT contact the server

### Requirement: Files skipped from a folder are reported, never dropped silently

The console SHALL skip files that cannot usefully travel in the archive — operating-system junk
files and zero-byte files — and SHALL report how many were skipped and why, with examples, before
the upload happens.

#### Scenario: Junk files in a picked folder

- **WHEN** the picked folder contains operating-system junk files
- **THEN** those files SHALL be left out of the archive
- **AND** the console SHALL state how many were left out and why

#### Scenario: Zero-byte files in a picked folder

- **WHEN** the picked folder contains zero-byte files
- **THEN** those files SHALL be left out of the archive
- **AND** SHALL be reported separately from junk files

#### Scenario: Nothing skipped

- **WHEN** no file in the picked folder is skipped
- **THEN** the console SHALL show no skip report

### Requirement: The server's own rejection wins over the client's mirrored limits

The console SHALL show the server's own message when the server rejects a paper upload, rather than
substituting a limit or a format list held in the client. Client-side format and size checks exist
to fail an impossible upload immediately; they mirror the server's rules but are not the authority.

#### Scenario: Server rejects with a different limit than the client mirrors

- **WHEN** the server rejects an upload because of its own size or format rule
- **THEN** the console SHALL show the server's message as given
- **AND** SHALL NOT replace it with a client-side limit that may be out of date

#### Scenario: Server message carries an error code prefix

- **WHEN** the server's message begins with an error code followed by a colon
- **THEN** the console SHALL show the human-readable remainder of that message

#### Scenario: Endpoint not deployed yet

- **WHEN** the paper upload endpoint answers as not found or not allowed
- **THEN** the console SHALL say the endpoint is not deployed yet, distinct from a rejection of the file

### Requirement: Archives are not watermarked and the dialog says so

The console SHALL NOT state or imply that an uploaded archive will be watermarked. Where the dialog
explains watermarking, it SHALL scope that statement to images and PDFs.

#### Scenario: Format guidance in the dialog

- **WHEN** an operator reads the format guidance in the paper dialog
- **THEN** it SHALL list every accepted format with that format's own size limit
- **AND** it SHALL say that watermarking applies to images and PDFs only
