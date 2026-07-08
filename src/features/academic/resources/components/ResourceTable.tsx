import { Button, Space, Table, Tag } from "antd";
import { DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Link } from "react-router-dom";
import { Can } from "../../../../shared/permissions";
import type { Resource, ResourceStatus, ResourceVisibility } from "../../types";

interface ResourceTableProps {
  data: Resource[];
  loading?: boolean;
  pagination: TableProps<Resource>["pagination"];
  onChange: TableProps<Resource>["onChange"];
  onDelete: (resource: Resource) => void;
}

const statusLabels: Record<ResourceStatus, { text: string; color: string }> = {
  pending: { text: "Chờ duyệt", color: "orange" },
  approved: { text: "Đã duyệt", color: "green" },
  rejected: { text: "Từ chối", color: "red" },
};

const visibilityLabels: Record<ResourceVisibility, string> = {
  public: "Công khai",
  enrolled: "Học viên",
  package_only: "Theo gói",
};

export function ResourceTable({ data, loading, pagination, onChange, onDelete }: ResourceTableProps) {
  const columns: TableProps<Resource>["columns"] = [
    { title: "Tên học liệu", dataIndex: "title", sorter: true },
    { title: "Môn", dataIndex: "subjectName" },
    { title: "Loại", dataIndex: "type" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status: ResourceStatus) => {
        const entry =
          statusLabels[status] ??
          statusLabels[status?.toLowerCase?.() as ResourceStatus] ??
          { text: String(status ?? ""), color: "default" };
        return <Tag color={entry.color}>{entry.text}</Tag>;
      },
    },
    {
      title: "Visibility",
      dataIndex: "visibility",
      render: (v: ResourceVisibility) =>
        visibilityLabels[v] ?? visibilityLabels[v?.toLowerCase?.() as ResourceVisibility] ?? String(v ?? ""),
    },
    { title: "Phiên bản", dataIndex: "currentVersion" },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: Resource) => (
        <Space>
          <Link to={`/academic/resources/${record.id}`}>
            <Button icon={<EyeOutlined />} size="small">
              Xem
            </Button>
          </Link>
          <Can permissions={["admin.resource.manage"]}>
            <Button icon={<DeleteOutlined />} danger size="small" onClick={() => onDelete(record)}>
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
