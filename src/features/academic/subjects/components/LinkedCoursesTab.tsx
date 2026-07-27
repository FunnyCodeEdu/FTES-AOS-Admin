import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Modal,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { LinkOutlined, MinusCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import type { SubjectDetail } from "../../types";
import { useCourses } from "../../courses/api/courses.api";
import {
  COURSE_LINK_TAB,
  COURSE_LINK_TARGET_TYPE,
  useAddSubjectLink,
  useRemoveSubjectLink,
  useSubjectLinks,
  type WorkspaceLinkView,
} from "../api/subjects.api";

interface LinkedCoursesTabProps {
  subject: SubjectDetail;
}

/**
 * Khoá học liên kết với môn (workplace). Một MÔN ↔ NHIỀU KHOÁ:
 *   GET/POST/DELETE /api/v1/subjects/{code}/links (WorkspaceController) — mỗi khoá là một link
 *   { tab:'LEARNING', targetType:'course.course', targetId: courseId }. Đây là dữ liệu để trang
 *   Learn suy ra subjectCode của một khoá qua target_type='course.course'.
 *
 * Nguồn khoá cho picker: useCourses (GraphQL adminCourses) — lấy 1 trang lớn rồi tìm client-side,
 * đồng bộ cách PrerequisitesTab lấy danh sách môn. Tên khoá dùng để (a) hiển thị link đã có,
 * (b) set titleOverride khi thêm để BE trả title đọc được.
 *
 * Gate mutating controls bằng subject.manage — khớp StaffTab/PrerequisitesTab (BE requireCurate cũng
 * chấp nhận subject.manage global; scoped subject.link.curate / membership do BE tự xử, admin console
 * là permission-driven global).
 */
export function LinkedCoursesTab({ subject }: LinkedCoursesTabProps) {
  const {
    data: links,
    isLoading,
    isError,
    error,
    refetch,
  } = useSubjectLinks(subject.code);
  // 1 trang lớn để vừa làm option picker vừa map targetId → tên khoá (giống PrerequisitesTab).
  const { data: coursesData, isLoading: coursesLoading } = useCourses({ page: 1, pageSize: 1000 });
  const add = useAddSubjectLink(subject);
  const remove = useRemoveSubjectLink(subject);
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>();

  const courseLinks = useMemo(
    () => (links ?? []).filter((l) => l.targetType === COURSE_LINK_TARGET_TYPE),
    [links]
  );

  const courseNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of coursesData?.items ?? []) map.set(c.id, c.name);
    return map;
  }, [coursesData]);

  const linkedCourseIds = useMemo(
    () => new Set(courseLinks.map((l) => l.targetId)),
    [courseLinks]
  );

  // Chỉ hiện khoá CHƯA liên kết trong picker (tránh trùng — BE cũng chặn SUBJECT_LINK_DUPLICATE).
  const options = useMemo(
    () =>
      (coursesData?.items ?? [])
        .filter((c) => !linkedCourseIds.has(c.id))
        .map((c) => ({ value: c.id, label: c.name })),
    [coursesData, linkedCourseIds]
  );

  const handleAdd = () => {
    if (!selectedCourseId) return;
    if (linkedCourseIds.has(selectedCourseId)) {
      message.warning("Khoá học này đã được liên kết với môn");
      return;
    }
    const name = courseNameById.get(selectedCourseId);
    add.mutate(
      {
        tab: COURSE_LINK_TAB,
        targetType: COURSE_LINK_TARGET_TYPE,
        targetId: selectedCourseId,
        // titleOverride = tên khoá để LinkView.title đọc được (BE trả title = titleOverride).
        ...(name ? { titleOverride: name } : {}),
      },
      {
        onSuccess: () => {
          message.success("Đã liên kết khoá học");
          setSelectedCourseId(undefined);
        },
        // onError chung đã có notification (handleAdminMutationError) trong hook.
      }
    );
  };

  const handleRemove = (record: WorkspaceLinkView) => {
    const label = record.title || courseNameById.get(record.targetId) || record.targetId;
    Modal.confirm({
      title: "Gỡ liên kết khoá học",
      content: (
        <>
          Gỡ liên kết khoá <strong>{label}</strong> khỏi môn <strong>{subject.name}</strong>? Khoá
          học không bị xoá, chỉ gỡ liên kết workplace.
        </>
      ),
      okText: "Gỡ",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => {
        remove.mutate(record.id, {
          onSuccess: () => message.success("Đã gỡ liên kết"),
        });
      },
    });
  };

  const columns = [
    {
      title: "Khoá học",
      key: "course",
      render: (_: unknown, record: WorkspaceLinkView) =>
        record.title || courseNameById.get(record.targetId) || record.targetId,
    },
    {
      title: "Course ID",
      dataIndex: "targetId",
      render: (v: string) => (
        <Typography.Text type="secondary" code copyable>
          {v}
        </Typography.Text>
      ),
    },
    {
      title: "Tab",
      dataIndex: "tab",
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: WorkspaceLinkView) => (
        <Can permissions={["subject.manage"]}>
          <Button
            icon={<MinusCircleOutlined />}
            danger
            size="small"
            loading={remove.isPending}
            onClick={() => handleRemove(record)}
          >
            Gỡ liên kết
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
        Một môn có thể liên kết nhiều khoá học. Khoá học liên kết ở đây là nguồn để trang học suy ra
        môn (workplace) của khoá.
      </Typography.Paragraph>
      {isError && (
        <Alert
          type="error"
          message="Không thể tải danh sách khoá học liên kết"
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
          <Select
            showSearch
            allowClear
            loading={coursesLoading}
            options={options}
            value={selectedCourseId}
            onChange={(v) => setSelectedCourseId(v)}
            optionFilterProp="label"
            style={{ width: 360 }}
            placeholder="Tìm và chọn khoá học để liên kết"
            notFoundContent={coursesLoading ? "Đang tải..." : "Không còn khoá học để liên kết"}
          />
          <Button
            type="primary"
            icon={<LinkOutlined />}
            disabled={!selectedCourseId}
            loading={add.isPending}
            onClick={handleAdd}
          >
            Liên kết
          </Button>
        </Space>
      </Can>

      <Typography.Text strong>Khoá học đã liên kết ({courseLinks.length})</Typography.Text>
      {courseLinks.length === 0 ? (
        <Empty
          style={{ marginTop: 16 }}
          description="Chưa có khoá học nào được liên kết với môn này"
        />
      ) : (
        <Table
          rowKey="id"
          dataSource={courseLinks}
          columns={columns}
          pagination={false}
          size="small"
          style={{ marginTop: 8 }}
        />
      )}
    </div>
  );
}
