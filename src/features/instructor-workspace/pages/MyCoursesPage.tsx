import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, App, Button, Card, Empty, Popconfirm, Skeleton, Space, Table, Tag, Tooltip, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { useTeachingCourses, useSubmitCourseForReview } from "../api/courseScopes";
import { useCreateCourse } from "../../academic/courses/api/courses.api";
import { CourseFormModal } from "../../academic/courses/components/CourseFormModal";
import type { CourseFormValues } from "../../academic/types";
import type { TeachingCourse } from "../shared/types";

/** Nhãn + màu cho trạng thái khoá, gồm cả PENDING_REVIEW của luồng duyệt. */
const STATUS_META: Record<string, { label: string; color?: string }> = {
  DRAFT: { label: "Nháp" },
  PENDING_REVIEW: { label: "Chờ duyệt", color: "gold" },
  PUBLISHED: { label: "Đã publish", color: "green" },
  INACTIVE: { label: "Đã gỡ xuống", color: "orange" },
  ARCHIVED: { label: "Lưu trữ" },
};

interface CourseRow extends TeachingCourse {
  key: string;
}

/**
 * MyCourses: khoá caller SỞ HỮU (`/courses/teaching`, owner ép theo JWT ở BE). Key off OWNERSHIP —
 * KHÔNG còn giao với COURSE-scope grant (owner thuần không có grant vẫn thấy khoá của mình). Nút "Mở"
 * điều hướng sang chi tiết (GET /courses/{id}/manage tự gác owner-authz ở BE).
 */
export default function MyCoursesPage() {
  const { data: courses, isLoading, isError, error } = useTeachingCourses();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [formOpen, setFormOpen] = useState(false);
  const createCourse = useCreateCourse();
  const submitReview = useSubmitCourseForReview();

  const rows = useMemo<CourseRow[]>(
    () => (courses ?? []).map((c) => ({ ...c, key: c.id })),
    [courses]
  );

  const columns: TableProps<CourseRow>["columns"] = [
    {
      title: "Tên khoá",
      dataIndex: "title",
      key: "title",
      render: (title: string, r) => (
        <div>
          <Typography.Text strong>{title}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{r.courseCode}</Typography.Text>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string, r) => {
        const meta = STATUS_META[status] ?? { label: status };
        const tag = <Tag color={meta.color}>{meta.label}</Tag>;
        // Khoá bị trả lại PHẢI hiện lý do ngay cạnh trạng thái. Không hiện thì giảng viên chỉ thấy
        // khoá quay về nháp mà không biết vì sao, và sẽ gửi lại y nguyên.
        return r.reviewNote ? (
          <Tooltip title={r.reviewNote}>
            <Space size={4}>
              {tag}
              <Typography.Text type="danger" style={{ fontSize: 12 }}>
                bị trả lại
              </Typography.Text>
            </Space>
          </Tooltip>
        ) : (
          tag
        );
      },
    },
    {
      title: "Học viên",
      dataIndex: "totalUser",
      key: "totalUser",
    },
    {
      title: "Hành động",
      key: "action",
      render: (_, r) => (
        <Space size={0}>
          <Button type="link" onClick={() => navigate(`/instructor/courses/${r.id}`)}>
            Mở
          </Button>
          {/* Gửi duyệt CHỈ hiện ở khoá nháp — BE cũng chỉ nhận từ DRAFT, hiện nút ở trạng thái khác
              là mời người dùng bấm để nhận lỗi. */}
          {r.status === "DRAFT" && (
            <Popconfirm
              title="Gửi khoá này cho admin duyệt?"
              description="Sau khi gửi, khoá chuyển sang Chờ duyệt và bạn không sửa trạng thái được nữa."
              okText="Gửi duyệt"
              cancelText="Huỷ"
              onConfirm={() =>
                submitReview.mutate(r.id, {
                  onSuccess: () => message.success("Đã gửi khoá cho admin duyệt"),
                  onError: (e) => message.error(e.message || "Gửi duyệt thất bại"),
                })
              }
            >
              <Button type="link" loading={submitReview.isPending}>
                Gửi duyệt
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;

  if (isError) {
    return <Alert type="error" message="Không thể tải danh sách khoá" description={error?.message} showIcon />;
  }

  const handleCreate = (values: CourseFormValues) => {
    createCourse.mutate(values, {
      onSuccess: () => {
        message.success("Đã tạo khoá ở trạng thái nháp — soạn xong thì bấm Gửi duyệt");
        setFormOpen(false);
      },
      onError: (e) => message.error(e.message || "Tạo khoá thất bại"),
    });
  };

  return (
    <div>
      <Space align="center" style={{ width: "100%", justifyContent: "space-between", marginBottom: 8 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Khoá của tôi
        </Typography.Title>
        {/* course-review-workflow: lối tạo khoá cho giảng viên. Trước đây nút "Tạo khoá học" CHỈ nằm
            ở /academic/courses — route gác `admin.course.read`, mà LECTURER không có quyền admin.*
            nào, nên giảng viên không có đường nào tạo khoá. */}
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
          Tạo khoá học
        </Button>
      </Space>
      <Card>
        {rows.length === 0 ? (
          <Empty description="Bạn chưa phụ trách khoá nào" />
        ) : (
          <Table<CourseRow> columns={columns} dataSource={rows} pagination={{ pageSize: 20 }} />
        )}
      </Card>

      <CourseFormModal
        open={formOpen}
        course={null}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={createCourse.isPending}
      />
    </div>
  );
}
