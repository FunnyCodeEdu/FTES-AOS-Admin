# admin-shortvideo-studio

## ADDED Requirements

### Requirement: The short-video studio is a permission-gated admin screen
The admin application SHALL expose a short-video studio screen under the content area, registered in
the route registry with a navigation entry in the content group and gated on the short-video
management permission, so that operators without that permission never see the entry and never
reach the page.

#### Scenario: Operator holds the permission
- **WHEN** an operator holding the short-video management permission opens the admin navigation
- **THEN** the studio entry SHALL be listed in the content group
- **AND** the route SHALL render the studio screen

#### Scenario: Operator lacks the permission
- **WHEN** an operator without that permission requests the studio route
- **THEN** the navigation SHALL omit the entry
- **AND** the route SHALL be refused by the permission gate

### Requirement: Clip creation starts from a course and a lesson that has video
The creation view SHALL let the operator pick a course and then a lesson, offering only lessons
whose type is video, because only those carry the transcript the suggestion step reads. The video
identifier SHALL be derived from the lesson's playback manifest rather than typed by hand.

#### Scenario: Course has no video lesson
- **WHEN** the selected course contains no lesson of video type
- **THEN** the view SHALL say so plainly instead of offering an empty picker

#### Scenario: Lesson embeds an external video
- **WHEN** the selected lesson plays from an external provider rather than the self-hosted service
- **THEN** the view SHALL explain that clipping needs the video hosted by the platform
- **AND** the suggestion action SHALL be unavailable

### Requirement: Highlight suggestions are listed with title, reason and timecodes
Asking for highlights SHALL present each returned suggestion with its title, the reason it was
chosen, its in and out points expressed as minutes and seconds, and the resulting length. While the
request is running the view SHALL show a waiting state, and a failed or empty result SHALL be stated
rather than left as a blank list.

#### Scenario: Suggestions come back
- **WHEN** the suggestion request succeeds with several segments
- **THEN** each segment SHALL be listed with its title, reason, in point, out point and length

#### Scenario: The video has no transcript
- **WHEN** the backend refuses because the video carries no transcript
- **THEN** the view SHALL show a readable explanation instead of a raw error code

### Requirement: In and out points are editable before cutting
Every suggestion SHALL allow the operator to change its title and its in and out points before the
cut is requested, because timings derived from a transcript routinely start mid-sentence. The values
submitted SHALL be the edited ones.

#### Scenario: Operator nudges the in point
- **WHEN** the operator edits a suggestion's in point and requests the cut
- **THEN** the edited in point SHALL be the one sent

### Requirement: Impossible cut ranges are refused in the browser
The client SHALL refuse a cut request whose range is impossible before any call leaves the browser:
a negative or unreadable timecode, an out point at or before the in point, a range shorter than one
second, a range longer than the platform's three-minute ceiling, and — when the video's length is
known — an out point past the end of the video. The reason SHALL be shown next to the fields, and
the cut action SHALL stay disabled while the range is invalid. When the video length is unknown, no
length-based limit SHALL be invented.

#### Scenario: Out point is not after the in point
- **WHEN** the out point equals or precedes the in point
- **THEN** the cut action SHALL be disabled
- **AND** the reason SHALL be shown

#### Scenario: Range exceeds the ceiling
- **WHEN** the range is longer than the three-minute ceiling
- **THEN** the cut action SHALL be disabled with a message naming the ceiling

#### Scenario: Range sits exactly at the ceiling
- **WHEN** the range is exactly three minutes
- **THEN** the range SHALL be accepted

#### Scenario: Video length is unknown
- **WHEN** the length of the source video is not known to the client
- **THEN** an otherwise valid range SHALL NOT be refused for exceeding the video

### Requirement: Timecodes are displayed as minutes and seconds
Every timecode and duration on this screen SHALL be shown as minutes and seconds, with the minute
field continuing past sixty rather than wrapping, so that a mark inside a long lecture is not read
as a mark near its beginning. A missing value SHALL render as a neutral placeholder, not as zero.

#### Scenario: Mark past the first hour
- **WHEN** a mark sits more than an hour into the recording
- **THEN** the minute field SHALL keep counting rather than restart

#### Scenario: Duration not yet known
- **WHEN** a clip has no duration yet because it is still being cut
- **THEN** the duration SHALL render as a placeholder rather than a zero length

### Requirement: The studio lists cut clips with their state
The studio view SHALL list clips newest first with title, owning course and lesson, length, state
and creation time, filterable by state and by course, and SHALL keep refreshing on its own only
while some clip is still queued or being rendered.

#### Scenario: A clip is still rendering
- **WHEN** the list contains a clip that is queued or rendering
- **THEN** the view SHALL refresh periodically until no clip is in those states

#### Scenario: No clip has ever been cut
- **WHEN** the list is empty
- **THEN** the view SHALL say so and point at the creation view

### Requirement: Clips can be downloaded, published to the community feed, and withdrawn
Each ready clip SHALL offer a download, and a publish action that places it on the community news
rail. A published clip SHALL instead offer a withdraw action, and its published state SHALL be
visible in the list. Publishing SHALL be unavailable for a clip that is not ready, so that a broken
link never reaches learners.

#### Scenario: Clip is not ready
- **WHEN** a clip is queued, rendering or failed
- **THEN** the publish action SHALL be unavailable

#### Scenario: Clip is already published
- **WHEN** a clip already sits on the news rail
- **THEN** the action SHALL read as a withdrawal
- **AND** the list SHALL mark the clip as published

### Requirement: Deleting a clip is confirmed with a recorded reason
Deleting a clip SHALL go through the shared destructive-action confirmation that requires a reason
for the audit log, and the confirmation SHALL warn that deleting a published clip also removes it
from the community feed.

#### Scenario: Operator deletes a published clip
- **WHEN** the operator deletes a clip that is on the news rail
- **THEN** the confirmation SHALL require a reason
- **AND** the confirmation SHALL state that the news item will be removed too

### Requirement: Clip details are reachable from every viewport and reflect the current state
The studio SHALL offer an explicit control that opens a clip's details on every viewport, not only
the row click that exists on wide screens, because the card layout used on narrow viewports has no
row to click. The details view SHALL read the clip by its identifier rather than reuse the row
captured at the moment it was opened, so that a clip which finishes rendering, is published or is
withdrawn while the view stays open shows its present state.

#### Scenario: Details opened on a phone
- **WHEN** the studio list is shown as cards on a narrow viewport
- **THEN** each card SHALL carry an explicit control that opens that clip's details
- **AND** the failure reason of a failed clip SHALL be reachable through it

#### Scenario: Details opened on a wide screen
- **WHEN** the studio list is shown as a table on a wide viewport
- **THEN** each row SHALL carry an explicit control that opens that clip's details
- **AND** a row that also responds to being clicked SHALL indicate that it does

#### Scenario: Clip changes while its details are open
- **WHEN** a clip finishes rendering while its details are open
- **THEN** the details SHALL show the new state without being closed and reopened

### Requirement: Closing the details stops the preview
The details view SHALL discard its contents when it is closed, so that a preview the operator
started playing does not keep playing once the view is gone and out of reach of its own controls.

#### Scenario: Preview left playing when the details are closed
- **WHEN** the operator plays a clip preview and then closes the details view
- **THEN** the preview SHALL stop
- **AND** the media element SHALL NOT remain in the page

### Requirement: A suggestion already sent for cutting is not sent twice
Once a cut has been accepted for a suggestion, the creation view SHALL mark that suggestion as sent
and refuse to send the identical request again, because the cut it produced appears in the studio
view rather than on the suggestion itself and a transient confirmation is not enough to tell the
operator that the click registered. Changing the suggestion's marks or its title SHALL make it
sendable again, since that describes a different clip.

#### Scenario: Operator clicks cut twice on one suggestion
- **WHEN** the operator requests a cut and then clicks the same unchanged suggestion again
- **THEN** the second click SHALL NOT issue another cut request
- **AND** the suggestion SHALL state that it has already been sent

#### Scenario: Operator adjusts the marks and cuts again
- **WHEN** the operator changes a sent suggestion's in point, out point or title
- **THEN** the cut action SHALL become available again

### Requirement: Background refreshes do not blank the list
The studio SHALL keep the clips already listed on screen while it refreshes itself because a clip
is still queued or rendering. Only the first load SHALL be presented as a loading state, and a
refresh in flight SHALL be reported on the refresh control instead.

#### Scenario: Periodic refresh with clips already listed
- **WHEN** a periodic refresh runs while clips are already listed
- **THEN** the listed clips SHALL remain visible
- **AND** no placeholder SHALL replace them

### Requirement: Row-level actions report progress on their own row
An action taken on one clip SHALL report its progress only on that clip's control, so that a publish
or a cut in flight does not make every other row appear to be acting.

#### Scenario: Publishing one clip among several
- **WHEN** the operator publishes one clip while several are listed
- **THEN** only that clip's control SHALL show progress

### Requirement: The screen is usable on a phone
On a narrow viewport the screen SHALL present clips as stacked cards rather than a wide table, give
the primary action full width, keep any remaining tabular content scrollable horizontally within its
own frame, and open clip details in a drawer.

#### Scenario: Studio opened on a phone
- **WHEN** the studio list is opened on a narrow viewport
- **THEN** each clip SHALL be shown as a card with its primary action full width
- **AND** the page body SHALL NOT scroll horizontally
