import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Skeleton,
  Space,
  Statistic,
  Table,
  Typography,
  message,
} from "antd";
import { CopyOutlined, ReloadOutlined, TeamOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { ForbiddenError } from "../../../../shared/api/client";
import { useCourseStudents, type StudentEmailView } from "../api/courses.api";

interface CourseStudentsTabProps {
  courseId: string;
}

/** Lọc roster client-side theo username hoặc email (không phân biệt hoa thường). */
export function filterStudents(
  students: StudentEmailView[],
  query: string
): StudentEmailView[] {
  const q = query.trim().toLowerCase();
  if (!q) return students;
  return students.filter(
    (s) =>
      s.username.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
  );
}

/** Chuỗi email để copy: unique, giữ thứ tự, nối bằng ", ". */
export function buildEmailList(students: StudentEmailView[]): string {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const s of students) {
    const email = s.email?.trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails.join(", ");
}

const columns: ColumnsType<StudentEmailView> = [
  { title: "Học viên", dataIndex: "username", key: "username" },
  { title: "Email", dataIndex: "email", key: "email" },
  {
    title: "User ID",
    dataIndex: "userId",
    key: "userId",
    render: (id: string) => (
      <Typography.Text type="secondary" copyable ellipsis style={{ maxWidth: 160 }}>
        {id}
      </Typography.Text>
    ),
  },
];

export function CourseStudentsTab({ courseId }: CourseStudentsTabProps) {
  const { data, isLoading, isError, error, refetch } = useCourseStudents(courseId);
  const [search, setSearch] = useState("");

  const students = data?.students ?? [];
  const filtered = useMemo(() => filterStudents(students, search), [students, search]);

  const handleCopyEmails = async () => {
    const list = buildEmailList(filtered);
    if (!list) {
      message.info("Không có email để copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(list);
      message.success(`Đã copy ${filtered.length} email`);
    } catch {
      message.error("Trình duyệt chặn clipboard, không copy được");
    }
  };

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  if (isError) {
    const forbidden = error instanceof ForbiddenError;
    return (
      <Alert
        type={forbidden ? "warning" : "error"}
        showIcon
        message={forbidden ? "Không đủ quyền" : "Không thể tải danh sách học viên"}
        description={forbidden ? "Bạn không có quyền xem học viên." : error?.message}
        action={
          forbidden ? undefined : (
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Thử lại
            </Button>
          )
        }
      />
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Card size="small">
        <Statistic
          title="Tổng học viên"
          value={data?.totalStudents ?? students.length}
          prefix={<TeamOutlined />}
        />
      </Card>

      <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
        <Input.Search
          allowClear
          placeholder="Tìm theo tên hoặc email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <Button
          icon={<CopyOutlined />}
          onClick={handleCopyEmails}
          disabled={filtered.length === 0}
        >
          Copy email ({filtered.length})
        </Button>
      </Space>

      <Table<StudentEmailView>
        rowKey="userId"
        columns={columns}
        dataSource={filtered}
        size="small"
        locale={{ emptyText: <Empty description="Chưa có học viên nào" /> }}
        pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
      />
    </Space>
  );
}
