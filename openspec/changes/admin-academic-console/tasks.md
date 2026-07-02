# Tasks — admin-academic-console

## 1. Khung feature & routing
- [ ] 1.1 Tạo `src/features/academic/` với sub-module subjects/courses/resources/packs/quiz.
- [ ] 1.2 Khai báo route `/academic/*` theo bảng design.md, guard theo permission leaf từng khu.
- [ ] 1.3 Nav group "Học thuật" với item gate `subject.view`/`course.view`/`resource.view`/
      `pack.view`/`quiz.view`; mục Review gate `resource.approve`.
- [ ] 1.4 `ctvScopeStore` + `ScopePicker` dùng chung cho CTV nhiều scope.

## 2. Subject (subject-management)
- [ ] 2.1 API layer + query keys subjects theo design.md.
- [ ] 2.2 `SubjectListPage`: bảng server-side, search, filter status/lecturer, nút tạo gate
      `subject.create`.
- [ ] 2.3 `SubjectDetailPage` tabs Thông tin/Outcomes/Prerequisites/Nhân sự/Resources.
- [ ] 2.4 Editor learning outcomes (list sắp thứ tự) + prerequisites picker xử lý 422 vòng lặp.
- [ ] 2.5 Tab Nhân sự: gán lecturer/moderator gate `subject.assign_staff`, confirm khi gỡ.
- [ ] 2.6 Xoá subject: confirm + xử lý 409 còn tham chiếu.

## 3. Course (course-management)
- [ ] 3.1 API layer + query keys courses.
- [ ] 3.2 `CourseListPage`: server-side, filter subject/status/lecturer.
- [ ] 3.3 `CourseTreeEditor` + `courseTreeDraftStore`: 3 cấp kéo thả, confirm xoá node,
      dirty guard, lưu full tree + map lỗi 422 theo node.
- [ ] 3.4 Tab Pricing & Packages: form base price + CRUD package/entitlements.
- [ ] 3.5 Tab Publish: hiển thị workflow + checklist, nút publish/unpublish gate
      `course.publish`, unpublish bắt buộc lý do.

## 4. Resource (resource-management)
- [ ] 4.1 API layer + query keys resources (list/detail/versions/review-queue).
- [ ] 4.2 `ResourceListPage`: filter subject/type/status + search; CTV bị ép scope filter.
- [ ] 4.3 Upload/sửa metadata + license/visibility; version mới ở trạng thái pending.
- [ ] 4.4 Tab Versions: lịch sử, restore có confirm.
- [ ] 4.5 `ResourceReviewQueuePage`: 2 cột list-preview, approve (note) / reject (lý do bắt buộc).
- [ ] 4.6 Ẩn toàn bộ UI approve với user thiếu `resource.approve` (bao gồm CTV).

## 5. Pack & Quiz (learning-pack-management, quiz-bank-management)
- [ ] 5.1 API layer packs + quiz.
- [ ] 5.2 `PackListPage`/`PackDetailPage`: CRUD pack, thêm course/resource, kéo thả thứ tự.
- [ ] 5.3 `QuizBankPage`: bảng server-side filter subject/tag/độ khó/status, CRUD câu hỏi.
- [ ] 5.4 Import quiz: upload → job → báo cáo imported/errors từng dòng.

## 6. Verify
- [ ] 6.1 `openspec validate admin-academic-console` pass.
- [ ] 6.2 npm run build xanh + tsc --noEmit sạch.
- [ ] 6.3 Test tay ma trận quyền: admin đủ quyền / thiếu từng leaf / CTV 1 scope / CTV
      nhiều scope / CTV cố vào review — hành vi đúng design.md mục 2.
