# challenge-duplicate — Nút "Nhân bản" trong kho challenge của khoá

## Why

Đề CLOSED đã chốt bảng xếp hạng không mở lại được: BE trả "Challenge đã chốt bảng xếp hạng/phần
thưởng; hãy nhân bản để mở một đợt mới" (chặn phát thưởng trùng). Admin chưa có nút nhân bản nên
lời khuyên đó là ngõ cụt — sự cố đợt PE khoá PRF192/PRF193 ngày 30/10/2026 (9 đề kẹt CLOSED).

## What Changes

- Hook `useDuplicateChallenge` → `POST /api/v1/admin/challenges/{id}/duplicate` (BE change
  `challenge-duplicate`), trả `{id}`.
- Tab "Kho challenge" của khoá: menu "…" mỗi dòng thêm "Nhân bản" (mọi trạng thái), có confirm; xong
  thì làm mới kho + coverage và nhắc "kiểm lịch rồi Publish".

## Non-goals

- Không tự publish bản mới; không thêm nút ở kho challenge chung.
