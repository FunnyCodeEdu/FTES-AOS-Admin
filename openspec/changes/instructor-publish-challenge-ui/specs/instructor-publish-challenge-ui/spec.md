## ADDED Requirements

### Requirement: Instructor renames own course via owner-authorized endpoint

The instructor course editor SHALL send course title/description updates through the owner-authorized
course endpoint (core PATCH /courses/{id}) so an owning lecturer can rename their course without a global
admin permission. subjectId changes (admin-only) continue via the admin endpoint.

#### Scenario: Owning lecturer edits title

- **WHEN** an owning lecturer saves a new title/summary for their course
- **THEN** the update is sent to the course module endpoint and succeeds

### Requirement: Instructor console shows Publish and challenge-bank tabs

The instructor MyCourseDetail workspace SHALL show the Publish tab (gated by course.publish@COURSE) and
the challenge-bank tab (gated by canManage), and the overview tab SHALL be editable, since the backend now
authorizes these by ownership.

#### Scenario: Owning lecturer opens course detail

- **WHEN** an owning lecturer with course.publish@COURSE opens their course
- **THEN** the Publish and Kho-thử-thách tabs are shown and the overview is editable
