# Tasks — admin-challenge-bank-console

## 1. Nền tảng (types + hàm thuần + hooks)
- [x] 1.1 `challenge-bank/types.ts`: `BankChallengeView` (tags/placements/difficulty/paper*),
      `ChallengeTagView`, `ChallengePlacementView`, `BankSearchParams`, `ChallengePaperInfo`,
      option list loại / độ khó / trạng thái (kèm `PENDING_APPROVAL`)
- [x] 1.2 `challenge-bank/api/bankQuery.ts`: `buildBankQueryParams` (bỏ field rỗng, `tags` lặp,
      page 1-based UI → 0-based BE) — hàm THUẦN + `bankQuery.test.ts`
- [x] 1.3 `challenge-bank/paperFile.ts`: `validatePaperFile` (MIME + 25 MB) + `formatBytes` —
      hàm THUẦN + `paperFile.test.ts`
- [x] 1.4 `challenge-bank/api/challengeBankConsole.api.ts`: keys factory + hooks bank / tag vocab /
      tagsOf / setTags / placements / addPlacement / removePlacement / uploadPaper / deletePaper /
      reviewQueue / approve / reject (dùng `apiClient`, multipart override `Content-Type: undefined`)

## 2. Màn Kho thử thách
- [x] 2.1 `components/ChallengeBankFilters.tsx` (tìm tiêu đề debounce, tag multi typeahead, loại,
      độ khó, trạng thái, môn, khoá, "chỉ chưa gắn", xoá bộ lọc)
- [x] 2.2 `pages/ChallengeBankPage.tsx`: bảng phân trang server-side, chip tag từng dòng, cột
      "Đang dùng ở N bài", menu hành động; Alert riêng cho 403 phạm vi (chọn khoá)
- [x] 2.3 Route `/academic/challenge-bank` + nav nhóm "Học thuật" trong `routeRegistry.tsx`

## 3. Tag
- [x] 3.1 `components/ChallengeTagPicker.tsx` (Select mode="tags" + typeahead `GET /tags`)
- [x] 3.2 `components/ChallengeTagsModal.tsx` (đọc `GET /{id}/tags`, `PUT` replace-set)
- [x] 3.3 Nhúng ô tag vào `ChallengeEditModal` (lưu tag cùng lúc lưu thử thách; chỉ PUT khi ĐỔI)

## 4. Đề thi
- [x] 4.1 `components/ChallengePaperModal.tsx`: chọn tệp → kiểm tra client → `POST /{id}/paper`;
      hiện tệp hiện tại (tên + link xem/tải), thay, gỡ (confirm)
- [x] 4.2 Lối vào từ dòng ở kho + ngay sau khi tạo đề

## 5. Tạo đề vào kho (không cần khoá)
- [x] 5.1 `components/CreateBankChallengeModal.tsx`: tiêu đề / mô tả / môn / độ khó / loại / tag
      điền sẵn `PE` + mã môn → `POST /challenges` → `PUT /tags` → mở modal đề thi
- [x] 5.2 Thất bại một phần báo đúng trạng thái (đã tạo, chưa đặt tag/đề)

## 6. Hàng đợi duyệt
- [x] 6.1 `pages/ChallengeReviewQueuePage.tsx` + route `/academic/challenge-review`
      (KHÔNG `requiredPermissions`, KHÔNG `<Can>` quanh nút quyết định)
- [x] 6.2 Modal từ chối: `required` + `whitespace` + OK disabled tới khi `trim()` khác rỗng + trim khi gửi

## 7. Chỗ dùng (placement)
- [x] 7.1 `components/ChallengePlacementsModal.tsx`: liệt kê nơi dùng, thêm (chọn khoá → bài),
      gỡ từng chỗ (confirm); nhãn nói rõ "thêm", không phải "chuyển"

## 8. Lỗi & Verify
- [x] 8.1 Bổ sung `ADMIN_ERROR_MESSAGES` cho mã lỗi kho/tag/placement/đề thi/duyệt
- [x] 8.2 `npx tsc --noEmit` sạch + `npm run build` xanh + `npx vitest run` xanh
