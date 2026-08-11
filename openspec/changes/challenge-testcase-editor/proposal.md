# challenge-testcase-editor — Soạn test case kiểu HackerRank + đóng vô hạn

## Why

Wizard tạo challenge (`ChallengeWizardDrawer`) có ô nhập test case ở bước "Nội dung", nhưng dùng
không được cho bài thuật toán thật:

1. **Input/Expected là `<Input>` một dòng** → không nhập nổi stdin/output nhiều dòng (hầu hết bài
   thuật toán đều nhiều dòng).
2. **Ghi một lần duy nhất lúc tạo.** Không có đường đọc lại: `ChallengeEditModal` ghi rõ *"Sửa nội
   dung (câu hỏi / test case / rubric) không nằm ở đây"* và FE không có GET test case nào. Tạo xong
   là **không sửa/thêm/xoá được test case nữa**.
3. **Không import hàng loạt** — nhập tay từng case cho bài 30–50 test là bất khả thi.
4. `buildTestCaseItems` **hardcode** `timeLimitMs: 2000`, `memoryLimitMb: 256` — không chỉnh được
   cho bài nặng.
5. **Thời gian đóng bắt buộc**: `range` có `rules={[{required:true}]}` và
   `buildCreateChallengePayload` đọc thẳng `values.range[1]` → không thể để "mở vô hạn"
   (BE nay đã cho `endsAt = null`).

## What Changes

- **Editor test case dùng được**: `TextArea` multi-line cho Input/Expected, thêm trường `weight`,
  `Ẩn`, `timeLimitMs`, `memoryLimitMb`, sắp xếp/xoá; hiển thị số case + cảnh báo khi vượt cap.
- **Sửa test case sau khi tạo**: màn quản lý test case (mở từ hàng challenge trong tab *Kho
  challenge* và từ `ChallengeEditModal`) đọc `GET /admin/challenges/{id}/test-cases` → sửa →
  `PUT`. Đóng lỗ hổng lớn nhất hiện nay.
- **Import ZIP kiểu HackerRank**: upload `.zip` → `POST /admin/challenges/{id}/test-cases/import`
  (multipart) → **preview danh sách case parse được + các entry bị bỏ qua kèm lý do** trước khi xác
  nhận lưu.
- **Đóng vô hạn**: vế đóng của `RangePicker` được phép trống (`allowEmpty`), payload gửi
  `endsAt: null`, hiển thị *"Không giới hạn"* ở nơi đọc.
- **Verdict**: nơi xem kết quả bài nộp hiển thị `AC/WA/TLE/MLE/RE/CE` thay vì chỉ pass/fail (BE nay
  trả `verdict` + `timeMs`).

## Capabilities

### New Capabilities
- `challenge-testcase-editor`: soạn/sửa/import test case sau khi tạo, giới hạn per-case, lịch đóng
  tuỳ chọn, hiển thị verdict.

## Impact

- **Components**: `ChallengeWizardDrawer` (bước Nội dung + RangePicker), `ChallengeEditModal` (lối
  vào sửa test case), tab `CourseChallengeBankTab` (action "Test case"), component mới
  `TestCaseEditor` + `TestCaseZipImport`.
- **API hooks** (`exercises.api.ts`): thêm `useChallengeTestCases` (GET),
  `useImportChallengeTestCasesZip` (multipart — nhớ `headers:{"Content-Type": undefined}`), tái
  dùng `useUpsertChallengeTestCases` (PUT).
- **Phụ thuộc BE**: change `challenge-testcase-judge` (endpoint admin test-case + `endsAt` nullable
  + verdict).
- Không đổi routing, không đổi quyền (dùng `challenge.manage` / owner-course sẵn có).
