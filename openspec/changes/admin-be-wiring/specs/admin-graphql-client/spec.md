## ADDED Requirements

### Requirement: GraphQL client targets the admin GraphQL endpoint
The GraphQL client SHALL send all read queries to `POST {VITE_API_BASE_URL}/api/v1/graphql`.

#### Scenario: Authenticated request
- **WHEN** the client sends a query
- **THEN** the request includes `Content-Type: application/json` and an `Authorization: Bearer <accessToken>` header when a token exists

### Requirement: GraphQL client parses the standard response envelope
The GraphQL client SHALL parse the JSON response, return `data` on success, and throw a normalized error when `errors` is present.

#### Scenario: Successful query
- **WHEN** the server returns `{ data: { ... }, errors: undefined }`
- **THEN** the client resolves with the typed `data` object

#### Scenario: Access denied error
- **WHEN** the server returns errors containing code `ADMIN_ACCESS_DENIED`
- **THEN** the client throws `ForbiddenError` with message "Bạn không có quyền thực hiện thao tác này"

#### Scenario: Other GraphQL error
- **WHEN** the server returns errors without `ADMIN_ACCESS_DENIED`
- **THEN** the client throws `ApiError` with the first error message

### Requirement: GraphQL client reuses auth errors
The GraphQL client SHALL surface network failures as `NetworkError` and 5xx-style failures as `ApiError`.

#### Scenario: Network failure
- **WHEN** the fetch promise rejects
- **THEN** the client throws `NetworkError`
