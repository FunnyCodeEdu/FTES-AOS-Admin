# commerce-catalog

## ADDED Requirements

### Requirement: Server-side coupon list with usage stats
The system SHALL list coupons at `/commerce/coupons` with server-side pagination, search, and status filter, and SHALL show per-coupon usage statistics (uses, unique users, revenue impact, usage by day).

#### Scenario: Admin reviews a coupon's performance
- **WHEN** an admin holding `commerce.view` opens a coupon's stats panel
- **THEN** the system fetches and displays uses, unique users, revenue impact, and a usage-by-day series
- **AND** the list shows skeleton, empty, and error-with-retry states appropriately

### Requirement: Coupon CRUD gated by commerce.coupon.manage
The system SHALL allow creating and editing coupons (code, type percent or fixed, value, max uses, per-user limit, validity window, applicable targets) only for callers holding `commerce.coupon.manage`.

#### Scenario: Admin creates a coupon
- **WHEN** an admin holding `commerce.coupon.manage` submits a valid coupon form
- **THEN** the system persists the coupon and shows it in the list
- **AND** field-level validation errors from the backend (duplicate code, invalid window) are shown on the corresponding fields

#### Scenario: Admin disables a coupon
- **WHEN** the admin confirms the disable dialog with a mandatory reason
- **THEN** the system disables the coupon so it can no longer be redeemed
- **AND** the action is recorded in the audit log by the backend

#### Scenario: Caller lacks coupon management permission
- **WHEN** an admin holding `commerce.view` but not `commerce.coupon.manage` opens the coupon list
- **THEN** the list and stats remain visible and the create, edit, and disable controls SHALL NOT be rendered

### Requirement: Marketplace product list
The system SHALL list marketplace products at `/commerce/marketplace` with server-side pagination, search, and filters for product type (merchandise, premium, AI credits, voucher, course unlock) and status.

#### Scenario: Admin filters by product type
- **WHEN** an admin holding `commerce.view` filters by type and status
- **THEN** the system requests the list with those parameters and renders the returned page
- **AND** shows skeleton, empty, and error-with-retry states appropriately

### Requirement: Product CRUD per type
The system SHALL allow callers holding `commerce.product.manage` to create, edit, and delete products with a type-specific form schema for each product type.

#### Scenario: Admin creates an AI credits product
- **WHEN** an admin holding `commerce.product.manage` selects the AI credits type and submits the type-specific form
- **THEN** the system persists the product with its type-specific payload and shows it in the list

#### Scenario: Admin deletes a product
- **WHEN** the admin confirms the delete dialog stating the product becomes unavailable for purchase
- **THEN** the system deletes the product and the action is recorded in the audit log by the backend

#### Scenario: Caller lacks product management permission
- **WHEN** an admin lacking `commerce.product.manage` opens the marketplace list
- **THEN** the list is read-only and the create, edit, delete, and fulfillment controls SHALL NOT be rendered

### Requirement: Fulfillment tracking for physical goods
The system SHALL track fulfillment status (pending, packed, shipped, delivered) for physical merchandise orders and let callers holding `commerce.product.manage` update status with an optional tracking code.

#### Scenario: Admin marks an order shipped
- **WHEN** the admin updates a fulfillment row to shipped with a tracking code and confirms
- **THEN** the system persists the status and tracking code and the row reflects the new state
- **AND** the update is recorded in the audit log by the backend

#### Scenario: Invalid status transition
- **WHEN** the backend rejects a fulfillment status change as an invalid transition
- **THEN** the system shows the error on the row and keeps the previous status
