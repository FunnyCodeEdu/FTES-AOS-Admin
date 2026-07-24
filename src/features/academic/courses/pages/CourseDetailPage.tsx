import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Button, Card, Dropdown, Skeleton, Space, Tabs, Typography } from "antd";
import type { MenuProps } from "antd";
import { DownOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMe } from "../../../auth/api";
import { hasAnyPermission } from "../../../../shared/permissions";
import { useCourse, useCoursePackages } from "../api/courses.api";
import { CourseInfoTab } from "../components/CourseInfoTab";
import { CourseTreeEditor } from "../components/CourseTreeEditor";
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
  // Gói của khoá — dùng để quyết định có hiện tab "Giá & gói" khi khoá chưa PACKAGE nhưng đã có gói.
  const { data: packages } = useCoursePackages(id);
  const canUpdate = me ? hasAnyPermission(new Set(me.permissions), ["course.manage"]) : false;
  const canPublish = me ? hasAnyPermission(new Set(me.permissions), ["course.publish"]) : false;
  // Tab Kho thử thách: hiện khi có quyền quản challenge HOẶC quản course (khớp authz BE).
  const canSeeChallengeBank = me
    ? hasAnyPermission(new Set(me.permissions), ["challenge.manage", "course.manage"])
    : false;

  // Tab đang mở + các tab phụ đã được người dùng mở từ menu "Khác" (mặc định KHÔNG hiện — #2 gọn course).
  const [activeKey, setActiveKey] = useState("info");
  const [openedSecondary, setOpenedSecondary] = useState<string[]>([]);

  const readOnly = !canUpdate;

  // "Giá & gói" chỉ hiện khi khoá bán theo gói (PACKAGE) HOẶC đã tồn tại gói (nâng cấp dở dang).
  const showPricing = useMemo(
    () => course?.saleMode === "PACKAGE" || (packages?.length ?? 0) > 0,
    [course?.saleMode, packages]
  );

  // Tab phụ (permission-driven) — relocate khỏi màn mặc định vào menu "Khác".
  const secondaryTabs = useMemo(() => {
    if (!course) return [];
    return [
      {
        key: "content",
        label: "Nội dung",
        children: <CourseTreeEditor course={course} readOnly={readOnly} />,
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

  // Màn mặc định: Tổng quan · Giá & gói (điều kiện) · Bài học.
  const coreItems = [
    { key: "info", label: "Tổng quan", children: <CourseInfoTab course={course} readOnly={readOnly} /> },
    ...(showPricing
      ? [{ key: "pricing", label: "Giá & gói", children: <PricingTab course={course} readOnly={readOnly} /> }]
      : []),
    { key: "lessons", label: "Bài học", children: <LessonListTab course={course} /> },
  ];

  // Chỉ render tab phụ đã được mở (giữ mounted để không mất state khi chuyển qua lại).
  const openedItems = secondaryTabs.filter((tab) => openedSecondary.includes(tab.key));
  const items = [...coreItems, ...openedItems];

  const openSecondary = (key: string) => {
    setOpenedSecondary((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setActiveKey(key);
  };

  const menuItems: MenuProps["items"] = secondaryTabs.map((tab) => ({
    key: tab.key,
    label: tab.label,
  }));

  return (
    <div>
      <Typography.Title level={3}>{course.name}</Typography.Title>
      <Typography.Text type="secondary">{course.subjectName}</Typography.Text>
      <Card style={{ marginTop: 16 }}>
        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          items={items}
          tabBarExtraContent={
            secondaryTabs.length > 0 ? (
              <Dropdown
                menu={{ items: menuItems, onClick: ({ key }) => openSecondary(key) }}
                trigger={["click"]}
              >
                <Button>
                  <Space>
                    Khác
                    <DownOutlined />
                  </Space>
                </Button>
              </Dropdown>
            ) : undefined
          }
        />
      </Card>
    </div>
  );
}
