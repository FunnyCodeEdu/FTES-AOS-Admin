# Design — admin-commerce-console

## 1. Route & màn hình

| Route | Page component | Nội dung chính |
|---|---|---|
| `/commerce` | `CommerceLandingPage` | Widget doanh thu (hôm nay/7d/30d, breakdown theo loại), shortcut các khu |
| `/commerce/orders` | `OrderListPage` | Bảng order server-side: filter status/khoảng ngày/khoảng tiền, search mã order/email; hỗ trợ `?userId=` từ users console |
| `/commerce/orders/:id` | `OrderDetailPage` | Thông tin order + items + Timeline payment event + panel hành động xử lý treo |
| `/commerce/payments` | `PaymentListPage` | Bảng webhook VietQR nhận được: filter trạng thái khớp, khoảng ngày, search mã giao dịch |
| `/commerce/payments/reconciliation` | `ReconciliationPage` | Chọn ngày/khoảng ngày → report khớp/lệch/thiếu + resolve từng dòng |
| `/commerce/refunds` | `RefundListPage` | Bảng yêu cầu refund: filter trạng thái (requested/approved/rejected/executed), khoảng ngày |
| `/commerce/refunds/:id` | `RefundDetailPage` | Chi tiết yêu cầu + timeline các bước + nút duyệt/từ chối/thực thi theo quyền |
| `/commerce/wallets` | `WalletLookupPage` | Search user (tên/email) → mở ví |
| `/commerce/wallets/:userId` | `WalletDetailPage` | Số dư, transaction ledger server-side, nút Adjust, tab "Adjust chờ duyệt" |
| `/commerce/coupons` | `CouponListPage` (+ modal CRUD) | Bảng coupon server-side + usage stats per coupon |
| `/commerce/marketplace` | `ProductListPage` (+ `ProductFormDrawer`) | Bảng product filter theo type/status + fulfillment queue cho đơn vật lý |

Feature folder `src/features/commerce/` chia sub-module: `orders/`, `payments/`,
`refunds/`, `wallets/`, `catalog/` (coupons + marketplace), `dashboard/` (widget).

## 2. Permission gates

| Permission leaf | Gate | Khi thiếu |
|---|---|---|
| `commerce.view` | Nav group "Thương mại", `/commerce`, orders/payments list (read) | Ẩn nav; URL → 403 |
| `commerce.order.manage` | Hành động trên order treo (re-check, force complete, cancel) | Panel hành động ẩn, detail chỉ đọc |
| `commerce.reconcile` | Route reconciliation + nút resolve lệch | Ẩn mục nav con; URL → 403 |
| `commerce.refund.request` | Nút "Tạo yêu cầu refund" trên order detail | Nút ẩn |
| `commerce.refund.approve` | Nút Duyệt/Từ chối trên refund detail | Nút ẩn |
| `commerce.refund.execute` | Nút "Thực thi refund" (sau khi approved) | Nút ẩn |
| `wallet.view` | Nav "Ví", route wallets | Ẩn nav; URL → 403 |
| `wallet.adjust` | Nút "Điều chỉnh số dư" | Nút ẩn |
| `wallet.adjust_approve` | Tab "Adjust chờ duyệt" + nút duyệt adjust vượt ngưỡng | Tab ẩn |
| `commerce.coupon.manage` | Nút tạo/sửa/vô hiệu coupon (list xem theo `commerce.view`) | Nút ẩn |
| `commerce.product.manage` | CRUD product + cập nhật fulfillment | Nút ẩn, list chỉ đọc |

Ràng buộc 4-eyes (BE enforce, FE hiển thị):
- Refund: người duyệt phải KHÁC người tạo yêu cầu; BE trả 409/422 nếu trùng — FE cũng
  disable nút duyệt kèm tooltip khi `request.createdBy === currentUser`.
- Wallet adjust vượt ngưỡng: người duyệt thứ hai phải khác người tạo adjust, cùng quy tắc.

## 3. API contract tiêu thụ

Envelope `{code, message, data|null}`, base `/api/v1/admin`. **Toàn bộ endpoint dưới đây
là assumption** theo change `admin-api` (BE chưa chốt spec commerce chi tiết); riêng
ngưỡng duyệt-2-người (`wallet.adjustDualApprovalThreshold`) giả định BE expose qua
config API — FE đọc, không hardcode.

### Orders & Payments

| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/orders` | `commerce.view` | query `status,userId,search,dateFrom,dateTo,amountMin,amountMax,page,pageSize,sortBy,sortOrder` |
| GET | `/orders/:id` | `commerce.view` | kèm `items[]`, `paymentTimeline[]` (event: created, webhook_received, matched, completed, failed) |
| POST | `/orders/:id/recheck-payment` | `commerce.order.manage` | ép BE re-query trạng thái VietQR → trả timeline mới |
| POST | `/orders/:id/complete` | `commerce.order.manage` | `{reason}` bắt buộc — dùng khi tiền đã về nhưng webhook lỗi |
| POST | `/orders/:id/cancel` | `commerce.order.manage` | `{reason}` bắt buộc |
| GET | `/payments` | `commerce.view` | webhook đã nhận: `matchStatus (matched/unmatched/duplicate)`, query theo ngày |
| GET | `/payments/reconciliation` | `commerce.reconcile` | query `dateFrom,dateTo` → `{summary:{matched,mismatched,missing}, rows[]}` |
| POST | `/payments/reconciliation/:rowId/resolve` | `commerce.reconcile` | `{action:'match_order'|'ignore'|'flag', orderId?, note}` |
| GET | `/revenue/summary` | `commerce.view` | `{today, last7d, last30d, byProductType[]}` cho widget |

### Refunds

| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/refunds` | `commerce.view` | query `status,dateFrom,dateTo,page,...` |
| GET | `/refunds/:id` | `commerce.view` | kèm `timeline[]`, `createdBy`, `approvedBy`, `executedBy` |
| POST | `/orders/:id/refund-requests` | `commerce.refund.request` | `{amount, reason}` — amount ≤ số đã thanh toán, BE validate |
| POST | `/refunds/:id/approve` | `commerce.refund.approve` | `{note?}` — 409 nếu approver = requester |
| POST | `/refunds/:id/reject` | `commerce.refund.approve` | `{reason}` bắt buộc |
| POST | `/refunds/:id/execute` | `commerce.refund.execute` | chỉ khi status=approved; trả kết quả chuyển tiền/hoàn ví |

### Wallets

| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/wallets/:userId` | `wallet.view` | `{balance, currency, status}` |
| GET | `/wallets/:userId/transactions` | `wallet.view` | ledger server-side: query `type,dateFrom,dateTo,page,...` |
| POST | `/wallets/:userId/adjustments` | `wallet.adjust` | `{amount(+/-), reason}` — nếu \|amount\| > ngưỡng → BE trả `{status:'pending_approval'}` thay vì áp dụng ngay |
| GET | `/wallets/adjustments?status=pending` | `wallet.adjust_approve` | hàng đợi adjust chờ duyệt |
| POST | `/wallets/adjustments/:id/approve` | `wallet.adjust_approve` | 409 nếu approver = người tạo |
| POST | `/wallets/adjustments/:id/reject` | `wallet.adjust_approve` | `{reason}` bắt buộc |
| GET | `/config/commerce` | `commerce.view` | **assumption**: `{walletAdjustDualApprovalThreshold}` |

### Coupons & Marketplace

| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/coupons` | `commerce.view` | query `status,search,page,...` |
| POST/PUT | `/coupons(/:id)` | `commerce.coupon.manage` | `{code,type(percent/fixed),value,maxUses,perUserLimit,validFrom,validTo,appliesTo}` |
| POST | `/coupons/:id/disable` | `commerce.coupon.manage` | `{reason}` bắt buộc |
| GET | `/coupons/:id/stats` | `commerce.view` | `{uses, uniqueUsers, revenueImpact, usageByDay[]}` |
| GET | `/marketplace/products` | `commerce.view` | query `type(merchandise/premium/ai_credits/voucher/course_unlock),status,search,page,...` |
| POST/PUT/DELETE | `/marketplace/products(/:id)` | `commerce.product.manage` | payload theo type (schema con per type) |
| GET | `/marketplace/fulfillments` | `commerce.view` | đơn vật lý: `status(pending/packed/shipped/delivered)` |
| PUT | `/marketplace/fulfillments/:id/status` | `commerce.product.manage` | `{status, trackingCode?, note?}` |

## 4. State & data

Query keys:

- `['admin','commerce','orders','list',params]`, `['admin','commerce','orders','detail',id]`
- `['admin','commerce','payments','list',params]`,
  `['admin','commerce','reconciliation',range]`
- `['admin','commerce','refunds','list',params]`, `['admin','commerce','refunds','detail',id]`
- `['admin','commerce','wallets',userId]`, `['admin','commerce','wallets',userId,'ledger',params]`,
  `['admin','commerce','wallet-adjustments','pending',params]`
- `['admin','commerce','coupons','list',params]`, `['admin','commerce','coupons',id,'stats']`
- `['admin','commerce','products','list',params]`, `['admin','commerce','fulfillments',params]`
- `['admin','commerce','revenue','summary']` — `staleTime: 60_000`
- `['admin','commerce','config']` — ngưỡng dual approval, `staleTime: Infinity` trong phiên

Invalidation:
- order action → invalidate order detail + list; refund tạo từ order → thêm refunds list.
- refund approve/reject/execute → invalidate refund detail + list + order detail liên quan.
- wallet adjust → invalidate wallet + ledger; nếu pending → thêm pending queue;
  approve/reject adjust → invalidate cả ba.
- resolve reconciliation row → invalidate reconciliation range + payments list.
- coupon/product mutation → invalidate list (+ stats nếu có).

Zustand: không cần store riêng ngoài filter UI cục bộ; mọi filter đồng bộ URL query string.

## 5. Luồng nghiệp vụ chính

### Flow A — Xử lý order treo
1. Admin lọc `/commerce/orders?status=pending_payment` quá hạn → mở detail.
2. Timeline cho thấy webhook chưa về. Bấm "Kiểm tra lại thanh toán"
   (`POST .../recheck-payment`) → timeline refresh.
3. Nếu tiền đã về (đối chiếu bank) nhưng webhook mất: bấm "Đánh dấu hoàn tất" →
   modal lý do bắt buộc + confirm nêu hệ quả (kích hoạt entitlement cho user) →
   `POST .../complete` → audit.
4. Nếu order không thể hoàn tất: "Huỷ order" với lý do → confirm → `POST .../cancel`.
5. Lỗi 409 (trạng thái đã đổi bởi webhook vừa về) → toast + refetch detail.

### Flow B — Đối soát VietQR
1. Admin có `commerce.reconcile` mở `/commerce/payments/reconciliation`, chọn khoảng ngày.
2. Report trả summary (khớp/lệch/thiếu) + bảng dòng lệch: webhook không khớp order,
   order có tiền nhưng thiếu webhook, webhook duplicate.
3. Từng dòng: "Gán vào order" (search order → confirm), "Bỏ qua" (note bắt buộc),
   hoặc "Cắm cờ điều tra". Mỗi resolve → `POST .../resolve` → dòng chuyển trạng thái.
4. Export report (tái dùng pattern export job). Mọi resolve được audit.

### Flow C — Refund 4-eyes
1. Admin A có `commerce.refund.request` tạo yêu cầu từ order detail: amount (≤ đã trả,
   validate cả FE lẫn BE) + lý do → status `requested`.
2. Admin B có `commerce.refund.approve` mở refund detail → Duyệt (note) hoặc Từ chối
   (lý do bắt buộc). Nếu B = A → nút disable + tooltip "Người duyệt phải khác người
   tạo"; BE cũng chặn 409.
3. Sau approved, người có `commerce.refund.execute` bấm "Thực thi" → confirm nêu số
   tiền + kênh hoàn (bank/ví) → `POST .../execute` → status `executed`.
4. Execute lỗi (kênh thanh toán) → status `execution_failed`, timeline ghi lỗi, cho retry.
5. Mọi bước hiện trên timeline kèm người thực hiện + thời điểm; audit bởi BE.

### Flow D — Wallet adjust vượt ngưỡng
1. Admin có `wallet.adjust` mở ví user → "Điều chỉnh số dư": amount ± , lý do bắt buộc.
2. FE so ngưỡng từ config: nếu vượt → confirm ghi rõ "Cần người thứ hai duyệt trước
   khi hiệu lực"; nếu không vượt → confirm hệ quả bình thường.
3. Submit → BE quyết định thật sự (ngưỡng BE là chân lý): `applied` hoặc `pending_approval`.
4. Pending: hiện ở tab "Adjust chờ duyệt" cho người có `wallet.adjust_approve`
   (khác người tạo). Duyệt → số dư đổi + ledger ghi; Từ chối → lý do bắt buộc.
5. Ledger luôn ghi đủ: người tạo, người duyệt (nếu có), lý do, số dư trước/sau.

## 6. UX states

- **Loading**: list → skeleton bảng; order/refund detail → skeleton mirror (info block +
  timeline); widget doanh thu → skeleton card; reconciliation → skeleton summary + bảng.
- **Empty**: list rỗng → empty state theo ngữ cảnh ("Không có order khớp bộ lọc",
  "Không còn adjust chờ duyệt"); reconciliation không lệch → state "Đối soát khớp 100%".
- **Error**: query lỗi → Alert + retry; 403 route → Forbidden kèm permission thiếu;
  409 conflict (trạng thái đổi, 4-eyes vi phạm) → toast + refetch; 422 → lỗi field-level.
- **Confirm-on-destructive**: complete/cancel order, resolve đối soát, tạo/duyệt/từ chối/
  thực thi refund, adjust ví, disable coupon, xoá product, đổi fulfillment status —
  confirm nêu hệ quả; các mutation tiền bạc bắt buộc lý do; tất cả audit bởi BE.
- **Số tiền**: format VND nhất quán (util chung), input tiền có mask, hiển thị dấu ±
  rõ ràng trên adjust và refund.


## 7. Mock/BE integration notes

- **Refund & wallet adjustment mocks**: current mock sets `createdBy = "current-user"` as a hard-coded string, which does not match the real authenticated user id. When wiring to the real backend, ensure at least one seeded record has `createdBy` equal to the current user's id so the 4-eyes self-approval guard can be tested end-to-end.
