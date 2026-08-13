# admin-course-skill-exp — Tab "EXP kỹ năng" trong trang khoá học

## Why

BE đang xây change `course-skill-exp` (FTES-AOS-Backend): mỗi khoá học cộng EXP vào các **nhóm kỹ
năng** (Programming, CS Fundamentals, Database, DevOps…), và học viên nhận dần EXP đó khi tiến độ
khoá chạm mốc **30/50/80/100%**. Phân bổ EXP theo nhóm được **AI chấm từ syllabus** rồi **người sửa
lại** trước khi nó có hiệu lực.

Phần "người sửa lại" đó không có chỗ nào để làm: Admin v2 chưa có màn nào chạm tới
`career.course_skill_exp`. Nếu không có UI, con số EXP của mỗi khoá chỉ tồn tại đúng như AI đoán —
không ai sửa được một nhóm chấm sai, không ai thêm được nhóm AI bỏ sót, và không ai nhìn thấy khoá
này thực sự cấp bao nhiêu điểm cho ai. Impact của change BE ghi rõ một hạng mục cho repo này:
*"Admin: tab 'EXP kỹ năng' trong trang khoá học (ô dán syllabus + nút để AI chấm + bảng sửa tay)"*.

Người dùng của tab này là **admin hoặc mentor phụ trách khoá** — cùng lớp người đang sửa Giá & gói /
Bài học, nên gate đúng bằng leaf `course.manage` mà các tab hàng xóm dùng.

## What Changes

- **Tab mới `skill-exp` — "EXP kỹ năng"** trong `CourseDetailPage`, đặt sau "Học thử", trước "Học
  viên"; `visible: canUpdate` (leaf `course.manage`) — giống hệt cách tab "Học viên" được gác. Mở
  được trực tiếp bằng `?tab=skill-exp` như mọi tab khác.
- **Ô dán syllabus + nút "Để AI chấm"**: gửi `POST /admin/courses/{courseId}/skill-exp/evaluate`,
  hiện tiến trình trong lúc chạy (request/response thẳng — **KHÔNG** phải job poll như
  `useAiJobPolling`; hợp đồng BE task 2.1 gọi ai-service ngay trong request).
- **Bảng sửa tay**: nhóm kỹ năng → EXP → lý do, thêm dòng / xoá dòng / sửa EXP / sửa lý do, lưu cả
  bộ bằng `PUT /admin/courses/{courseId}/skill-exp` (replace-set, `source=MANUAL`).
- **Nói rõ luật trả điểm trong copy**: con số nhập là **toàn bộ** EXP khi học XONG khoá; học viên
  nhận dần ở 30/50/80/100%. Bảng hiện luôn phần chia mốc của từng dòng (làm tròn xuống từng bước,
  bước 100% lấy phần dư — khớp BE task 3.3) để tác giả thấy mình đang cấu hình cái gì.
- **AI lỗi thì KHÔNG được làm trắng bảng**: lỗi hiện thành Alert kèm lý do, phân bổ đang có (đã lưu
  hoặc đang sửa dở) giữ nguyên — đây là scenario "Evaluation unavailable" của spec BE.
- **Hook + query key** đặt trong `courses.api.ts` / `courses.keys.ts` sẵn có, gọi qua `coreClient`
  (route admin viết `/admin/...`, catalogue `/career/...` không nằm dưới `/admin`), lỗi mutation qua
  `handleAdminMutationError`.

## Capabilities

### New Capabilities
- `admin-course-skill-exp`: cấu hình EXP kỹ năng của một khoá học trong Admin — dán syllabus cho AI
  chấm, sửa/thêm/xoá tay từng nhóm, lưu cả bộ; gate `course.manage`.

### Modified Capabilities
<!-- Không sửa capability sẵn có; chỉ THÊM một tab vào CourseDetailPage. -->

## Impact

- `src/features/academic/courses/pages/CourseDetailPage.tsx` — thêm 1 item vào mảng `Tabs`.
- `src/features/academic/courses/components/CourseSkillExpTab.tsx` (mới) + test helper thuần.
- `src/features/academic/courses/api/courses.api.ts` — types + 4 hook + helper chuẩn hoá/payload.
- `src/features/academic/courses/api/courses.keys.ts` — `skillCategories()`, `skillExp(courseId)`.
- API BE tiêu thụ (`coreClient`, base `/api/v1`): `GET /career/skill-categories`,
  `GET|PUT /admin/courses/{courseId}/skill-exp`,
  `POST /admin/courses/{courseId}/skill-exp/evaluate`.
- `src/shared/api/errors.ts` — thêm mã lỗi `CAREER_SKILL_EXP_*` / `CAREER_COURSE_NOT_FOUND`.
- **Phụ thuộc BE chưa deploy**: change `course-skill-exp` vừa implement xong (chưa lên server).
  Trước khi BE deploy, 3 endpoint trả 404 → tab hiện lỗi tải rõ ràng chứ không vỡ trang.
- **Hợp đồng đã đối chiếu với bản implement của BE** (`SkillExpDtos` + `CourseSkillExpService`):
  - PUT nhận `{ items: [{categorySlug, exp, rationale}] }` — khoá là **`items`**, KHÔNG phải
    `allocations`; sai tên ⇒ 400 "items không được thiếu".
  - GET/PUT trả `AllocationView { categorySlug, categoryLabel, exp, rationale, source }`.
  - POST evaluate trả `EvaluateResult { items, ignoredSlugs, clampedSlugs }` — hai mảng sau là
    phần BE cố tình báo "AI bịa slug gì / EXP nào bị kẹp", tab PHẢI hiện chứ không nuốt.
  - `exp` ∈ **[1, 1000]**, slug phải có trong danh mục và không lặp — FE validate y hệt để lỗi
    hiện tại chỗ thay vì ăn 400 sau khi bấm Lưu.
  - Evaluate **không bao giờ** replace bằng rỗng: AI trả rác ⇒ 502 `CAREER_SKILL_EXP_AI_EMPTY`,
    `@Transactional` rollback giữ nguyên phân bổ cũ.
  - BE cho phép `career.manage` **HOẶC** `course.manage`; tab này gác `course.manage` theo đúng
    các tab hàng xóm (xem Follow-up trong tasks.md §8).
