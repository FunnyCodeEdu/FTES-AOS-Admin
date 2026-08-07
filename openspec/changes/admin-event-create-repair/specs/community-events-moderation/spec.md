# community-events-moderation

## REMOVED Requirements

### Requirement: Community events review list

**Reason**: `/community/events` never queried a community-events source. `useCommunityEvents` reads
the same GraphQL `adminEvents` as `/operations/events` — there is no `GET /api/v1/admin/community/events`
endpoint in the backend, and `event.events` has no `group_id` column, so "group-created community
events" is not a set that can be selected. The page also duplicated the "Events" nav label already
used by Operations.

**Migration**: Manage every official event at `/operations/events` (gate `event.manage` +
`admin.event.read`). Events scoped to a single group live in `community.group_events`, which has no
admin surface and is out of scope here.

### Requirement: Event detail before decision

**Reason**: The drawer's fields for group, organizer, and review history were hardcoded to empty
strings and an empty array in the read mapping (`community.api.ts`), because `adminEvents` returns
none of them and no review-history table exists. The drawer rendered "—" for every event.

**Migration**: Event detail — description, schedule, venue/online link, registrations, check-in,
recording, certificates — lives at `/operations/events/:eventId`.

### Requirement: Approve or reject with reason

**Reason**: The approve/reject buttons were gated on `community.moderate`, a permission string that
appears exactly once in the repository and belongs to no permission catalog, and were additionally
guarded by `record.status === "pending"` while the backend returns uppercase statuses
(`DRAFT`/`PENDING_APPROVAL`/`PUBLISHED`). Both gates fail, so the controls never rendered and the
review mutation had no reachable caller.

**Migration**: The backend endpoint `POST /api/v1/admin/events/{id}/review` remains and is
unchanged; it simply has no Admin caller after this change. Restoring an approval action is tracked
as a separate change (`admin-event-approve-action`) which adds it to `EventDetailPage` behind
`admin.event.manage`, next to the existing submit and cancel actions.

### Requirement: Events review UX states

**Reason**: The loading, empty, and error states belonged to the removed page.

**Migration**: Equivalent states are covered by the `operations-official-events` capability
("Events UX states").
