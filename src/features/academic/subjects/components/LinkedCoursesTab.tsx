import { useMemo, useState } from "react";
import { Alert, Button, Modal, Skeleton, Space, Table, Typography, message } from "antd";
import { LinkOutlined, MinusCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import { CourseSelect } from "../../components/CourseSelect";
import { useCourses } from "../../courses/api/courses.api";
import type { SubjectDetail } from "../../types";
import {
  COURSE_TARGET_TYPE,
  useCreateSubjectLink,
  useDeleteSubjectLink,
  useSubjectLinks,
  type WorkspaceLinkView,
} from "../api/subjects.api";

interface LinkedCoursesTabProps {
  subject: SubjectDetail;
}

/**
 * Khoá học liên kết vào workplace của môn (learn page hiện bộ công cụ môn của khoá khi tồn tại
 * link này). Link = row `target_type='course.course'`, `target_id=courseId`, tab LEARNING trên
 * `subject.workspace_links`. Một môn có thể liên kết NHIỀU khoá (1 môn → N khoá).
 *
 * Đọc/ghi qua `coreClient` theo subject CODE (endpoint /api/v1/subjects/{code}/links, KHÔNG /admin).
 * `LinkView.title` của BE chỉ là titleOverride (không resolve tên khoá) → tab resolve tên khoá từ
 * danh sách khoá admin (`useCourses`). GET link public nên danh sách vẫn XEM được khi thiếu quyền;
 * thêm/gỡ gate `subject.manage` (đồng nhất các tab quản lý môn khác). Gỡ có confirm.
 */
export function LinkedCoursesTab({ subject }: LinkedCoursesTabProps) {
  const { data: links, isLoading, isError, error, refetch } = useSubjectLinks(subject.code);
  const { data: courseList, isLoading: coursesLoading } = useCourses({ page: 1, pageSize: 1000 });
  const createLink = useCreateSubjectLink(subject);
  const deleteLink = useDeleteSubjectLink(subject);
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>();

  // targetId (courseId) → tên khoá, resolve từ danh sách khoá admin.
  const courseNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courseList?.items ?? []) map.set(c.id, c.name);
    return map;
  }, [courseList]);

  const courseLinks = useMemo(
    () => (links ?? []).filter((l) => l.targetType === COURSE_TARGET_TYPE),
    [links]
  );

  const linkedCourseIds = useMemo(
    () => new Set(courseLinks.map((l) => l.targetId)),
    [courseLinks]
  );

  const courseTitle = (link: WorkspaceLinkView): string =>
    courseNameById.get(link.targetId) ?? link.title ?? `Khoá ${link.targetId.slice(0, 8)}…`;

  const handleAdd = () => {
    if (!selectedCourseId) return;
    if (linkedCourseIds.has(selectedCourseId)) {
      message.warning("Khoá học này đã được liên kết vào môn");
      return;
    }
    createLink.mutate(
      { courseId: selectedCourseId },
      {
        onSuccess: () => {
          message.success("Đã liên kết khoá học vào môn");
          setSelectedCourseId(undefined);
        },
      }
    );
  };

  const handleRemove = (link: WorkspaceLinkView) => {
    Modal.confirm({
      title: "Gỡ liên kết khoá học",
      content: (
        <>
          Gỡ liên kết khoá <strong>{courseTitle(link)}</strong> khỏi môn{" "}
          <strong>{subject.name}</strong>? Trang học của khoá sẽ không còn hiện bộ công cụ của môn
          này (Ôn tập / Hỏi đáp / workplace).
        </>
      ),
      okText: "Gỡ liên kết",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => {
        deleteLink.mutate(
          { linkId: link.id },
          { onSuccess: () => message.success("Đã gỡ liên kết khoá học") }
        );
      },
    });
  };

  const columns = [
    {
      title: "Khoá học",
      key: "course",
      render: (_: unknown, link: WorkspaceLinkView) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{courseTitle(link)}</Typography.Text>
          <Typography.Text type="secondary" copyable style={{ fontSize: 12 }}>
            {link.targetId}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 140,
      render: (_: unknown, link: WorkspaceLinkView) => (
        <Can permissions={["subject.manage"]}>
          <Button
            icon={<MinusCircleOutlined />}
            danger
            size="small"
            loading={deleteLink.isPending}
            onClick={() => handleRemove(link)}
          >
            Gỡ
          </Button>
        </Can>
      ),
    },
  ];

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  return (
    <div>
      <Typography.Title level={5}>Khoá học liên kết</Typography.Title>
      <Typography.Paragraph type="secondary">
        Liên kết khoá học vào workplace của môn để trang học của khoá hiện bộ công cụ môn (Ôn tập /
        Hỏi đáp / workplace). Một môn có thể liên kết nhiều khoá.
      </Typography.Paragraph>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải danh sách khoá liên kết"
          description={error?.message}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => refetch()}>
              Thử lại
            </Button>
          }
        />
      )}

      <Can permissions={["subject.manage"]}>
        <Space style={{ marginBottom: 16 }} wrap>
          <CourseSelect
            value={selectedCourseId}
            onChange={setSelectedCourseId}
            loading={coursesLoading}
            style={{ minWidth: 320 }}
          />
          <Button
            type="primary"
            icon={<LinkOutlined />}
            loading={createLink.isPending}
            disabled={!selectedCourseId}
            onClick={handleAdd}
          >
            Liên kết
          </Button>
        </Space>
      </Can>

      <Typography.Text strong>Khoá đã liên kết ({courseLinks.length})</Typography.Text>
      <Table
        rowKey="id"
        dataSource={courseLinks}
        columns={columns}
        pagination={false}
        size="small"
        loading={coursesLoading}
        locale={{ emptyText: "Chưa có khoá học nào được liên kết vào môn này" }}
        style={{ marginTop: 8 }}
      />
    </div>
  );
}
