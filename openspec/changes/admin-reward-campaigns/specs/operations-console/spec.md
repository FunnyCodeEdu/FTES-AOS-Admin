# operations-console (delta)

## ADDED Requirements

### Requirement: Admin manages reward campaigns

The admin console SHALL provide a page (guarded by `campaign.manage`) to create, edit and delete
reward campaigns, showing each campaign's coin amount, active window, claim count and status.

#### Scenario: Create a campaign

- **WHEN** an admin fills in code, title, coin amount and sets status to active
- **THEN** the campaign is created and appears in the list with 0 claims
