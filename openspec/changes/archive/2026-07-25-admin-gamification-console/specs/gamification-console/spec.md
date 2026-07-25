# gamification-console

## ADDED Requirements

### Requirement: Gamification navigation group gated by permission
The admin app SHALL register four routes — `/gamification/quests`, `/gamification/xp-rules`, `/gamification/reward-pools`, `/gamification/seasons` — in the route registry under a `"Gamification"` nav group, each requiring permission `gamification.admin.manage`; admins lacking the permission SHALL see neither the nav entries nor the pages (403 via the existing PermissionRoute), with no role-string checks anywhere.

#### Scenario: Scoped admin cannot see the console
- **WHEN** an admin whose `me.permissions` lacks `gamification.admin.manage` opens the app
- **THEN** the Gamification nav group is hidden and direct navigation to `/gamification/quests` renders the 403 page

### Requirement: Quest management page
`QuestsPage` SHALL list every quest (including inactive) from `GET /api/v1/gamification/admin/quests` and let the admin: toggle `active` via an inline Switch (with a confirm modal when deactivating an active quest), edit `rewardCoin`, `targetCount` and `dailyLimit` inline (InputNumber cells posting the full record to `POST /api/v1/gamification/admin/quests`), and create/edit full quests through a form modal (code, title, description, trigger event type, conditionJson as validated JSON, sortOrder). A non-blocking warning SHALL be shown when `rewardCoin` is outside the 50–100 economy guideline, and backend `GAMIFICATION_INVALID_CONFIG` errors SHALL surface as notifications.

#### Scenario: Admin tunes a quest inline
- **WHEN** the admin changes `dailyLimit` of `COMMUNITY_COMMENT` from 2 to 3 in the table cell
- **THEN** the upsert POST is sent with the complete quest record and the table refetches showing 3

#### Scenario: Deactivation requires confirmation
- **WHEN** the admin switches an active quest off
- **THEN** a confirm modal explains learners stop earning coins from it, and the POST is only sent after confirmation

#### Scenario: Invalid config surfaces backend message
- **WHEN** the admin submits a quest with `rewardCoin = 0` or trigger `gamification.quest.completed`
- **THEN** the backend rejection is shown as an error notification and the table state is unchanged

### Requirement: XP rules page
`XpRulesPage` SHALL list all XP rules from `GET /api/v1/gamification/admin/xp-rules` (ruleKey, amount, dailyCap, reputationAmount, active) and support create/update via `POST /api/v1/gamification/admin/xp-rules` through a form modal plus an inline active Switch; there SHALL be no delete action (rules are retired via `active = false`).

#### Scenario: Admin adjusts a community rule
- **WHEN** the admin edits `community.comment.created` to amount 5 / dailyCap 20
- **THEN** the upsert succeeds and the refreshed table shows the new values

### Requirement: Reward pools page
`RewardPoolsPage` SHALL list reward pools, upsert pools, manage each pool's items (list, add, delete-with-confirm) against the `/api/v1/gamification/admin/reward-pools` endpoints, and expose a probability-check action calling the validate endpoint and reporting whether item probabilities sum to 1.0.

#### Scenario: Probability check fails visibly
- **WHEN** the admin adds an item making the pool total 1.2 and the backend rejects it
- **THEN** the error notification shows the probability message and the item list refetches unchanged

### Requirement: Seasons page (minimal)
`SeasonsPage` SHALL list seasons (code, start/end, status tag), create a season via code + date range, and offer a "Close season" action (hidden for CLOSED seasons) that confirms before calling `POST /api/v1/gamification/admin/seasons/{id}/close`, explaining the PENDING_CLOSE → snapshot → CLOSED lifecycle.

#### Scenario: Empty environment still works
- **WHEN** no season exists yet
- **THEN** the page renders an empty state and the admin can create the first season from the modal

### Requirement: Seed data
The console SHALL be testable end-to-end on an environment migrated with the backend seeds: quests and corrected xp_rules from `gamification-quest-coin-engine` (V213) populate QuestsPage/XpRulesPage, the V66 `DAILY_BOX` pool populates RewardPoolsPage with a passing probability check; the console itself SHALL ship no mock data — an unreachable backend renders query error states.

#### Scenario: Fresh deploy shows seeded config
- **WHEN** an ADMIN logs into a freshly migrated environment
- **THEN** QuestsPage lists the 6 seeded quests and RewardPoolsPage validates `DAILY_BOX` at probability 1.0
