# mentor-workspace-access — Giảng viên vào được khu của mình: khoá, lương, kho challenge

## Why

Người dùng báo: giảng viên đăng nhập Admin CMS thì "khoá mình dạy không chỉnh được, chưa thấy lương,
chưa tạo được challenge cho khoá mình". Đo bằng tài khoản LECTURER thật trên apitest 2026-08-22
(`instructor.test@ftes.vn`) — cả ba triệu chứng là BỐN lỗi FE độc lập, mỗi lỗi tự nó đủ chặn:

1. **Route `/instructor/courses` và `/instructor/courses/:courseId` gác `course.manage`.** Chú thích
   trong `routeRegistry` khẳng định "LECTURER có course.manage từ V14" — sai: **V27 đã THU HỒI** leaf
   GLOBAL đó khỏi LECTURER (nó vượt qua mọi check scope COURSE ở BE, tức lỗ hổng BOLA). `me.permissions`
   đo được: 31 leaf, không có `course.manage`. Nên MỌI giảng viên bấm vào khoá của mình đều rơi `/403`.
2. **`InstructorHomePage` chặn cả trang khi không có COURSE-scope grant.** Trang `return` sớm cảnh báo
   "Không có khoá nào được gán" khi `me.scopedGrants` rỗng — nhưng chủ khoá THUẦN có **zero** scoped
   grant (quyền dạy nằm ở cột `instructor_id`, không nằm trong bảng grant). Với đúng persona chính của
   trang, cả hai thẻ bên phải — trong đó có **"Lương của tôi"** — không bao giờ render. Đó là "chưa
   thấy lương": API `/payroll/me/*` trả 200 đầy đủ, chỉ là không có lối nào bấm tới.
3. **Không có nav cho khu giảng viên ngoài `/instructor`.** Lối vào duy nhất tới khoá và lương là hai
   thẻ trong trang (2) — trang đang hỏng. Một lỗi làm mất luôn cả ba đích.
4. **`me.user.id` là chuỗi RỖNG cho MỌI tài khoản.** Query GraphQL `Me` không hỏi field `user`, còn
   `useMe` lấy `storeUser ?? {id:"",…}`; `useFinishSession` lại nhét chính giá trị rỗng đó vào store —
   vòng tròn khép kín. Hệ quả ở `MyCourseDetailPage`: `canManage = course.instructorId === me.user.id`
   luôn FALSE cho chủ khoá ⇒ trang mở chế độ chỉ-đọc và hai tab **"Kho challenge" + "Học thử" không
   render**. Đó là "chưa tạo được challenge cho khoá mình" (và cũng là lý do tên tài khoản góc phải
   luôn hiện "Admin").

## What Changes

- `routeRegistry`: khu khoá học gác `["course.manage", "course.content.edit"]` (HOẶC) — leaf
  `course.content.edit` LECTURER có từ V4, `course.manage` giữ cho ADMIN/ADMIN_ACADEMIC. Rail
  `/instructor` nhận thêm `course.content.edit`. Thêm **nav riêng** cho "Khoá của tôi" và "Lương của
  tôi", gom cả ba vào group "Giảng viên".
- `InstructorHomePage`: nguồn khoá đổi sang **ownership** (`GET /courses/teaching`) gộp với COURSE-scope
  grant; rỗng chỉ làm rỗng MỘT thẻ, không chặn cả trang.
- `useMe`: query `me { user { id username displayName } }` (đã introspect trên BE apitest: type
  `PublicUser`) và map vào `MeResponse.user` — id thật thay cho chuỗi rỗng.
- `MyCourseDetailPage`: `canManage` = "BE đã cho đọc bản manage của khoá này". `GET /courses/{id}/manage`
  chạy qua `CatalogService.requireManage`, không thoả thì 403 — cầm được dữ liệu đã là bằng chứng có
  quyền; suy lại điều kiện ở FE chỉ tạo cơ hội lệch nhau (và đã lệch thật).

## Capabilities

### New Capabilities

- `mentor-workspace-access`: giảng viên thấy và dùng được trọn khu của mình — danh sách khoá, sửa khoá,
  kho challenge, bảng lương — bằng ownership, không cần leaf admin GLOBAL.

## Impact

- `src/app/routeRegistry.tsx`, `src/features/instructor-workspace/pages/InstructorHomePage.tsx`,
  `src/features/instructor-workspace/pages/MyCourseDetailPage.tsx`, `src/features/auth/api.ts`.
- Test: `routeRegistry.test.tsx` viết lại phần khu giảng viên (so gate với BỘ LEAF THẬT của LECTURER
  thay vì một chuỗi cứng — đúng thứ mà cả hai lần hỏng trước đều lọt qua) + `instructorWorkspaceAccess.test.tsx`
  mới (nav + gộp nguồn khoá).
- Cần BE change `mentor-course-challenge-access` đi kèm để tab "Giá & gói" và nút sửa/xoá challenge
  không 403 — hai thay đổi độc lập, không ràng buộc thứ tự deploy.
