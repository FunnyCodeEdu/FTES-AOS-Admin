## Why

Console lương của admin: không đóng được kỳ đang chạy (ô trạng thái không cho chọn gì khi OPEN vì BE
chỉ nhận PENDING → CLOSE) và không có nút xoá bản ghi lương.

## What Changes

- `ADMIN_STATUS_FLOW`: `OPEN → ["PENDING", "CLOSE"]` (BE nay đã nhận) → admin chốt/đóng được kỳ đang
  chạy ngay tại ô trạng thái, giữ nguyên xác nhận nguy hiểm khi chuyển CLOSE.
- `useDeleteEarning`: `DELETE /payroll/admin/earnings/{id}` kèm `{reason}`.
- `PayrollDetailDrawer`: nút **"Xoá kỳ lương này"** (danger, gate `payroll.manage`) → `DeleteConfirmModal`
  bắt nhập lý do; nói rõ xoá kèm khấu trừ + ledger, không hoàn tác, và kỳ OPEN sẽ được mở lại rỗng 0đ.

## Capabilities

### Modified Capabilities

- `payroll-console`: admin đóng kỳ lương đang chạy và xoá bản ghi lương (có lý do).
