import { useParams } from "react-router-dom";
import { Alert, Button, Card, Skeleton, Tabs, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useMe } from "../../../auth/api";
import { hasAnyPermission } from "../../../../shared/permissions";
import { useCourse } from "../api/courses.api";
import { CourseInfoTab } from "../components/CourseInfoTab";
import { CourseTreeEditor } from "../components/CourseTreeEditor";
import { PricingTab } from "../components/PricingTab";
import { PublishTab } from "../components/PublishTab";

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: course, isLoading, isError, error, refetch } = useCourse(id);
  const { data: me } = useMe();
  const canUpdate = me ? hasAnyPermission(new Set(me.permissions), ["course.update"]) : false;
  const canPublish = me ? hasAnyPermission(new Set(me.permissions), ["course.publish"]) : false;

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

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

  const readOnly = !canUpdate;

  const items = [
    { key: "info", label: "Tổng quan", children: <CourseInfoTab course={course} readOnly={readOnly} /> },
    { key: "content", label: "Nội dung", children: <CourseTreeEditor course={course} readOnly={readOnly} /> },
    { key: "pricing", label: "Pricing & Packages", children: <PricingTab course={course} readOnly={readOnly} /> },
    { key: "publish", label: "Publish", children: <PublishTab course={course} readOnly={readOnly || !canPublish} /> },
  ];

  return (
    <div>
      <Typography.Title level={3}>{course.name}</Typography.Title>
      <Typography.Text type="secondary">{course.subjectName}</Typography.Text>
      <Card style={{ marginTop: 16 }}>
        <Tabs items={items} />
      </Card>
    </div>
  );
}
