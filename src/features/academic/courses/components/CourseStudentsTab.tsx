import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  ReloadOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { ForbiddenError } from "../../../../shared/api/client";
import { Can } from "../../../../shared/permissions";
import { DeleteConfirmModal } from "../../../../shared/components/DeleteConfirmModal";
import {
  useBulkEnrollByUsername,
  useCourseStudents,
  useRemoveCourseStudent,
  type BulkEnrollResult,
  type StudentEmailView,
} from "../api/courses.api";

/** Tách chuỗi username phân tách bằng dấu phẩy (hoặc xuống dòng) → mảng đã trim, bỏ rỗng/trùng. */
export function parseUsernames(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const u = part.trim();
    if (!u || seen.has(u.toLowerCase())) continue;
    seen.add(u.toLowerCase());
    out.push(u);
  }
  return out;
}

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

/** Mảng email unique, giữ thứ tự (bỏ email rỗng/trùng). Nguồn chân lý cho cả chuỗi copy lẫn ĐẾM. */
export function buildEmailArray(students: StudentEmailView[]): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const s of students) {
    const email = s.email?.trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

/** Chuỗi email để copy: unique, giữ thứ tự, nối bằng ", ". */
export function buildEmailList(students: StudentEmailView[]): string {
  return buildEmailArray(students).join(", ");
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
  // Học viên đang chờ xác nhận xoá khỏi khoá (mở DeleteConfirmModal). null = đóng.
  const [removing, setRemoving] = useState<StudentEmailView | null>(null);
  const removeStudent = useRemoveCourseStudent(courseId);
  // Modal thêm học viên hàng loạt theo username (phân tách dấu phẩy).
  const [addOpen, setAddOpen] = useState(false);
  const [usernamesInput, setUsernamesInput] = useState("");
  const [bulkResult, setBulkResult] = useState<BulkEnrollResult | null>(null);
  const bulkEnroll = useBulkEnrollByUsername(courseId);
  const parsedUsernames = useMemo(() => parseUsernames(usernamesInput), [usernamesInput]);

  const handleBulkEnroll = () => {
    if (parsedUsernames.length === 0) {
      message.info("Nhập ít nhất một username");
      return;
    }
    bulkEnroll.mutate(parsedUsernames, {
      onSuccess: (res) => {
        setBulkResult(res);
        if (res.added.length > 0) message.success(`Đã thêm ${res.added.length} học viên`);
      },
      onError: (err: Error) => message.error(err.message || "Thêm học viên thất bại"),
    });
  };

  const closeAdd = () => {
    setAddOpen(false);
    setUsernamesInput("");
    setBulkResult(null);
  };

  const confirmRemove = (reason: string) => {
    if (!removing) return;
    removeStudent.mutate(
      { userId: removing.userId, reason },
      {
        onSuccess: () => {
          message.success(`Đã xoá ${removing.username || removing.email} khỏi khoá`);
          setRemoving(null);
        },
        onError: (err: Error) => message.error(err.message || "Xoá học viên thất bại"),
      }
    );
  };

  // Cột thao tác chỉ render khi có quyền quản khoá (BE cũng gác admin.course.manage). Ghép vào sau
  // các cột thông tin (const `columns` ở module) để giữ chúng thuần dữ liệu.
  const tableColumns: ColumnsType<StudentEmailView> = [
    ...columns,
    {
      title: "Thao tác",
      key: "actions",
      width: 140,
      render: (_: unknown, record: StudentEmailView) => (
        <Can permissions={["course.manage"]}>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => setRemoving(record)}
          >
            Xoá khỏi khoá
          </Button>
        </Can>
      ),
    },
  ];

  const students = data?.students ?? [];
  const filtered = useMemo(() => filterStudents(students, search), [students, search]);
  // Số email THỰC sau dedupe (email trùng/rỗng bị loại) — dùng cho cả nhãn nút lẫn toast,
  // tránh lệch với filtered.length (số dòng roster).
  const emails = useMemo(() => buildEmailArray(filtered), [filtered]);

  const handleCopyEmails = async () => {
    if (emails.length === 0) {
      message.info("Không có email để copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      message.success(`Đã copy ${emails.length} email`);
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
        <Space wrap>
          <Can permissions={["course.manage"]}>
            <Button
              type="primary"
              icon={<UsergroupAddOutlined />}
              onClick={() => setAddOpen(true)}
            >
              Thêm học viên
            </Button>
          </Can>
          <Button
            icon={<CopyOutlined />}
            onClick={handleCopyEmails}
            disabled={emails.length === 0}
          >
            Copy email ({emails.length})
          </Button>
        </Space>
      </Space>

      <Table<StudentEmailView>
        rowKey="userId"
        columns={tableColumns}
        dataSource={filtered}
        size="small"
        locale={{ emptyText: <Empty description="Chưa có học viên nào" /> }}
        pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
      />

      <Modal
        open={addOpen}
        title="Thêm học viên vào khoá"
        onCancel={closeAdd}
        footer={[
          <Button key="close" onClick={closeAdd}>
            Đóng
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={bulkEnroll.isPending}
            disabled={parsedUsernames.length === 0}
            onClick={handleBulkEnroll}
          >
            Thêm {parsedUsernames.length > 0 ? `${parsedUsernames.length} học viên` : "học viên"}
          </Button>,
        ]}
      >
        <Typography.Paragraph type="secondary">
          Dán danh sách <strong>username</strong>, mỗi username cách nhau bằng dấu phẩy (hoặc xuống
          dòng). Username không có tài khoản sẽ được liệt kê để bạn kiểm lại.
        </Typography.Paragraph>
        <Input.TextArea
          rows={5}
          placeholder="vd: minh_dev, an.nguyen, tuanpham"
          value={usernamesInput}
          onChange={(e) => setUsernamesInput(e.target.value)}
        />
        {parsedUsernames.length > 0 ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {parsedUsernames.length} username hợp lệ (đã bỏ trùng/rỗng).
          </Typography.Text>
        ) : null}

        {bulkResult ? (
          <div style={{ marginTop: 16 }}>
            {bulkResult.added.length > 0 ? (
              <Alert
                type="success"
                showIcon
                style={{ marginBottom: 8 }}
                message={`Đã thêm ${bulkResult.added.length} học viên`}
                description={
                  <Space size={[4, 4]} wrap>
                    {bulkResult.added.map((u) => (
                      <Tag key={u} color="green">
                        {u}
                      </Tag>
                    ))}
                  </Space>
                }
              />
            ) : null}
            {bulkResult.notFound.length > 0 ? (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 8 }}
                message={`Không tìm thấy tài khoản (${bulkResult.notFound.length})`}
                description={
                  <Space size={[4, 4]} wrap>
                    {bulkResult.notFound.map((u) => (
                      <Tag key={u}>{u}</Tag>
                    ))}
                  </Space>
                }
              />
            ) : null}
            {bulkResult.failed.length > 0 ? (
              <Alert
                type="error"
                showIcon
                message={`Lỗi (${bulkResult.failed.length})`}
                description={
                  <Space direction="vertical" size={2} style={{ width: "100%" }}>
                    {bulkResult.failed.map((f) => (
                      <Typography.Text key={f.username}>
                        <strong>{f.username}</strong>: {f.message}
                      </Typography.Text>
                    ))}
                  </Space>
                }
              />
            ) : null}
          </div>
        ) : null}
      </Modal>

      <DeleteConfirmModal
        open={!!removing}
        title="Xoá học viên khỏi khoá"
        description={
          <>
            Gỡ <strong>{removing?.username || removing?.email}</strong> khỏi khoá học — thu hồi quyền
            truy cập của họ. Có thể cấp lại sau. Nhập lý do để ghi nhật ký.
          </>
        }
        loading={removeStudent.isPending}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </Space>
  );
}
