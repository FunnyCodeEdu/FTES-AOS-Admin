# Tasks — admin-academic-console

## 1. Khung feature & routing
- [x] 1.1 Tạo `src/features/academic/` với sub-module subjects/courses/resources/packs/quiz.
- [x] 1.2 Khai báo route `/academic/*` theo bảng design.md, guard theo permission leaf từng khu.
- [x] 1.3 Nav group "Học thuật" với item gate `subject.view`/`course.view`/`resource.view`/
      `pack.view`/`quiz.view`; mục Review gate `resource.approve`.
- [x] 1.4 `ctvScopeStore` + `ScopePicker` dùng chung cho CTV nhiều scope.

## 2. Subject (subject-management)
- [x] 2.1 API layer + query keys subjects theo design.md.
- [x] 2.2 `SubjectListPage`: bảng server-side, search, filter status/lecturer, nút tạo gate
      `subject.create`.
- [x] 2.3 `SubjectDetailPage` tabs Thông tin/Outcomes/Prerequisites/Nhân sự/Resources.
- [x] 2.4 Editor learning outcomes (list sắp thứ tự) + prerequisites picker xử lý 422 vòng lặp.
- [x] 2.5 Tab Nhân sự: gán lecturer/moderator gate `subject.assign_staff`, confirm khi gỡ.
- [x] 2.6 Xoá subject: confirm + xử lý 409 còn tham chiếu.

## 3. Course (course-management)
- [x] 3.1 API layer + query keys courses.
- [x] 3.2 `CourseListPage`: server-side, filter subject/status/lecturer.
- [x] 3.3 `CourseTreeEditor` + `courseTreeDraftStore`: 3 cấp kéo thả, confirm xoá node,
      dirty guard, lưu full tree + map lỗi 422 theo node.
- [x] 3.4 Tab Pricing & Packages: form base price + CRUD package/entitlements.
- [x] 3.5 Tab Publish: hiển thị workflow + checklist, nút publish/unpublish gate
      `course.publish`, unpublish bắt buộc lý do.

## 4. Resource (resource-management)
- [x] 4.1 API layer + query keys resources (list/detail/versions/review-queue).
- [x] 4.2 `ResourceListPage`: filter subject/type/status + search; CTV bị ép scope filter.
- [x] 4.3 Upload/sửa metadata + license/visibility; version mới ở trạng thái pending.
- [x] 4.4 Tab Versions: lịch sử, restore có confirm.
- [x] 4.5 `ResourceReviewQueuePage`: 2 cột list-preview, approve (note) / reject (lý do bắt buộc).
- [x] 4.6 Ẩn toàn bộ UI approve với user thiếu `resource.approve` (bao gồm CTV).

## 5. Pack & Quiz (learning-pack-management, quiz-bank-management)
- [x] 5.1 API layer packs + quiz.
- [x] 5.2 `PackListPage`/`PackDetailPage`: CRUD pack, thêm course/resource, kéo thả thứ tự.
- [x] 5.3 `QuizBankPage`: bảng server-side filter subject/tag/độ khó/status, CRUD câu hỏi.
- [x] 5.4 Import quiz: upload → job → báo cáo imported/errors từng dòng.

## 6. Verify
- [x] 6.1 `openspec validate admin-academic-console` pass.
- [x] 6.2 npm run build xanh + tsc --noEmit sạch.
- [x] 6.3 Test tay ma trận quyền: admin đủ quyền / thiếu từng leaf / CTV 1 scope / CTV
      nhiều scope / CTV cố vào review — hành vi đúng design.md mục 2.
