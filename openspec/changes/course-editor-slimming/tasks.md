# Tasks — course-editor-slimming

## 1. Bỏ tab "Nội dung"
- [x] 1.1 Gỡ tab "Nội dung" khỏi `CourseDetailPage`; xoá `CourseTreeEditor`

## 2. Gấp Publish vào Tổng quan
- [x] 2.1 `CourseInfoTab` chứa checklist + hành động publish; xoá `PublishTab`

## 3. Sửa học thử inline + chuyển chương (hàng bài học)
- [x] 3.1 `InlineTrialEditor` trên `LessonListTab` (giây/%, lưu blur/Enter/switch)
- [x] 3.2 Dropdown "Chuyển chương" + thả card sang chương khác

## 4. Gỡ "Kho thử thách", chuyển challenge về theo bài
- [x] 4.1 Gỡ tab; xoá module `challenge-bank` (api/keys/component/test)
- [x] 4.2 Chuyển `publishRisk.ts` + `useSetChallengeVisibility` sang `exercises`
- [x] 4.3 `LessonExercisesCard` render toggle visibility + confirm rủi ro theo bài

## 5. Review fixes (2026-07-27)
- [x] 5.1 `InlineTrialEditor` phân biệt kế thừa vs tắt tường minh: tag "kế thừa · <effective>" +
      nút "Tắt hẳn" ghi 0 trực tiếp
- [x] 5.2 Tắt Lên/Xuống/"Chuyển chương" cho node "assignment" legacy; thả card báo `message.warning`
- [x] 5.3 `useCourseUnattachedChallenges(courseId)` + section "Thử thách chưa gắn" trong
      `LessonExercisesCard` (gắn vào bài này / publish / visibility); mutation link/publish/visibility
      invalidate cả danh sách chưa-gắn
- [x] 5.4 Gate challenge = `canManage || hasPermission('challenge.manage')`; prop `canManageChallenge`
      truyền từ `LessonEditPage`
- [x] 5.5 `LessonEditPage` truyền `course={{basePrice, saleMode}}` (từ `useCourse`) để cảnh báo
      "paid-lesson" chạy đúng thay vì nhánh degrade

## 6. Nghiệm thu
- [x] 6.1 `npm run build` xanh + eslint sạch (2026-07-27)
