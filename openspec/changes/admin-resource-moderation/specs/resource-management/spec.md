# resource-management

## MODIFIED Requirements

### Requirement: Approval queue restricted to resource.approve
The system SHALL keep the existing review queue at `/academic/resources/review` — route, `resource.approve` gate and left-navigation entry ("Duyệt học liệu") all unchanged — where callers approve or reject pending resources; rejection requires a written reason.

The centralized queue added at `/academic/moderation` SHALL be an ADDITIONAL, distinctly-labelled nav entry ("Duyệt đề thi & học liệu"), not a replacement. The two read different sources and are therefore not duplicates: the existing screen reads the admin-global GraphQL `adminResources` list, whereas the centralized queue reads `GET /api/v1/resources/moderation/pending`, which the backend has already scoped by `approvableSubjectIds()` and which alone can preview FE albums. Consolidating them is a product decision to be taken deliberately, NOT a side effect of adding the new screen.

#### Scenario: Moderator approves a pending resource
- **WHEN** a caller holding `resource.approve` previews a pending resource and confirms approval
- **THEN** the system calls the approve endpoint and removes the item from the queue
- **AND** the decision is recorded in the audit log by the backend

#### Scenario: Moderator rejects with a reason
- **WHEN** the caller rejects a pending resource
- **THEN** the system requires a written reason before submission
- **AND** the reason becomes visible to the submitter on the resource detail

#### Scenario: CTV cannot access the review queue
- **WHEN** a CTV (who never holds `resource.approve`) navigates to `/academic/resources/review` by URL
- **THEN** the system renders the Forbidden page
- **AND** no approve or reject control is rendered anywhere for the CTV

#### Scenario: Both approval entries remain available and distinguishable
- **WHEN** a caller holding `resource.approve` opens the admin left navigation
- **THEN** the "Học thuật" group offers BOTH "Duyệt học liệu" (`/academic/resources/review`) and "Duyệt đề thi & học liệu" (`/academic/moderation`)
- **AND** the labels differ so the caller can tell the admin-global list from the scope-aware queue that previews exam albums
