## ADDED Requirements

### Requirement: Admin gates use backend catalog permission leaves

Every FE permission gate (route `requiredPermissions`, nav, and `Can`/`hasAnyPermission` action gates) SHALL reference a permission leaf that exists in the backend catalog. View/route gates SHALL use the admin read leaf (`admin.<domain>.read`); action gates SHALL use the leaf the corresponding backend API enforces.

#### Scenario: Admin opens a previously-blocked page

- **WHEN** an admin with `admin.<domain>.read` navigates to that domain's admin page
- **THEN** the route guard passes and the page renders (no /403)

#### Scenario: Action button visibility matches real permission

- **WHEN** a management action gates on the backend leaf it requires
- **THEN** the button shows only for users who actually hold that leaf (e.g. RBAC manage stays hidden for ADMIN, shown for SUPER_ADMIN)

### Requirement: Status/role badges never crash on unmapped values

Every `Record<Status|Role, {...}>` lookup in tables/badges SHALL fall back to a safe default when the backend returns a value not present in the map, rendering the raw value rather than throwing.

#### Scenario: Backend returns an unmapped status

- **WHEN** a list receives an item whose status/role is not a key in the label map (e.g. course status `INACTIVE`)
- **THEN** the row renders with a fallback label/colour instead of crashing the page
