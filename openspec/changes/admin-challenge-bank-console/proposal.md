# admin-challenge-bank-console — Console kho thử thách: tag, đề thi, duyệt, chỗ dùng

## Why

Đề PE đang được gấp vào **challenge**, phân loại bằng **tag** (`pe` + mã môn). Mô hình dữ liệu mới của
BE (`challenge-global-bank-tags`, đã merge) nói: **kho challenge thuộc về MÔN (workplace); khoá học
chỉ *nhặt* bài từ kho về gắn vào bài học (placement)**. Admin hiện KHÔNG có bề mặt nào phản ánh điều
đó:

1. Mọi đường vào challenge trong Admin đều đi xuyên qua một **khoá học**
   (`CourseChallengeBankTab` nằm trong `/academic/courses/:id`, `useCourseChallengeBank` bắt buộc
   `courseId`). Muốn nạp một đề PE của môn MAE101 mà môn đó chưa có khoá nào thì **không có chỗ nào
   để nạp**.
2. **Không có UI tag**: `GET/PUT /admin/challenges/{id}/tags` đã sống ở BE nhưng Admin chưa gọi, nên
   phân loại `pe` + mã môn — thứ toàn bộ mô hình PE dựa vào — chỉ đặt được bằng SQL tay.
3. **Không có chỗ đính đề thi**: đề PE là một tệp PDF/ảnh; challenge chưa có ô nào để tải nó lên.
4. **Không có hàng đợi duyệt challenge**: học liệu có (`/academic/moderation`), challenge thì chưa —
   CTV soạn đề xong không ai duyệt được.
5. `placements` (một challenge dùng ở NHIỀU bài) đã có ở BE nhưng UI vẫn chỉ có `PUT /lesson` =
   **CHUYỂN chỗ**, nên tái dùng một bài toán ở khoá thứ hai sẽ gỡ nó khỏi khoá thứ nhất.

Theo `docs/ADMIN-ARCHITECTURE.md` §2 (permission-driven) phạm vi do BE quyết: `GET /bank` bỏ trống
`courseId` cần quyền GLOBAL (`admin.challenge.read` ∨ `admin.challenge.manage` ∨
`admin.course.manage`), người quản-khoá phải truyền `courseId`; hàng đợi duyệt thì **tự scope
server-side và trả trang RỖNG** (không 403) cho người không có phạm vi duyệt.

## What Changes

- **Màn Kho thử thách toàn cục** (`/academic/challenge-bank`, nhóm nav "Học thuật"): đọc
  `GET /admin/challenges/bank` với tìm-kiếm + lọc tag (typeahead) / loại / độ khó / trạng thái / môn /
  khoá / "chỉ chưa gắn", phân trang server-side, chip tag từng dòng. **Không cần bước vào khoá nào.**
- **Sửa tag** (`PUT /{id}/tags`, replace-set): mở được từ dòng ở kho VÀ từ modal sửa thử thách sẵn có.
- **Đề thi đính kèm**: tải lên pdf/png/jpeg/webp ≤ 25 MB (`POST /{id}/paper`), xem/tải, thay, gỡ
  (`DELETE /{id}/paper`); kiểm tra MIME + dung lượng phía client trước khi bắn request.
- **Tạo đề thẳng vào kho** — KHÔNG cần khoá: tiêu đề, mô tả, môn, độ khó, tag (điền sẵn `PE` + mã
  môn), rồi tải đề lên. Sau đó khoá học tự nhặt về bằng placement.
- **Hàng đợi duyệt thử thách** (`/academic/challenge-review`): Duyệt / Từ chối (lý do **bắt buộc**).
- **Quản chỗ dùng**: xem challenge đang dùng ở những bài nào, thêm/gỡ từng chỗ — thêm KHÔNG làm nó
  rời các bài cũ.
- Bản địa hoá mã lỗi mới trong `ADMIN_ERROR_MESSAGES`.

**Không làm** (cố ý): mọi UI liên quan **chấm bằng AI** — tính năng đang KHOÁ để bán sau.

## Capabilities

### New Capabilities
- `admin-challenge-bank-console`: bề mặt admin cấp cao nhất cho kho thử thách theo MÔN — duyệt/lọc
  kho không cần khoá, quản tag, đính đề thi, hàng đợi duyệt, và quản chỗ dùng (placement).

### Modified Capabilities
- Không sửa capability nào đang có. `CourseChallengeBankTab` (kho *của một khoá*) giữ nguyên; change
  này thêm bề mặt mới bên cạnh, không thay nguồn dữ liệu của tab đó.

## Impact

- **Route mới**: `/academic/challenge-bank`, `/academic/challenge-review` (nav nhóm "Học thuật").
- **Feature folder**: `src/features/academic/challenge-bank/` (thêm `pages/`, `types.ts`, hooks mới
  trong `api/`, components tag/đề thi/placement/tạo-đề).
- **API BE tiêu thụ**: `GET /admin/challenges/bank`, `GET /admin/challenges/tags`,
  `GET|PUT /admin/challenges/{id}/tags`, `GET|POST|DELETE /admin/challenges/{id}/placements`,
  `POST /admin/challenges` (`subjectId` + `difficulty`), `PATCH /admin/challenges/{id}`,
  `POST|DELETE /admin/challenges/{id}/paper` *(đang xây song song)*,
  `GET /admin/challenges/review-queue` + `POST /{id}/approve|reject` *(đang xây song song)*.
- **Permission gates**: route kho gate OR `admin.challenge.read` / `admin.challenge.manage` /
  `admin.course.manage`; nút ghi gate `admin.challenge.manage`. Route hàng đợi duyệt **KHÔNG gate
  client-side** (BE đã scope, trả rỗng).
- Sửa `src/shared/api/errors.ts` (thêm message) và `ChallengeEditModal` (thêm ô tag).
