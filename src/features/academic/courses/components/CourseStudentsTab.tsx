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
import type { CourseType } from "../../types";
import { ForbiddenError } from "../../../../shared/api/client";
import { Can } from "../../../../shared/permissions";
import { useIsMobile } from "../../../../shared/hooks/useIsMobile";
import { DeleteConfirmModal } from "../../../../shared/components/DeleteConfirmModal";
import {
  useCourseStudents,
  useRemoveCourseStudent,
  type StudentEmailView,
} from "../api/courses.api";
import { useBulkEnrollPanel } from "./bulkEnroll";

interface CourseStudentsTabProps {
  courseId: string;
  /** Cách bán của khoá — khoá PACKAGE phải chọn gói khi thêm học viên (quyền nằm ở gói, không ở enrollment). */
  saleMode?: CourseType;
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

export function CourseStudentsTab({ courseId, saleMode }: CourseStudentsTabProps) {
  const { data, isLoading, isError, error, refetch } = useCourseStudents(courseId);
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  // Học viên đang chờ xác nhận xoá khỏi khoá (mở DeleteConfirmModal). null = đóng.
  const [removing, setRemoving] = useState<StudentEmailView | null>(null);
  const removeStudent = useRemoveCourseStudent(courseId);
  // Modal thêm học viên hàng loạt theo username — dùng chung cụm với nút "Cấp học viên" ở danh
  // sách khoá (một hành vi duy nhất: hỏng một username không làm hỏng cả danh sách).
  const [addOpen, setAddOpen] = useState(false);
  const bulkPanel = useBulkEnrollPanel(courseId, saleMode);
  const closeAdd = () => {
    setAddOpen(false);
    bulkPanel.reset();
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
    // Điện thoại: bỏ cột User ID (uuid dài, không đọc bằng mắt) để chừa chỗ cho tên + email + nút.
    ...(isMobile ? columns.filter((c) => c.key !== "userId") : columns),
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
          style={{ width: isMobile ? "100%" : 320, maxWidth: 320 }}
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
        scroll={{ x: "max-content" }}
        locale={{ emptyText: <Empty description="Chưa có học viên nào" /> }}
        pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
      />

      <Modal
        open={addOpen}
        title="Thêm học viên vào khoá"
        onCancel={closeAdd}
        destroyOnClose
        // Dán danh sách username trên điện thoại: modal 520px mặc định để lại hai mép trống mà ô dán
        // thì chật — cho tràn gần hết bề ngang và đẩy lên sát mép trên cho bàn phím có chỗ.
        width={isMobile ? "96vw" : undefined}
        style={isMobile ? { top: 8, maxWidth: "96vw", padding: 0 } : undefined}
        footer={[
          <Button key="close" onClick={closeAdd}>
            Đóng
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={bulkPanel.isPending}
            disabled={bulkPanel.disabled}
            onClick={() => bulkPanel.submit(() => setAddOpen(false))}
          >
            Thêm {bulkPanel.count > 0 ? `${bulkPanel.count} học viên` : "học viên"}
          </Button>,
        ]}
      >
        {bulkPanel.node}
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
