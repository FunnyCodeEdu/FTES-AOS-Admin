import { Button, Space, Table, Tag } from "antd";
import { EditOutlined, EyeOutlined, UsergroupAddOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Link } from "react-router-dom";
import { Can } from "../../../../shared/permissions";
import type { Course, CourseStatus } from "../../types";

interface CourseTableProps {
  data: Course[];
  loading?: boolean;
  pagination: TableProps<Course>["pagination"];
  onChange: TableProps<Course>["onChange"];
  onEdit: (course: Course) => void;
  onGrant: (course: Course) => void;
}

const statusLabels: Record<CourseStatus, { text: string; color: string }> = {
  draft: { text: "Nháp", color: "default" },
  review: { text: "Chờ duyệt", color: "orange" },
  published: { text: "Đã publish", color: "green" },
  archived: { text: "Lưu trữ", color: "gray" },
};

export function CourseTable({ data, loading, pagination, onChange, onEdit, onGrant }: CourseTableProps) {
  const columns: TableProps<Course>["columns"] = [
    { title: "Tên khoá học", dataIndex: "name", sorter: true },
    { title: "Môn học", dataIndex: "subjectName" },
    {
      title: "Trạng thái",
      dataIndex: "workflowStatus",
      render: (status: CourseStatus) => {
        const entry =
          statusLabels[status] ??
          statusLabels[status?.toLowerCase?.() as CourseStatus] ??
          { text: String(status ?? ""), color: "default" };
        return <Tag color={entry.color}>{entry.text}</Tag>;
      },
    },
    { title: "Giá", dataIndex: "basePrice", render: (v?: number) => (v != null ? `${v}đ` : "—") },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: Course) => (
        <Space>
          <Link to={`/academic/courses/${record.id}`}>
            <Button icon={<EyeOutlined />} size="small">
              Xem
            </Button>
          </Link>
          <Can permissions={["course.manage"]}>
            <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(record)}>
              Sửa
            </Button>
          </Can>
          <Can permissions={["course.manage"]}>
            <Button
              icon={<UsergroupAddOutlined />}
              size="small"
              onClick={() => onGrant(record)}
            >
              Cấp học viên
            </Button>
          </Can>
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={pagination}
      onChange={onChange}
    />
  );
}
