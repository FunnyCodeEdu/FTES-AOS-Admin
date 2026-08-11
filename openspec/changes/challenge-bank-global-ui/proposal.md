# challenge-bank-global-ui — Kho challenge chung: tìm kiếm, tag, dùng lại nhiều bài, hiện mô tả bài học

## Why

Tab **Kho challenge** hiện chỉ là kho của **một khoá**:

1. `useCourseChallengeBank(courseId)` gọi `GET /admin/challenges?courseId=` — **bắt buộc** courseId,
   không có đường xem challenge của môn khác ⇒ không tái dùng được bài toán đã soạn.
2. **Không có ô tìm kiếm challenge nào trong toàn bộ Admin** (grep `Input.Search` không ra kết quả
   cho challenge). Lọc hiện tại là `useMemo` client-side (Trạng thái + "Chỉ chưa gắn bài") trên đúng
   danh sách đã tải.
3. **Không có tag** để lọc — cả ở kho lẫn ở tab Tổng quan của môn.
4. **Cây "Chương / bài học"** ở tab Kho challenge **không hiện mô tả**, dù `CourseTreeNode.description`
   đã được GraphQL trả về và map sẵn (`courses.api.ts`) — tab "Bài học" đã hiện, tab này thì chưa.
5. Nút "Gỡ khỏi bài" hiện mang nghĩa *chuyển chỗ* (1 challenge chỉ ở 1 bài). BE nay cho **gắn nhiều
   nơi**, UI phải nói đúng: "Đang dùng ở N bài".

## What Changes

- **Kho toàn cục**: tab Kho challenge đọc `GET /admin/challenges/bank` (không bắt buộc courseId) với
  **ô tìm theo tiêu đề**, lọc **tag / độ khó / loại / môn / trạng thái / chưa gắn**, phân trang
  server-side; giữ chế độ "chỉ khoá này" làm mặc định để không đổi thói quen, có công tắc **"Tất cả
  các môn"** để lấy bài từ kho chung.
- **Gắn nhiều nơi**: hành động gắn thêm placement (`POST /admin/challenges/{id}/placements`), cột
  hiển thị **"Đang dùng ở N bài"** + danh sách nơi dùng; "Gỡ khỏi bài" = gỡ **một** placement.
- **Tag**: chỉnh tag của challenge (`PUT /admin/challenges/{id}/tags`, autocomplete từ
  `GET /admin/challenges/tags`), lọc theo tag ở kho.
- **Tab Tổng quan của môn**: thêm mục **tag challenge** của khoá
  (`GET /admin/courses/{id}/challenge-tags`) — bấm tag nhảy sang kho đã lọc sẵn.
- **Cây chương/bài học hiện mô tả** ở tab Kho challenge (mirror cách `LessonListTab` đang hiện).

## Capabilities

### New Capabilities
- `challenge-bank-global-ui`: duyệt/tìm/lọc kho challenge toàn cục, quản tag, gắn 1 challenge vào
  nhiều bài, hiện mô tả bài học trong cây chọn.

## Impact

- **Components**: `CourseChallengeBankTab` (nguồn dữ liệu + tìm kiếm + lọc tag + cột "đang dùng ở" +
  mô tả trong cây), `CourseInfoTab` (mục tag), mới: `ChallengeTagPicker`, `ChallengeBankFilters`.
- **API hooks** (`challengeBank.api.ts`): `useChallengeBankSearch`, `useChallengeTags`,
  `useSetChallengeTags`, `useAddChallengePlacement`, `useRemoveChallengePlacement`,
  `useCourseChallengeTags`; giữ `useSetChallengeLesson`/`useBulkAssignChallenges` (BE giữ hợp đồng).
- **Phụ thuộc BE**: change `challenge-global-bank-tags`.
- Không đổi quyền (dùng `challenge.manage` / owner-course sẵn có), không đổi routing.
