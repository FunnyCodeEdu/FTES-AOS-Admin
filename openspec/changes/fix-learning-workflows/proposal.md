# fix-learning-workflows — Điều khiển challenge theo gói

## Why
Admin hiện giữ `selectedExerciseIds` âm thầm nhưng không có giao diện chọn challenge cho từng gói, và form sửa challenge chưa cho chỉnh rõ số lượt nộp.

## What Changes
- Cho chọn challenge thuộc khóa khi cấu hình mỗi entitlement của gói.
- Hiển thị/tùy chỉnh challenge miễn phí theo cùng phạm vi.
- Bổ sung chỉnh số lượt nộp tối đa ở form challenge.

## Capabilities
### Modified Capabilities
- `admin-course-package-editor`
- `admin-challenge-editor`

## Impact
Admin FE בלבד; dùng contract `selectedExerciseIds/freeExerciseIds` và PATCH challenge hiện có.
