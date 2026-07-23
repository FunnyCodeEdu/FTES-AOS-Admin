import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Empty, Skeleton, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";
import { useTeachingCourses } from "../api/courseScopes";
import type { TeachingCourse } from "../shared/types";

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
      render: (status: string) => <Tag>{status}</Tag>,
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
        <Button type="link" onClick={() => navigate(`/instructor/courses/${r.id}`)}>
          Mở
        </Button>
      ),
    },
  ];

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;

  if (isError) {
    return <Alert type="error" message="Không thể tải danh sách khoá" description={error?.message} showIcon />;
  }

  return (
    <div>
      <Typography.Title level={3}>Khoá của tôi</Typography.Title>
      <Card>
        {rows.length === 0 ? (
          <Empty description="Bạn chưa phụ trách khoá nào" />
        ) : (
          <Table<CourseRow> columns={columns} dataSource={rows} pagination={{ pageSize: 20 }} />
        )}
      </Card>
    </div>
  );
}
