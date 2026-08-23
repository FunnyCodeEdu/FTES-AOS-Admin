## Why

Nút xoá kỳ lương đã có nhưng nằm trong FOOTER của drawer chi tiết — phải bấm vào dòng, mở drawer,
kéo xuống đáy mới thấy, nên trên trang lương "không thấy nút xoá đâu".

## What Changes

- Cột "Thao tác" của bảng lương thêm nút **Xoá** (danger, gate `payroll.manage`) ngay trên từng dòng,
  mở `DeleteConfirmModal` bắt nhập lý do — cùng một đường xoá với drawer (`useDeleteEarning`).

## Capabilities

### Modified Capabilities

- `payroll-console`: xoá kỳ lương thao tác được ngay trên danh sách.
