import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Empty, Skeleton, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";
import dayjs from "dayjs";
import { useMyCourseScopes, useTeachingCourses } from "../api/courseScopes";
import type { TeachingCourse } from "../shared/types";

interface CourseRow extends TeachingCourse {
  key: string;
  scopeExpiresAt: string;
}

/**
 * MyCourses: khoá caller SỞ HỮU (`/courses/teaching`) giao với COURSE-scope grant còn hiệu lực.
 * Chỉ hiện khoá vừa sở hữu vừa còn scope → không lộ khoá ngoài quyền. Nút "Mở" điều hướng nội bộ
 * sang chi tiết (ScopeGuard COURSE gác lần nữa ở trang chi tiết).
 */
export default function MyCoursesPage() {
  const { scopes, isLoading: scopesLoading } = useMyCourseScopes();
  const { data: courses, isLoading, isError, error } = useTeachingCourses();
  const navigate = useNavigate();

  const rows = useMemo<CourseRow[]>(() => {
    const expiryByScope = new Map(scopes.map((s) => [s.scopeId, s.expiresAt]));
    return (courses ?? [])
      .filter((c) => expiryByScope.has(c.id))
      .map((c) => ({ ...c, key: c.id, scopeExpiresAt: expiryByScope.get(c.id) ?? "" }));
  }, [courses, scopes]);

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
      title: "Hạn scope",
      dataIndex: "scopeExpiresAt",
      key: "scopeExpiresAt",
      render: (expiresAt: string) => {
        if (!expiresAt) return <Typography.Text type="secondary">—</Typography.Text>;
        const daysLeft = dayjs(expiresAt).diff(dayjs(), "day");
        return daysLeft < 7 ? (
          <Tag color="orange">Hết hạn sau {daysLeft} ngày</Tag>
        ) : (
          <Typography.Text type="secondary">{dayjs(expiresAt).format("DD/MM/YYYY")}</Typography.Text>
        );
      },
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

  if (scopesLoading || isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;

  if (isError) {
    return <Alert type="error" message="Không thể tải danh sách khoá" description={error?.message} showIcon />;
  }

  return (
    <div>
      <Typography.Title level={3}>Khoá của tôi</Typography.Title>
      <Card>
        {rows.length === 0 ? (
          <Empty description="Bạn chưa phụ trách khoá nào còn hiệu lực" />
        ) : (
          <Table<CourseRow> columns={columns} dataSource={rows} pagination={{ pageSize: 20 }} />
        )}
      </Card>
    </div>
  );
}
