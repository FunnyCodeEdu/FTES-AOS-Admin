# admin-academic-console — Console quản trị học thuật

## Why

Mảng `admin-academic` (theo `docs/ADMIN-ARCHITECTURE.md`) chịu trách nhiệm toàn bộ
tài sản học thuật: môn học (Subject), khoá học (Course), học liệu (Resource),
Learning Pack/Collections và Quiz bank. Admin cũ không có cấu trúc Subject chuẩn,
không có workflow duyệt học liệu, không cho CTV đóng góp trong scope. Console mới tại
`/academic/*` phải: chuẩn hoá Subject (learning outcomes, prerequisites, gán
lecturer/moderator), biên tập Course bằng tree editor section→lesson→assignment,
quản pricing/packages/entitlements, publish qua workflow gate `course.publish`,
và vận hành hàng đợi duyệt học liệu trong đó CTV (`ctv-resource`) chỉ thấy và
thao tác đúng subject được gán, không bao giờ được approve.

## What Changes

- Thêm route nhóm `/academic/*` gồm 5 khu: Subjects, Courses, Resources,
  Learning Packs, Quiz bank — nav gate theo permission leaf tương ứng.
- Subject: CRUD môn học, quản learning outcomes, prerequisites (chọn từ subject khác,
  chặn vòng lặp), gán lecturer/moderator cho môn.
- Course: list/detail/tạo/sửa; tree editor section–lesson–assignment (kéo thả, thêm/sửa/
  xoá node); pricing + packages/entitlements; publish qua workflow draft → review →
  published, nút publish gate `course.publish`.
- Resource: list theo subject/type/status; approve/reject queue (moderator/admin);
  CTV scoped chỉ thấy resource thuộc scope của mình và không có nút approve;
  versioning (lịch sử phiên bản, restore); license/visibility per resource.
- Learning Pack/Collections: CRUD pack, gom course/resource vào pack, sắp thứ tự.
- Quiz bank: CRUD câu hỏi theo subject, tag/độ khó, import hàng loạt, review trạng thái.
- Feature folder mới `src/features/academic/`.

## Capabilities

### New Capabilities

- `subject-management`: CRUD Subject + learning outcomes + prerequisites + gán lecturer/moderator.
- `course-management`: CRUD Course, tree editor section-lesson-assignment, pricing/packages/entitlements, publish workflow.
- `resource-management`: kho học liệu theo subject/type/status, approve/reject queue, CTV scope, versioning, license/visibility.
- `learning-pack-management`: CRUD Learning Pack/Collections và thành phần bên trong.
- `quiz-bank-management`: ngân hàng câu hỏi theo subject, CRUD + import + trạng thái review.

### Modified Capabilities

- Không sửa capability nào hiện có (console mới hoàn toàn).

## Impact

- Route mới: `/academic/subjects`, `/academic/subjects/:id`, `/academic/courses`,
  `/academic/courses/:id`, `/academic/resources`, `/academic/resources/review`,
  `/academic/packs`, `/academic/packs/:id`, `/academic/quiz-bank`.
- Feature folder: `src/features/academic/` (pages + api + components per khu).
- API BE tiêu thụ: `/api/v1/admin/subjects*`, `/courses*`, `/resources*`, `/packs*`,
  `/quiz-questions*` — phần lớn là assumption, đánh dấu trong design.md.
- Permission gates: `subject.view/create/update/delete/assign_staff`,
  `course.view/create/update/publish`, `resource.view/create/update/approve/delete`,
  `pack.view/manage`, `quiz.view/manage`; CTV dùng scoped grant
  `{permission, scopeType: 'subject', scopeId}`.
