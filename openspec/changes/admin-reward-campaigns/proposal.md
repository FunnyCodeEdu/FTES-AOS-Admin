## Why

Admin cần tự tạo các "chương trình nhận thưởng Xu" (vd Quốc khánh 2/9 nhận 29.000 Xu) chứ không
hard-code từng đợt. BE đã có module campaign (Backend #190).

## What Changes

- Trang **Chương trình thưởng** (`/operations/campaigns`, nhóm Vận hành, gác `campaign.manage`):
  bảng liệt kê (số Xu/người, thời gian, đã phát/giới hạn, trạng thái) + tạo/sửa/xoá.
- Form: mã (không đổi sau khi tạo), tên, mô tả, số Xu, giới hạn tổng lượt, trạng thái
  (Bản nháp/Đang phát/Đã dừng), cửa sổ thời gian (RangePicker, để trống = không giới hạn).
- Xoá qua `DeleteConfirmModal`, nói rõ Xu đã phát KHÔNG bị thu hồi và gợi ý dùng "Đã dừng" nếu chỉ
  muốn ngừng phát.

## Capabilities

### Added Capabilities

- `operations-console`: quản lý chương trình nhận thưởng Xu.
