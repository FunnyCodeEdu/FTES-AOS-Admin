# admin-commerce-console — Console quản trị thương mại

## Why

Mảng `admin-commerce` (theo `docs/ADMIN-ARCHITECTURE.md`) quản toàn bộ dòng tiền:
order, payment VietQR, ví, refund, coupon và marketplace. Admin cũ xử lý order treo
bằng tay qua DB, không có đối soát webhook, refund không có quy trình duyệt, adjust ví
không ai kiểm soát. Console mới tại `/commerce/*` phải: tra cứu và xử lý order theo
timeline payment, đối soát webhook VietQR có báo cáo lệch, refund theo quy trình
yêu cầu → duyệt → thực thi có audit, adjust ví bắt buộc lý do + duyệt 2 người khi vượt
ngưỡng, quản coupon với usage stats, quản sản phẩm marketplace (merchandise/premium/
AI credits/voucher/course unlock) kèm fulfillment, và widget doanh thu cho admin mảng.

## What Changes

- Thêm route nhóm `/commerce/*`: Orders, Payments/Reconciliation, Refunds, Wallets,
  Coupons, Marketplace — nav gate theo permission leaf `commerce.*` / `wallet.*`.
- Orders: list server-side filter status/khoảng ngày/khoảng tiền, order detail +
  timeline payment event, hành động xử lý order treo (re-check payment, đánh dấu
  hoàn tất/huỷ có lý do).
- Payments: bảng webhook VietQR nhận được, đối soát payment ↔ order, reconciliation
  report theo ngày (khớp/lệch/thiếu), resolve từng dòng lệch.
- Refund flow: tạo yêu cầu refund từ order → duyệt/từ chối bởi người có quyền duyệt
  (khác người tạo) → thực thi → mọi bước audit.
- Wallet: tra cứu ví theo user, transaction ledger server-side, adjust số dư bắt buộc
  lý do; vượt ngưỡng cấu hình → cần người duyệt thứ hai trước khi hiệu lực.
- Coupons: CRUD + usage stats (lượt dùng, doanh thu ảnh hưởng), vô hiệu hoá có confirm.
- Marketplace: CRUD product các loại merchandise/premium/AI credits/voucher/course
  unlock + theo dõi fulfillment status đơn vật lý.
- Widget doanh thu (hôm nay/7 ngày/30 ngày, theo loại sản phẩm) trên landing
  `/commerce` cho admin mảng.
- Feature folder mới `src/features/commerce/`.

## Capabilities

### New Capabilities

- `order-management`: danh sách/chi tiết order, timeline payment, xử lý order treo.
- `payment-reconciliation`: đối soát webhook VietQR, reconciliation report, resolve lệch, widget doanh thu.
- `refund-management`: quy trình refund yêu cầu → duyệt (4-eyes) → thực thi → audit.
- `wallet-management`: tra cứu ví, transaction ledger, adjust có lý do + duyệt 2 người vượt ngưỡng.
- `commerce-catalog`: coupon CRUD + usage stats; marketplace product CRUD + fulfillment status.

### Modified Capabilities

- Không sửa capability nào hiện có (console mới hoàn toàn).

## Impact

- Route mới: `/commerce` (landing + widget doanh thu), `/commerce/orders`,
  `/commerce/orders/:id`, `/commerce/payments`, `/commerce/payments/reconciliation`,
  `/commerce/refunds`, `/commerce/refunds/:id`, `/commerce/wallets`,
  `/commerce/wallets/:userId`, `/commerce/coupons`, `/commerce/marketplace`.
- Feature folder: `src/features/commerce/` (orders/payments/refunds/wallets/catalog).
- API BE tiêu thụ: `/api/v1/admin/orders*`, `/payments*`, `/refunds*`, `/wallets*`,
  `/coupons*`, `/marketplace/products*`, `/revenue/summary` — đánh dấu assumption
  trong design.md.
- Permission gates: `commerce.view`, `commerce.order.manage`, `commerce.reconcile`,
  `commerce.refund.request/approve/execute`, `wallet.view`, `wallet.adjust`,
  `wallet.adjust_approve`, `commerce.coupon.manage`, `commerce.product.manage`.
