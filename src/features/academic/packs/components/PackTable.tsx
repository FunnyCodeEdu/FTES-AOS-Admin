import { Button, Space, Table, Tag } from "antd";
import { DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Link } from "react-router-dom";
import { Can } from "../../../../shared/permissions";
import type { Pack, PackStatus } from "../../types";

interface PackTableProps {
  data: Pack[];
  loading?: boolean;
  pagination: TableProps<Pack>["pagination"];
  onChange: TableProps<Pack>["onChange"];
  onDelete: (pack: Pack) => void;
}

const statusLabels: Record<PackStatus, { text: string; color: string }> = {
  active: { text: "Hoạt động", color: "green" },
  inactive: { text: "Ngừng", color: "orange" },
  draft: { text: "Nháp", color: "default" },
};

export function PackTable({ data, loading, pagination, onChange, onDelete }: PackTableProps) {
  const columns: TableProps<Pack>["columns"] = [
    { title: "Tên pack", dataIndex: "name", sorter: true },
    { title: "Số item", dataIndex: "itemCount" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status: PackStatus) => {
        const entry =
          statusLabels[status] ??
          statusLabels[status?.toLowerCase?.() as PackStatus] ??
          { text: String(status ?? ""), color: "default" };
        return <Tag color={entry.color}>{entry.text}</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: Pack) => (
        <Space>
          <Link to={`/academic/packs/${record.id}`}>
            <Button icon={<EyeOutlined />} size="small">
              Xem
            </Button>
          </Link>
          <Can permissions={["admin.pack.manage"]}>
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
