# Design — instructor-publish-challenge-ui

- Reroute title/description sang core PATCH: CatalogService.update nhận title/description + owner-authz
  (requireManage: owner ∨ course.manage@COURSE ∨ global course.manage). Admin có course.manage GLOBAL nên
  KHÔNG regression; instructor (owner) nay sửa được. subjectId KHÔNG được core nhận + luôn disabled ở
  CourseInfoTab nên tách riêng đi admin PATCH chỉ khi có (chỉ admin đổi môn).
- Giữ guard invalidate-on-error khi saleMode đã commit mà bước sau fail.
- MyCourseDetailPage: khôi phục tab Publish + Kho-thử-thách (đã có BE owner-authz), Tổng quan editable.
