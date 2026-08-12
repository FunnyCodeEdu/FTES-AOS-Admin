# challenge-testcase-sample-ui — Chọn case mẫu khi import + số lần AI nhận xét

## Why

Sau `challenge-testcase-editor`, import ZIP đã chạy nhưng **mọi case nạp vào đều ẩn** (BE mặc định
`hidden=true`), nên nạp 100 case là học viên **không thấy ví dụ input/output nào** — khác hẳn contest
HackerRank (luôn có vài sample công khai). Ngoài ra chưa có chỗ nào để mentor đặt **số lần AI nhận
xét**: với bài chấm bằng test case thì AI chỉ còn là góp ý, phải rẻ và có trần rõ ràng.

## What Changes

- Panel import ZIP thêm ô **"Số case mẫu"** (mặc định 2) + ghi chú: thư mục `sample/` trong ZIP được
  ưu tiên; bảng xem trước đánh dấu case nào sẽ là **mẫu**.
- Trình soạn test case phân biệt rõ **mẫu ↔ ẩn** và **cảnh báo khi không có case mẫu nào**.
- Form challenge thêm **"Số lần AI nhận xét"** (mặc định 1, tối đa 5), kèm câu nói rõ *AI chỉ nhận
  xét, điểm do test case chấm*.

## Capabilities

### New Capabilities
- `challenge-testcase-sample-ui`: chọn số case mẫu khi import, phân biệt mẫu/ẩn trong trình soạn,
  cấu hình số lần AI nhận xét.

## Impact

- `TestCaseZipImport` (ô số mẫu + cột "Mẫu" ở bảng xem trước), `TestCaseEditor` (nhãn + cảnh báo),
  `ChallengeWizardDrawer` + `ChallengeEditModal` (ô AI nhận xét), `exercises.api.ts` (`sampleCount`,
  `aiFeedbackLimit`), `types.ts`.
- Phụ thuộc BE change `challenge-testcase-samples`.
