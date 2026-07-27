import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Skeleton, Tabs, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useMe } from "../../../auth/api";
import { hasAnyPermission } from "../../../../shared/permissions";
import { useCourse } from "../api/courses.api";
import { CourseInfoTab } from "../components/CourseInfoTab";
import { PricingTab } from "../components/PricingTab";
import { PublishTab } from "../components/PublishTab";
import { LessonListTab } from "../../lessons/components/LessonListTab";
import { CoursePreviewDefaultConfig } from "../../lessons/components/CoursePreviewDefaultConfig";
import { CourseStudentsTab } from "../components/CourseStudentsTab";
import { CourseChallengeBankTab } from "../../challenge-bank/components/CourseChallengeBankTab";

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: course, isLoading, isError, error, refetch } = useCourse(id);
  const { data: me } = useMe();
  const canUpdate = me ? hasAnyPermission(new Set(me.permissions), ["course.manage"]) : false;
  const canPublish = me ? hasAnyPermission(new Set(me.permissions), ["course.publish"]) : false;
  // Tab Kho thử thách: hiện khi có quyền quản challenge HOẶC quản course (khớp authz BE).
  const canSeeChallengeBank = me
    ? hasAnyPermission(new Set(me.permissions), ["challenge.manage", "course.manage"])
    : false;

  const readOnly = !canUpdate;

  // Tab đang mở — seed từ ?tab= (mirror PostsPage) để nút "Quay lại khoá học" từ màn soạn bài học
  // (link ...?tab=lessons) mở đúng tab "Bài học" thay vì luôn về "Tổng quan".
  const [searchParams] = useSearchParams();
  const [activeKey, setActiveKey] = useState(searchParams.get("tab") ?? "info");

  // #2 gọn course: BỎ dropdown "Khác" — mọi tab (permission-driven) nằm phẳng trên một thanh tab.
  const items = useMemo(() => {
    if (!course) return [];
    return [
      {
        key: "info",
        label: "Tổng quan",
        children: <CourseInfoTab course={course} readOnly={readOnly} />,
        visible: true,
      },
      {
        // Luôn hiện: khoá LEGACY / chưa có gói vẫn cần sửa GIÁ GỐC (cơ chế bán duy nhất của LEGACY).
        // PricingTab tự thích ứng — khu vực gói chỉ đọc cho LEGACY, form giá gốc vẫn ghi được.
        key: "pricing",
        label: "Giá & gói",
        children: <PricingTab course={course} readOnly={readOnly} />,
        visible: true,
      },
      {
        key: "lessons",
        label: "Bài học",
        children: <LessonListTab course={course} />,
        visible: true,
      },
      {
        key: "publish",
        label: "Publish",
        children: <PublishTab course={course} readOnly={readOnly || !canPublish} />,
        visible: true,
      },
      {
        key: "preview",
        label: "Học thử",
        children: <CoursePreviewDefaultConfig courseId={course.id} />,
        visible: true,
      },
      {
        key: "challenge-bank",
        label: "Kho thử thách",
        children: <CourseChallengeBankTab course={course} />,
        visible: canSeeChallengeBank,
      },
      {
        // Tab Học viên chứa email (PII) — chỉ hiển thị khi có quyền quản lý course.
        key: "students",
        label: "Học viên",
        children: <CourseStudentsTab courseId={course.id} />,
        visible: canUpdate,
      },
    ].filter((tab) => tab.visible);
  }, [course, readOnly, canPublish, canSeeChallengeBank, canUpdate]);

  // Đưa activeKey về "info" khi tab đang mở biến mất (vd xoá gói cuối → tab "Giá & gói" bị gỡ) —
  // tránh thanh tab không có tab active và vùng nội dung trắng.
  const visibleKeys = useMemo(() => items.map((tab) => tab.key), [items]);
  useEffect(() => {
    if (visibleKeys.length > 0 && !visibleKeys.includes(activeKey)) setActiveKey("info");
  }, [visibleKeys, activeKey]);

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

  return (
    <div>
      <Typography.Title level={3}>{course.name}</Typography.Title>
      <Typography.Text type="secondary">{course.subjectName}</Typography.Text>
      <Card style={{ marginTop: 16 }}>
        <Tabs activeKey={activeKey} onChange={setActiveKey} items={items} />
      </Card>
    </div>
  );
}
