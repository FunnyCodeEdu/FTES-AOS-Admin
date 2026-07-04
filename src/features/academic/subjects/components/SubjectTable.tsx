import { Button, Space, Table, Tag } from "antd";
import { DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Link } from "react-router-dom";
import { Can } from "../../../../shared/permissions";
import type { Subject, SubjectStatus } from "../../types";

interface SubjectTableProps {
  data: Subject[];
  loading?: boolean;
  pagination: TableProps<Subject>["pagination"];
  onChange: TableProps<Subject>["onChange"];
  onEdit: (subject: Subject) => void;
  onDelete: (subject: Subject) => void;
}

const statusLabels: Record<SubjectStatus, { text: string; color: string }> = {
  active: { text: "Hoạt động", color: "green" },
  inactive: { text: "Ngừng", color: "orange" },
  draft: { text: "Nháp", color: "default" },
};

export function SubjectTable({ data, loading, pagination, onChange, onEdit, onDelete }: SubjectTableProps) {
  const columns: TableProps<Subject>["columns"] = [
    { title: "Mã môn", dataIndex: "code", sorter: true },
    { title: "Tên môn", dataIndex: "name", sorter: true },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status: SubjectStatus) => {
        const { text, color } = statusLabels[status];
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "Nhân sự",
      render: (_: unknown, record: Subject) =>
        `${record.lecturerIds.length} GV · ${record.moderatorIds.length} Moderator`,
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: Subject) => (
        <Space>
          <Link to={`/academic/subjects/${record.id}`}>
            <Button icon={<EyeOutlined />} size="small">
              Xem
            </Button>
          </Link>
          <Can permissions={["subject.update"]}>
            <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(record)}>
              Sửa
            </Button>
          </Can>
          <Can permissions={["subject.delete"]}>
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
              onClick={() => onDelete(record)}
            >
              Xoá
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
