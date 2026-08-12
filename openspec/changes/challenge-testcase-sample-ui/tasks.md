# Tasks — challenge-testcase-sample-ui

## 1. Số case mẫu khi import
- [x] 1.1 `TestCaseZipImport`: `InputNumber` "Số case mẫu" (mặc định 2, min 0, max = trần cap),
      gửi kèm `sampleCount` cho cả bước dryRun lẫn ghi thật (xem trước phải khớp kết quả cuối)
- [x] 1.2 Bảng xem trước thêm cột **"Mẫu"** (Tag) theo `hidden` BE trả về
- [x] 1.3 Ghi chú: thư mục `sample/` trong ZIP được ưu tiên hơn số này

## 2. Phân biệt mẫu / ẩn trong trình soạn
- [x] 2.1 `TestCaseEditor`: nhãn rõ ràng (mẫu = học viên THẤY input/output; ẩn = chỉ thấy verdict)
- [x] 2.2 Cảnh báo khi 0 case mẫu (học viên không có ví dụ nào để hiểu định dạng đề)

## 3. Số lần AI nhận xét
- [x] 3.1 `aiFeedbackLimit` vào `CreateChallengeRequest`/`UpdateChallengeRequest` + payload builder
- [x] 3.2 Ô `InputNumber` (mặc định 1, min 1, max 5) ở wizard + `ChallengeEditModal`, kèm hint
      "AI chỉ nhận xét — điểm do test case chấm"

## 4. Verify
- [x] 4.1 Unit (vitest) cho payload builder: `sampleCount`, `aiFeedbackLimit` kẹp 1..5
- [x] 4.2 `npm run typecheck` + `npm run build` xanh
