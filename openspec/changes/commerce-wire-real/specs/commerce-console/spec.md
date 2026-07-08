## ADDED Requirements

### Requirement: Commerce console reads real backend
Commerce admin pages SHALL read from the real backend endpoints (existing commerce/wallet paths + new admin reads) instead of mock.

#### Scenario: Refunds list
- **WHEN** an admin opens the refunds page
- **THEN** it loads from `/api/v1/commerce/admin/refund-requests`
