# banner-slider-admin

## ADDED Requirements

### Requirement: Banner form edits slider presentation fields
The admin banner form SHALL let an editor set `subtitle`, `ctaText`, and `theme` alongside
the existing title/image/link/placement/schedule fields, and SHALL send them to the banner
create/update endpoints.

#### Scenario: Save a rich banner
- **WHEN** an editor fills subtitle, cta text, and a gradient theme and saves
- **THEN** the create/update request body carries `subtitle`, `ctaText`, `theme`
- **AND** the saved banner reflects them on refresh

### Requirement: Theme preview
The admin banner form SHALL show a live preview of the `theme` value as a background so the
editor can verify the gradient before saving.

#### Scenario: Preview updates with theme input
- **WHEN** an editor types a CSS gradient into the theme field
- **THEN** a preview swatch renders that background immediately

### Requirement: Editing gated by permission
The banner management actions SHALL be available only to users holding `admin.banner.manage`.

#### Scenario: Menu and actions hidden without permission
- **WHEN** a signed-in admin lacks `admin.banner.manage`
- **THEN** the banner create/edit/delete actions are not available to them
