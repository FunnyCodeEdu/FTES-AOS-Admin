# resource-management

## ADDED Requirements

### Requirement: FE resources upload as an image album

The system SHALL treat a resource of type `FE` as an **album of images**: when an editor picks a
folder for an `FE` resource, the system SHALL upload each picked image individually to
`POST /api/v1/resources/{id}/images` (multipart field `file`) instead of packaging the folder into a
single archive uploaded as a resource version. The system SHALL keep the folder-picking interaction,
SHALL restrict the upload set to the image MIME types the backend accepts for `FE`
(`image/png`, `image/jpeg`, `image/webp`), and SHALL send images in **natural (human) filename
order** so that `de1`, `de2`, `de10` are uploaded in that order — the upload order being the album
page order the backend stamps as `sortOrder`.

#### Scenario: Editor creates an FE resource from a folder of images

- **WHEN** an editor picks a folder containing `de1.png`, `de2.png`, `de10.png` for a new `FE` resource and submits
- **THEN** the system creates the resource first, then uploads the three images one request each to the album endpoint
- **AND** uploads them in the order `de1.png`, `de2.png`, `de10.png`
- **AND** no archive is produced and no resource version is created for the folder

#### Scenario: Album order follows natural filename order, not lexicographic order

- **WHEN** the picked folder contains files whose names differ only by an embedded number
- **THEN** the system orders them numerically (`2` before `10`) before uploading

#### Scenario: FE resource submit/approval behaviour is untouched

- **WHEN** the album upload finishes
- **THEN** the system performs exactly the submit/approval steps it performed before this change, with no additional or removed approval call

### Requirement: Album cap and skipped files are reported, never silent

The system SHALL treat the backend album cap as authoritative (`FeAlbumView.maxImages`, currently 50)
and SHALL count images already present in the album when editing. When the picked folder contains
more images than the remaining capacity, the system SHALL keep the first images in natural order up
to that capacity and SHALL state how many were left out. The system SHALL also report every file it
does not upload, grouped by reason (not an accepted image type, larger than the backend's per-image
limit, zero bytes), with a count per reason. The system SHALL NOT drop any picked file silently.

#### Scenario: Folder holds more images than the album can take

- **WHEN** an editor picks 63 images for an empty album whose cap is 50
- **THEN** the system plans to upload the first 50 in natural order
- **AND** tells the editor that 13 images were left out

#### Scenario: Album already partly filled

- **WHEN** an editor adds images to an `FE` resource whose album already holds 30 of 50 images
- **THEN** the system plans at most 20 images and reports any excess as left out

#### Scenario: Folder holds non-image and oversized files

- **WHEN** the picked folder contains PDFs, a 12MB photo, and a zero-byte file alongside valid images
- **THEN** the system uploads only the valid images
- **AND** reports the skipped files by count and reason before the upload starts

### Requirement: Album upload paces itself under the server rate limits

The system SHALL upload album images **sequentially** at a pace that stays within the backend rate
limits for FE image upload (10 per minute and 60 per hour per user), SHALL show live progress naming
the current image and position (for example "đang tải ảnh 12/50…"), and SHALL let the editor cancel
the run at any point. On a `429 RESOURCE_RATE_LIMITED` response the system SHALL back off and retry
**the same image** a bounded number of times rather than aborting the whole run.

#### Scenario: Fifty images upload without tripping the per-minute limit

- **WHEN** the editor uploads a 50-image album
- **THEN** the system spaces requests so that no rolling one-minute period contains more than 10 upload requests
- **AND** the editor sees the current position and an estimate of how long the run takes

#### Scenario: Server answers 429 mid-run

- **WHEN** an image upload returns `429 RESOURCE_RATE_LIMITED`
- **THEN** the system waits with increasing backoff and retries the same image
- **AND** the progress line states that the server throttled the run and which retry attempt is in flight
- **AND** the remaining images are still uploaded after a successful retry

#### Scenario: Editor cancels mid-run

- **WHEN** the editor cancels while images are still uploading
- **THEN** the system stops before the next request, keeps the dialog open, and reports how many images were uploaded

### Requirement: Interrupted album uploads report progress and can be resumed

The system SHALL report **how many images actually reached the server** out of how many were planned
whenever an album run stops early — cancelled, rate-limited past the retry budget, or failed. It
SHALL NOT create a duplicate resource when the editor submits again, and SHALL resume from the first
image that has not been uploaded, reconciling its cursor against the server's album
(`GET /api/v1/resources/{id}/images`) so an already-stored image is not uploaded twice.

#### Scenario: Run gives up after exhausting retries

- **WHEN** the retry budget for a throttled image is exhausted
- **THEN** the system stops the run and reports the number of images uploaded out of the planned total
- **AND** explains that the editor can submit again to continue

#### Scenario: Editor resumes an interrupted run

- **WHEN** the editor submits again after an interrupted run
- **THEN** the system reuses the already-created resource instead of creating another one
- **AND** reads the album from the server to determine where to continue
- **AND** uploads only the images that are still missing

### Requirement: Album write permission comes from the server, never guessed on the client

The system SHALL NOT compute client-side whether the current user may write to an FE album. When
editing an existing `FE` resource the system SHALL gate the folder picker on the server-provided
`FeAlbumView.canManage` flag, and SHALL surface a backend `403` during upload as a clear localized
message naming who may add images (the resource owner or a subject curator). The permission gates
guarding the entry points to the resource form (`resource.upload` on the list, `admin.resource.manage`
on the detail page) SHALL remain unchanged.

#### Scenario: Editor without album write rights opens an FE resource

- **WHEN** the server reports `canManage: false` for the album
- **THEN** the folder picker is not rendered and the dialog explains that only the owner or a subject curator can add images

#### Scenario: Server rejects an image with 403

- **WHEN** an image upload returns `403`
- **THEN** the run stops and the dialog shows a localized message explaining the missing right, together with how many images were uploaded

#### Scenario: Backend error codes are localized

- **WHEN** the backend returns `RESOURCE_RATE_LIMITED`, `RESOURCE_VALIDATION`, `RESOURCE_FILE_TOO_LARGE`, or `RESOURCE_ACCESS_DENIED`
- **THEN** the dialog shows the Vietnamese message for that code rather than the raw backend code, including when the code is carried as a prefix of the envelope message
