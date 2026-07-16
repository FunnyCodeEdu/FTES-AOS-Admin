# admin-tree-assignment-node-removal

## ADDED Requirements

### Requirement: Tree editor no longer offers assignment nodes
`CourseTreeEditor` SHALL bỏ khả năng thêm node type "assignment" (khái niệm FE-only chưa bao giờ được persist — sync đang skip im lặng tại `courses.api.ts:263`); node assignment còn sót trong draft cũ SHALL hiển thị cảnh báo "đã chuyển về tab Bài tập" + nút xóa node, và KHÔNG bao giờ bị gửi lên BE.

#### Scenario: Không thêm được node assignment
- **WHEN** admin mở tree editor
- **THEN** menu thêm node chỉ còn section/lesson

#### Scenario: Draft cũ có node assignment
- **WHEN** draft trong store còn node assignment từ phiên trước
- **THEN** node hiện badge cảnh báo di dời + nút xóa; bấm Lưu thì node không được sync và KHÔNG mất dữ liệu section/lesson khác

#### Scenario: Không còn drop im lặng
- **WHEN** admin lưu tree bất kỳ
- **THEN** mọi node hiển thị trong draft (section/lesson) đều được sync — không còn loại node nào bị bỏ qua mà user không biết

## Seed data

- Không cần seed (thuần refactor UI). Smoke test trên course seed `seed-course-c-basic`
  (BE `course-demo-seed-dev`).
