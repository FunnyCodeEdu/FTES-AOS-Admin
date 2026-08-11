# Tasks — challenge-testcase-editor

## 1. Editor test case
- [x] 1.1 Component `TestCaseEditor` (tách khỏi `ChallengeWizardDrawer`): `TextArea` multi-line cho
      Input/Expected, trường `weight`/`Ẩn`/`timeLimitMs`/`memoryLimitMb`, xoá + sắp xếp, đếm số case
- [x] 1.2 Bỏ hardcode `timeLimitMs:2000, memoryLimitMb:256` trong `buildTestCaseItems` — lấy từ form
      (giữ default khi trống); cập nhật unit test cạnh component
- [x] 1.3 Dùng lại `TestCaseEditor` trong bước "Nội dung" của wizard (không đổi luồng tạo)
- [x] 1.4 **[F-2 rà soát contract]** Chặn TRẦN của engine trên 2 ô giới hạn: `timeLimitMs` `max=15000`,
      `memoryLimitMb` `max=512` + hint "Tối đa …" dưới ô. Hằng số đặt tên
      `TEST_CASE_MAX_TIME_LIMIT_MS` / `TEST_CASE_MAX_MEMORY_LIMIT_MB` (trỏ tới
      `CODE_MAX_RUN_TIMEOUT_MS` / `CODE_MAX_MEMORY_LIMIT_MB` của ftes-ai-service). Trước đó form cho
      nhập 30s/1024MB nhưng engine clamp im lặng ⇒ tác giả ăn TLE/MLE không hiểu vì sao.

## 2. Sửa test case sau khi tạo
- [x] 2.1 Hook `useChallengeTestCases(challengeId)` → `GET /admin/challenges/{id}/test-cases`
      (react-query, key trong `exerciseKeys`)
- [x] 2.2 Modal/Drawer "Test case" mở từ hàng challenge ở `CourseChallengeBankTab` + từ
      `ChallengeEditModal`; load → sửa qua `TestCaseEditor` → `useUpsertChallengeTestCases` (PUT) →
      invalidate
- [x] 2.3 Bỏ/điều chỉnh dòng chú thích "Sửa nội dung … không nằm ở đây" trong `ChallengeEditModal`

## 3. Import ZIP
- [x] 3.1 Hook `useImportChallengeTestCasesZip` → `POST /admin/challenges/{id}/test-cases/import`
      multipart, `headers:{"Content-Type": undefined}`, timeout dài
- [x] 3.2 `TestCaseZipImport`: `Upload beforeUpload=false` (accept `.zip`), gọi import, hiện
      **preview** case parse được + bảng entry bị bỏ qua kèm lý do, xác nhận → refetch danh sách
- [x] 3.3 Lỗi BE (zip bomb / vượt cap / không có cặp hợp lệ) → `handleAdminMutationError`
- [x] 3.4 **[C-2 rà soát contract]** `normalizeImportResult` đọc `testCases` ĐỘC LẬP với `imported`.
      BE (`ChallengeTestCaseApi.ImportResult`) luôn gửi `imported` là SỐ nên nhánh cũ
      (`else if (Array.isArray(obj.testCases))`) là code chết ⇒ `cases` luôn `undefined` và BẢNG XEM
      TRƯỚC không bao giờ hiện (mất yêu cầu "xem trước rồi mới lưu"). Giữ nguyên các fallback cũ;
      test bổ sung payload có CẢ `imported` số lẫn `testCases` mảng.

## 4. Đóng vô hạn
- [x] 4.1 `RangePicker allowEmpty={[false,true]}`, bỏ `required` cho vế đóng, sửa type `MetaForm.range`
- [x] 4.2 `buildCreateChallengePayload`: `endsAt = range[1] ? iso : null` (không đọc mù `range[1]`);
      bỏ default `dayjs().add(1,'year')` nếu ý định là vô hạn
- [x] 4.3 Nơi hiển thị lịch: `endsAt == null` → "Không giới hạn"
      (`challengeSchedule.ts` + cột "Lịch mở → đóng" ở tab Kho challenge; sentinel cũ 2999 cũng coi
      là vô hạn theo BE design §7)
- [x] 4.4 **[E-1 rà soát contract]** SỬA lịch sau khi tạo: `UpdateChallengeRequest` thêm
      `clearStartsAt`/`clearEndsAt` (khớp `AdminChallengeController.UpdateChallengeBody`) và
      `ChallengeEditModal` thêm `RangePicker` `allowEmpty=[true,true]` (placeholder "Mở ngay" /
      "Không giới hạn", pre-fill qua `challengeScheduleToRange` dùng `isUnlimitedClose`).
      `buildUpdateChallengePayload`: đặt mốc ⇒ `startsAt`/`endsAt`; XOÁ mốc đã đặt ⇒ cờ `clear*`
      (PATCH null nghĩa "giữ nguyên" nên không thể gỡ bằng null); không đụng ⇒ không đính gì.
      Trước đó modal KHÔNG có control lịch ⇒ challenge lỡ đặt hạn không bao giờ về "vô hạn" được.

## 5. Verdict
- [ ] 5.1 Nơi xem kết quả test case: map `verdict` → Tag màu (AC xanh / WA đỏ / TLE cam / MLE cam /
      RE tím / CE xám / SKIPPED nhạt) + hiện `timeMs`
      — **KHÔNG LÀM ĐƯỢC Ở REPO NÀY (chưa có chỗ để hiển thị).** Admin console hiện KHÔNG có màn xem
      bài nộp / kết quả chấm test case nào: không có route, hook, hay component nào đọc
      `submission_results` / `TestResultView`. `verdict` (+`timeMs`) hiện chỉ đi ra learner view của
      FE (`TestResultView`, BE task 2.5). Cần một change riêng "admin submission review" (danh sách
      bài nộp per-challenge + chi tiết từng case) rồi mới gắn Tag verdict — dựng page mới chỉ để có
      chỗ đặt Tag là ngoài phạm vi change này.

## 6. Verify
- [x] 6.1 Unit (vitest) cho hàm thuần: `buildTestCaseItems` giữ multi-line + limit từ form;
      `buildCreateChallengePayload` với `endsAt` null
      (+ `testCaseViewsToRows`, `readTestCaseList`, `describeTestCaseCount`,
      `normalizeImportResult`, `formatChallengeSchedule`)
- [x] 6.2 `npm run build` + `tsc --noEmit` xanh
- [x] 6.3 Sau 3 fix rà soát contract (C-2/E-1/F-2): `npm run typecheck` + `npm run build` xanh,
      `npx vitest run src/features/academic/exercises src/features/academic/challenge-bank`
      → 7 file / 114 test PASS (thêm 4 test `normalizeImportResult` + 13 test lịch/pre-fill)
