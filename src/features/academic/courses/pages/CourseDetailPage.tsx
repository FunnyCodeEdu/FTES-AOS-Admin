import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Skeleton, Tabs, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useMe } from "../../../auth/api";
import { hasAnyPermission } from "../../../../shared/permissions";
import { useCourse } from "../api/courses.api";
import { CourseInfoTab } from "../components/CourseInfoTab";
import { PricingTab } from "../components/PricingTab";
import { LessonListTab } from "../../lessons/components/LessonListTab";
import { CoursePreviewDefaultConfig } from "../../lessons/components/CoursePreviewDefaultConfig";
import { CourseStudentsTab } from "../components/CourseStudentsTab";
import { CourseSkillExpTab } from "../components/CourseSkillExpTab";
import { CourseChallengeBankTab } from "../../challenge-bank/components/CourseChallengeBankTab";
import { CourseSkillsTab } from "../../course-skills/components/CourseSkillsTab";

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: course, isLoading, isError, error, refetch } = useCourse(id);
  const { data: me } = useMe();
  const canUpdate = me ? hasAnyPermission(new Set(me.permissions), ["course.manage"]) : false;
  const canPublish = me ? hasAnyPermission(new Set(me.permissions), ["course.publish"]) : false;
  // Kho challenge mở cho challenge.manage HOẶC course.manage (moderator chỉ có challenge.manage vẫn quản được).
  const canManageChallenge = me
    ? hasAnyPermission(new Set(me.permissions), ["challenge.manage", "course.manage"])
    : false;
  // Kỹ năng nghề nghiệp của khoá: GHI cần `career.manage`. SUPER_ADMIN bypass ở BE nhưng KHÔNG có
  // leaf tường minh trong `me.permissions` (xem docblock `Can`) nên phải xét cờ riêng, kẻo chính họ
  // là người duy nhất không thấy tab. Admin chỉ có `course.manage` vẫn vào XEM được (chỉ đọc).
  const canManageSkills = me
    ? me.superAdmin === true || hasAnyPermission(new Set(me.permissions), ["career.manage"])
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
        children: <CourseInfoTab course={course} readOnly={readOnly} canPublish={canPublish} canEditSubject />,
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
        key: "challenges",
        label: "Kho challenge",
        children: <CourseChallengeBankTab course={course} canManage={canManageChallenge} />,
        visible: canManageChallenge,
      },
      {
        key: "skills",
        label: "Kỹ năng",
        children: <CourseSkillsTab courseId={course.id} canManage={canManageSkills} />,
        visible: canManageSkills || canUpdate,
      },
      {
        key: "preview",
        label: "Học thử",
        children: <CoursePreviewDefaultConfig courseId={course.id} />,
        visible: true,
      },
      {
        // EXP kỹ năng: cấu hình khoá này cộng bao nhiêu EXP cho từng nhóm kỹ năng (AI chấm từ
        // syllabus + sửa tay). Cấu hình phần thưởng của khoá ⇒ gác đúng leaf quản lý khoá
        // (`course.manage`) như tab "Học viên".
        key: "skill-exp",
        label: "EXP kỹ năng",
        children: <CourseSkillExpTab courseId={course.id} />,
        visible: canUpdate,
      },
      {
        // Tab Học viên chứa email (PII) — chỉ hiển thị khi có quyền quản lý course.
        key: "students",
        label: "Học viên",
        children: <CourseStudentsTab courseId={course.id} saleMode={course.saleMode} />,
        visible: canUpdate,
      },
    ].filter((tab) => tab.visible);
  }, [course, readOnly, canPublish, canUpdate, canManageChallenge, canManageSkills]);

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
