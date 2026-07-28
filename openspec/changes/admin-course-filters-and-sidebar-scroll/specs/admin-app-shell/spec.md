# admin-app-shell (delta)

## ADDED Requirements

### Requirement: Scrollable left navigation

The fixed left navigation sidebar SHALL keep its brand header pinned and let the navigation menu scroll
independently when the menu is taller than the viewport, so every navigation item stays reachable
regardless of how many items the current admin's permissions expose. The scroll region SHALL reserve
space for the collapse trigger bar so the last item is never hidden behind it.

#### Scenario: Long menu scrolls

- **WHEN** the permission-filtered navigation has more items than fit the viewport height
- **THEN** the menu area scrolls vertically and the bottom items are reachable

#### Scenario: Brand header stays fixed

- **WHEN** the admin scrolls the navigation menu
- **THEN** the brand header at the top of the sidebar remains visible
