## Why

Commerce admin FE phần lớn mock hoặc trỏ path admin không tồn tại. BE ĐÃ CÓ endpoint ở prefix khác (commerce/wallet) + có endpoint đọc mới → repoint/wire thật.

## What Changes
- Repoint (coreClient): refunds → `/commerce/admin/refund-requests`; reconciliation → `/commerce/admin/reconciliation/runs`; wallet detail → `/wallet/admin/wallets/{userId}`; ledger → `/wallet/admin/transactions`; adjustment → `/wallet/admin/adjustments`.
- Wire read mới: payments/coupons(+stats)/fulfillments/revenue → `/commerce/admin/*`.
- Giữ mock (BE không có): wallet dual-approval queue, reconciliation resolve, refund create/detail/execute, commerce config → TODO.

## Capabilities
### New Capabilities
- `commerce-console`: Trang commerce đọc data thật từ BE (refunds/reconciliation/wallet/payments/coupons/fulfillments/revenue).

## Impact
- FE `src/features/commerce/**` (refunds/wallets/payments/catalog api). Không đụng folder khác.
