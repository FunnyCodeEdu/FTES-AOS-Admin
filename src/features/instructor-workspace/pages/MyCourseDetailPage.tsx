import { useParams } from "react-router-dom";
import { Alert, Button, Card, Skeleton, Tabs, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { PermissionScopeContext } from "../../../shared/permissions";
import { useManagedCourse } from "../../academic/courses/api/courses.api";
import { CourseInfoTab } from "../../academic/courses/components/CourseInfoTab";
import { LessonListTab } from "../../academic/lessons/components/LessonListTab";
import { PricingTab } from "../../academic/courses/components/PricingTab";
import { CoursePreviewDefaultConfig } from "../../academic/lessons/components/CoursePreviewDefaultConfig";
import { CourseChallengeBankTab } from "../../academic/challenge-bank/components/CourseChallengeBankTab";

/**
 * Chi tiết khoá của tôi — key off OWNERSHIP (instructor_id) chứ KHÔNG phải COURSE-scope grant.
 * Dữ liệu đến từ GET /courses/{id}/manage (owner-authz requireManage ở BE): caller không sở hữu và
 * không có grant → BE 403 → hiển thị lỗi, KHÔNG lộ dữ liệu (thay cho ScopeGuard cũ vốn chặn cả owner
 * thuần không có grant).
 */
function CourseWorkspace({ courseId }: { courseId: string }) {
  const { data: course, isLoading, isError, error, refetch } = useManagedCourse(courseId);

  // canManage = "BE đã cho tôi đọc bản manage của khoá này".
  //
  // `GET /courses/{id}/manage` chạy qua `CatalogService.requireManage`: chủ khoá (instructor_id) ∨
  // `course.manage` GLOBAL ∨ `course.manage`@COURSE — không thoả thì 403 và `course` ở đây là
  // undefined. Nói cách khác, cầm được `course` trong tay ĐÃ LÀ bằng chứng có quyền quản; suy lại
  // điều kiện đó ở FE chỉ tạo cơ hội cho hai bên lệch nhau.
  //
  // Và lệch thật: bản trước so `course.instructorId === me.user.id`, trong khi `me.user.id` là chuỗi
  // RỖNG cho mọi tài khoản (query `me` không hỏi field `user` — xem features/auth/api.ts). Nên chủ
  // khoá luôn ra false → trang mở ở chế độ chỉ-đọc và HAI TAB "Kho challenge" + "Học thử" không bao
  // giờ render: giảng viên không có chỗ nào để tạo đề cho khoá mình.
  const canManage = course != null;
  // Owner được publish khoá của mình (BE gác publish bằng requireManage / course.publish@COURSE).
  const canPublish = canManage;
  const readOnly = !canManage;

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  if (isError || !course) {
    return (
      <Alert
        type="error"
        message="Không thể tải khoá học"
        description={error?.message}
        action={
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  // Toàn bộ tab đã owner-authz ở BE cho giảng viên: Tổng quan (gồm cả Trạng thái xuất bản), Bài học
  // (gồm soạn thực hành theo bài), Giá & gói, Học thử.
  const items = [
    { key: "info", label: "Tổng quan", children: <CourseInfoTab course={course} readOnly={readOnly} canPublish={canPublish} /> },
    { key: "lessons", label: "Bài học", children: <LessonListTab course={course} /> },
    { key: "pricing", label: "Giá & gói", children: <PricingTab course={course} readOnly={readOnly} /> },
    ...(canManage
      ? [
          {
            key: "challenges",
            label: "Kho challenge",
            children: <CourseChallengeBankTab course={course} canManage={canManage} />,
          },
          {
            key: "preview",
            label: "Học thử",
            children: <CoursePreviewDefaultConfig courseId={course.id} />,
          },
        ]
      : []),
  ];

  return (
    <div>
      <Typography.Title level={3}>{course.name}</Typography.Title>
      <Typography.Text type="secondary">{course.subjectName}</Typography.Text>
      <Card style={{ marginTop: 16 }}>
        {/* COURSE-scope context: các tab academic tái sử dụng gate bằng global <Can course.manage/
            course.publish> vẫn được thoả bằng grant COURSE-scope nếu giảng viên có (backward compat);
            owner thuần đi qua readOnly prop (vd CourseInfoTab drive Save off readOnly). */}
        <PermissionScopeContext.Provider value={{ type: "COURSE", id: course.id }}>
          <Tabs items={items} />
        </PermissionScopeContext.Provider>
      </Card>
    </div>
  );
}

export default function MyCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  if (!courseId) {
    return <Alert type="error" message="Thiếu mã khoá học" showIcon />;
  }
  return <CourseWorkspace courseId={courseId} />;
}
