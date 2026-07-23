import { useParams } from "react-router-dom";
import { Alert, Button, Card, Skeleton, Tabs, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useMe } from "../../auth/api";
import { hasScopedPermission, PermissionScopeContext } from "../../../shared/permissions";
import { useCourse } from "../../academic/courses/api/courses.api";
import { CourseInfoTab } from "../../academic/courses/components/CourseInfoTab";
import { CourseTreeEditor } from "../../academic/courses/components/CourseTreeEditor";
import { PricingTab } from "../../academic/courses/components/PricingTab";
import { PublishTab } from "../../academic/courses/components/PublishTab";
import { CoursePreviewDefaultConfig } from "../../academic/lessons/components/CoursePreviewDefaultConfig";
import { CourseChallengeBankTab } from "../../academic/challenge-bank/components/CourseChallengeBankTab";
import { ScopeGuard } from "../components/ScopeGuard";

function CourseWorkspace({ courseId }: { courseId: string }) {
  const { data: course, isLoading, isError, error, refetch } = useCourse(courseId);
  const { data: me } = useMe();
  const grants = me?.scopedGrants ?? [];

  // Quyền per-course từ COURSE-scope grant (KHÔNG role, KHÔNG global) — mirror BE ownership authz.
  const canManage = hasScopedPermission(grants, "course.manage", "COURSE", courseId);
  const canPublish = hasScopedPermission(grants, "course.publish", "COURSE", courseId);
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

  // Toàn bộ tab đã owner-authz ở BE cho giảng viên (instructor-owner-course-read +
  // instructor-publish-challenge-authz): Tổng quan (sửa tên/tóm tắt qua core PATCH owner-authz),
  // Nội dung, Giá & gói, Publish (course.publish@COURSE), Học thử, Kho thử thách (canManage owner).
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
            course.publish> sẽ được thoả bằng grant COURSE-scope của LECTURER cho đúng khoá này. */}
        <PermissionScopeContext.Provider value={{ type: "COURSE", id: course.id }}>
          <Tabs items={items} />
        </PermissionScopeContext.Provider>
      </Card>
    </div>
  );
}

/**
 * Chi tiết khoá của tôi — bọc ScopeGuard COURSE: lách URL sang khoá ngoài scope → /403,
 * KHÔNG phát request dữ liệu khoá đó (CourseWorkspace chỉ render sau khi guard qua).
 */
export default function MyCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  if (!courseId) {
    return <Alert type="error" message="Thiếu mã khoá học" showIcon />;
  }
  return (
    <ScopeGuard scopeType="COURSE" scopeId={courseId}>
      <CourseWorkspace courseId={courseId} />
    </ScopeGuard>
  );
}
