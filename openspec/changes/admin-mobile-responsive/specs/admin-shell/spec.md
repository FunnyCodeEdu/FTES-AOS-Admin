# admin-shell (delta)

## ADDED Requirements

### Requirement: Admin console is usable on a phone

On viewports narrower than the `md` breakpoint the admin console SHALL give the page full width
(navigation moves into a drawer opened from the header), tables SHALL scroll horizontally inside their
card instead of breaking the layout, and dialogs/drawers SHALL fit the viewport.

#### Scenario: Open navigation on a phone

- **WHEN** an admin taps the menu button on a narrow viewport
- **THEN** navigation opens in a drawer and closes after a destination is chosen

#### Scenario: Add students on a phone

- **WHEN** an admin opens the add-students dialog on a phone
- **THEN** the dialog fits the viewport and the username box is usable

#### Scenario: Read payroll on a phone

- **WHEN** an admin opens payroll on a phone
- **THEN** the table scrolls horizontally and the detail drawer covers the screen with one-column details
