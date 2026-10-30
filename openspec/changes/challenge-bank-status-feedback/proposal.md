# challenge-bank-status-feedback — Kho challenge phản ánh đúng trạng thái sau thao tác

## Why

Sự cố đợt PE khoá PRF192/PRF193 ngày 30/10/2026 lộ ra hai chỗ UI đánh lừa người soạn:

1. Publish / Mở lại / đổi hiển thị / Xoá / Nhân bản trong tab "Kho challenge" thành công nhưng dòng
   giữ trạng thái cũ (vd vẫn DRAFT) tới khi bấm "Làm mới": các hook chỉ invalidate
   `["admin","exercises"]`, còn danh sách kho đọc khoá `["admin","challenge-bank",…]`.
2. "Sửa nhanh" một thử thách CLOSED cho lùi giờ đóng mà không nói gì — nhưng PATCH chỉ đổi giờ, không
   đổi status, nên bài vẫn CLOSED và học viên vẫn không thấy. 9 đề đã kẹt đúng kiểu này.

## What Changes

- `usePublishChallenge`, `useSetChallengeVisibility`, `useDeleteChallenge`, `useDuplicateChallenge`
  invalidate thêm `challengeBankKeys.all`; bỏ refetch thủ công của "Nhân bản" trong tab.
- `ChallengeEditModal`: thử thách CLOSED hiện cảnh báo ngay trên ô lịch — đổi giờ đóng không mở lại,
  dùng "Mở lại" hoặc "Nhân bản".

## Non-goals

- Không tự mở lại khi lùi giờ đóng (BE chặn mở lại đề đã chốt bảng xếp hạng là có chủ đích).
