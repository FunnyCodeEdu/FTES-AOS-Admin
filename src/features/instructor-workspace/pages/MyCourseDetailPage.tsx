import { useParams } from "react-router-dom";
import { Alert, Button, Card, Skeleton, Tabs, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useMe } from "../../auth/api";
import { PermissionScopeContext } from "../../../shared/permissions";
import { useManagedCourse } from "../../academic/courses/api/courses.api";
import { CourseInfoTab } from "../../academic/courses/components/CourseInfoTab";
import { CourseTreeEditor } from "../../academic/courses/components/CourseTreeEditor";
import { PricingTab } from "../../academic/courses/components/PricingTab";
import { PublishTab } from "../../academic/courses/components/PublishTab";
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
  const { data: me } = useMe();

  // canManage theo OWNERSHIP: instructor_id === chính mình (ownership KHÔNG nằm trong
  // permissions/scopedGrants — BE requireManage vẫn cho owner). Admin có course.manage GLOBAL cũng
  // quản được. Đây là bản vá cho check hasScopedPermission cũ (owner thuần luôn ra false → read-only).
  const canManage =
    !!me &&
    ((course != null && course.instructorId === me.user.id) ||
      me.permissions.includes("course.manage"));
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

  // Toàn bộ tab đã owner-authz ở BE cho giảng viên: Tổng quan (sửa tên/tóm tắt qua core PATCH
  // owner-authz), Nội dung, Giá & gói, Publish, Học thử, Kho thử thách.
  const items = [
    { key: "info", label: "Tổng quan", children: <CourseInfoTab course={course} readOnly={readOnly} /> },
    { key: "content", label: "Nội dung", children: <CourseTreeEditor course={course} readOnly={readOnly} /> },
    { key: "pricing", label: "Giá & gói", children: <PricingTab course={course} readOnly={readOnly} /> },
    { key: "publish", label: "Publish", children: <PublishTab course={course} readOnly={readOnly || !canPublish} /> },
    ...(canManage
      ? [
          {
            key: "preview",
            label: "Học thử",
            children: <CoursePreviewDefaultConfig courseId={course.id} />,
          },
          {
            key: "challenge-bank",
            label: "Kho thử thách",
            children: <CourseChallengeBankTab course={course} />,
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
