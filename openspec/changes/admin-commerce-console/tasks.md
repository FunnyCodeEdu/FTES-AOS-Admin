# Tasks — admin-commerce-console

## 1. Khung feature & routing
- [ ] 1.1 Tạo `src/features/commerce/` với sub-module orders/payments/refunds/wallets/
      catalog/dashboard.
- [ ] 1.2 Khai báo route `/commerce/*` theo bảng design.md, guard theo permission leaf.
- [ ] 1.3 Nav group "Thương mại" gate `commerce.view`; mục con Reconciliation gate
      `commerce.reconcile`, Ví gate `wallet.view`.
- [ ] 1.4 Util format tiền VND + input mask dùng chung.

## 2. Orders (order-management)
- [ ] 2.1 API layer + query keys orders theo design.md.
- [ ] 2.2 `OrderListPage`: server-side filter status/ngày/khoảng tiền + search, đọc
      `?userId=` từ users console, filter đồng bộ URL.
- [ ] 2.3 `OrderDetailPage`: items + payment timeline component.
- [ ] 2.4 Panel xử lý treo gate `commerce.order.manage`: recheck payment, complete
      (lý do + confirm), cancel (lý do + confirm), xử lý 409 refetch.

## 3. Payments & đối soát (payment-reconciliation)
- [ ] 3.1 API layer payments/reconciliation/revenue.
- [ ] 3.2 `PaymentListPage`: bảng webhook + matchStatus, filter ngày/trạng thái.
- [ ] 3.3 `ReconciliationPage` gate `commerce.reconcile`: chọn khoảng ngày, summary
      khớp/lệch/thiếu, bảng dòng lệch, resolve match/ignore/flag (note bắt buộc).
- [ ] 3.4 Widget doanh thu trên `/commerce`: hôm nay/7d/30d + breakdown loại sản phẩm.

## 4. Refunds (refund-management)
- [ ] 4.1 API layer refunds.
- [ ] 4.2 Nút "Tạo yêu cầu refund" trên order detail gate `commerce.refund.request`:
      amount ≤ đã trả (validate FE+BE), lý do bắt buộc.
- [ ] 4.3 `RefundListPage` + `RefundDetailPage` với timeline các bước + người thực hiện.
- [ ] 4.4 Duyệt/Từ chối gate `commerce.refund.approve`, disable + tooltip khi approver
      là người tạo, xử lý 409 4-eyes.
- [ ] 4.5 Thực thi gate `commerce.refund.execute`: confirm số tiền + kênh hoàn, trạng
      thái execution_failed cho retry.

## 5. Wallets (wallet-management)
- [ ] 5.1 API layer wallets/adjustments + config ngưỡng dual approval.
- [ ] 5.2 `WalletLookupPage` search user → `WalletDetailPage` số dư + ledger server-side
      (filter type/ngày).
- [ ] 5.3 Modal adjust gate `wallet.adjust`: amount ±, lý do bắt buộc, cảnh báo vượt
      ngưỡng theo config, hiển thị kết quả applied/pending_approval từ BE.
- [ ] 5.4 Tab "Adjust chờ duyệt" gate `wallet.adjust_approve`: duyệt/từ chối (lý do),
      chặn tự duyệt (disable + 409).

## 6. Coupons & Marketplace (commerce-catalog)
- [ ] 6.1 API layer coupons/products/fulfillments.
- [ ] 6.2 `CouponListPage`: bảng server-side + modal CRUD gate `commerce.coupon.manage`,
      disable coupon có lý do + confirm, panel usage stats per coupon.
- [ ] 6.3 `ProductListPage` + `ProductFormDrawer`: CRUD theo type (merchandise/premium/
      AI credits/voucher/course unlock) gate `commerce.product.manage`, form schema con
      theo type.
- [ ] 6.4 Fulfillment queue: bảng đơn vật lý, cập nhật status + tracking code có confirm.

## 7. Verify
- [ ] 7.1 `openspec validate admin-commerce-console` pass.
- [ ] 7.2 npm run build xanh + tsc --noEmit sạch.
- [ ] 7.3 Test tay ma trận quyền: thiếu từng leaf → nút/nav/route ẩn hoặc 403; kịch bản
      4-eyes (tự duyệt refund/adjust bị chặn) đúng design.md.
