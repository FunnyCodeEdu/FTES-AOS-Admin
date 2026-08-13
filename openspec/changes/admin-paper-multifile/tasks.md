# Tasks — admin-paper-multifile

## 1. Hooks
- [x] 1.1 `usePaperFiles(challengeId)` → `GET /admin/challenges/{id}/paper-files`
      (`useChallengePaperFiles`, `retry:false` + `staleTime:0`)
- [x] 1.2 `useUploadPaperFiles` → `POST .../paper-files` multipart NHIỀU part `files`
      (`headers:{"Content-Type": undefined}`, timeout dài)
- [x] 1.3 `useDeletePaperFile`, `useReorderPaperFiles` (`PUT .../paper-files/order`)

## 2. ChallengePaperModal
- [x] 2.1 Cho chọn NHIỀU file (`multiple`) — GIỮ nguyên lối chọn cả thư mục sẵn có
- [x] 2.2 Danh sách file đã đính: tên, dung lượng, **nhãn vai** (Xem tại chỗ / Tải về, đọc `role` từ BE),
      nút xoá từng file, sắp xếp (lên/xuống)
- [x] 2.3 Lỗi BE (vượt trần số file/tổng byte, sai loại, sai chữ ký) → hiện lý do, KHÔNG mất danh sách cũ

## 3. CreateBankChallengeModal
- [x] 3.1 Gửi `tags` ngay trong lượt tạo; BỎ nhánh khôi phục `pendingTagsFor` (không còn tạo-rồi-gắn-tag)
      — còn MỘT đường lùi tự động `needsTagFollowUp` cho bản BE chưa đọc `tags` (không có UI thử lại)

## 4. Verify
- [x] 4.1 Unit cho hàm thuần (dựng payload upload, sắp xếp, phân loại nhãn vai)
- [x] 4.2 `npm run typecheck` + `npm run build` xanh
