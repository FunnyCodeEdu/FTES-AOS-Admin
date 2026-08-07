# ai-assist-sse-client

## MODIFIED Requirements

### Requirement: SSE event block boundary

The streaming client SHALL treat a blank line as the boundary between two SSE events, accepting the
blank line written with either LF (`\n\n`) or CRLF (`\r\n\r\n`) newlines, and SHALL carry any partial
trailing bytes forward in its buffer until a further read completes the boundary.

The set of newline forms accepted at the block boundary SHALL match the set the per-line parser
handles, so that every block the splitter emits can be parsed line by line. The per-line parser
accepts `\n` with an optional preceding `\r`; a lone `\r` is therefore NOT a boundary.

#### Scenario: LF stream splits into events

- **WHEN** the server writes `event: delta\ndata:x\n\nevent: done\ndata:{}\n\n`
- **THEN** the client dispatches one `delta` event carrying `x` and one `done` event

#### Scenario: CRLF stream splits into the same events

- **WHEN** an intermediary rewrites the same stream with CRLF newlines
- **THEN** the client dispatches exactly the same events with the same data as the LF stream
- **AND** no event data contains a stray `\r`

#### Scenario: Boundary split across two reads

- **WHEN** one read ends midway through a boundary and the next read supplies the remainder
- **THEN** the client dispatches the completed event once the boundary is whole
- **AND** no event is dispatched twice

### Requirement: SSE wire fixtures are byte-stable

Test fixtures that stand in for bytes on the wire SHALL be checked out identically on every platform,
so that the same byte sequence is exercised on developer machines and in CI. Line-ending
normalization SHALL NOT be applied to them.

Tests that assert behaviour for a newline form other than the fixture's SHALL derive that variant
inside the test rather than relying on a second fixture file, so the assertion does not depend on the
running machine's version-control configuration.

#### Scenario: Fixture checked out on Windows matches CI

- **WHEN** the repository is checked out on a machine configured to convert newlines on checkout
- **THEN** the SSE fixture files still contain LF newlines
- **AND** the streaming tests produce the same result as on a Linux checkout
