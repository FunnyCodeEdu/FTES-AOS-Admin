## Why

Khu "Quyền truy cập" trong editor gói rất rối: mỗi dòng là một cụm "Loại + Select phần + Select bài +
Select mở-miễn-phí", kèm đoạn văn dài liệt kê từng bài ("Gói chỉ cấp 13 bài đã chọn trong phần
này…"). Một gói 9 dòng đổ ra cả trang chữ, không nhìn ra gói cấp gì.

Tệ hơn: subset bài trong một phần (ladder) CHỈ đọc được từ dữ liệu cũ — editor không có ô nào để
dựng/sửa nó.

## What Changes

- **Danh sách quyền gọn**: mỗi dòng = 1 thẻ tóm tắt (chip loại + "Phần X — trọn phần" / "Phần X — 13
  bài" / "Trọn khoá" / "N bài chọn riêng"), danh sách bài rút gọn 2 dòng + tooltip, chip "Mở miễn phí:
  N bài". Nút **Sửa** / **Xoá** ở mỗi dòng.
- **Nút "+ Thêm quyền"** mở **bộ chọn phạm vi** (modal): chọn "Trọn khoá" HOẶC cây tick phần/bài —
  tick cả phần = trọn phần, tick vài bài = chỉ mấy bài đó. Mỗi phần được chọn thành một dòng quyền.
  Ô "Mở miễn phí cho mọi người" nằm luôn trong modal.
- **Sửa được ladder** (trước đây không dựng được): thêm cờ `scopeEdited` — dòng admin vừa chọn lại thì
  `selectedLessonIds` là ý muốn tường minh (rỗng = trọn phần); dòng KHÔNG có cờ giữ nguyên hành vi cũ
  (ladder lấy từ `raw`), nên gói admin không đụng vào không đổi payload.
- Round-trip `raw` giữ nguyên (EXERCISE, lessonId, quyền bài tập) — PATCH ghi đè cả mảng entitlement
  nên mất field là mất quyền của học viên ĐÃ MUA.

## Capabilities

### Modified Capabilities

- `academic-course-console`: cấp quyền cho gói bằng bộ chọn phần/bài, danh sách quyền đọc được.
