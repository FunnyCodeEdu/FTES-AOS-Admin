# admin-api-client

## ADDED Requirements

### Requirement: Envelope handling
The API client SHALL unwrap the backend envelope `{code, message, data|null}`, resolving with `data` on success and rejecting with a typed `ApiError{code, message}` when `code` indicates failure even on HTTP 200.

#### Scenario: Successful response
- **WHEN** the backend responds HTTP 200 with a success code
- **THEN** the caller receives `data` directly

#### Scenario: Business error with HTTP 200
- **WHEN** the backend responds HTTP 200 with a non-success `code`
- **THEN** the promise rejects with `ApiError` carrying the backend `code` and `message`

### Requirement: Bearer token attachment
The API client SHALL attach the current access token as a Bearer header to every request to `/api/v1/admin/...` except the public auth endpoints.

#### Scenario: Authenticated request
- **WHEN** any protected endpoint is called while a session exists
- **THEN** the request carries `Authorization: Bearer <accessToken>`

### Requirement: Single-flight refresh on 401
The API client SHALL respond to a 401 by performing at most one concurrent token refresh, queueing all other failed requests and replaying them after the refresh succeeds.

#### Scenario: Multiple parallel requests hit 401
- **WHEN** several requests fail with 401 at the same time
- **THEN** exactly one refresh call is made
- **AND** all queued requests are replayed with the new token after it succeeds

#### Scenario: Refresh fails
- **WHEN** the refresh call fails
- **THEN** all queued requests reject, the session is cleared, and the user is redirected to `/login`

### Requirement: 403 handling with missing permission info
The API client SHALL NOT retry 403 responses and SHALL expose the missing permission information from the response so callers can render a permission-aware error.

#### Scenario: Action forbidden for current user
- **WHEN** a mutation returns 403 with missing permission details
- **THEN** the client rejects with a `ForbiddenError` carrying `missingPermissions`
- **AND** no token refresh or retry is attempted

#### Scenario: CTV calls an endpoint outside their scope
- **WHEN** a request for a resource outside the CTV's scoped grants returns 403
- **THEN** the UI surfaces a "outside your assigned scope" error derived from `ForbiddenError`
- **AND** the request is not retried

### Requirement: Network and server error normalization
The API client SHALL normalize network failures and 5xx responses into a consistent error shape with a user-presentable message.

#### Scenario: Backend unreachable
- **WHEN** a request fails at the network level
- **THEN** the caller receives a normalized error flagged retryable
- **AND** list screens render their error state with a retry action instead of a blank page
