import { Button, Space, Table, Tag } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Can } from "../../../../shared/permissions";
import type { Campus } from "../types";

interface CampusTableProps {
  data: Campus[];
  loading?: boolean;
  pagination: TableProps<Campus>["pagination"];
  onChange: TableProps<Campus>["onChange"];
  onEdit: (campus: Campus) => void;
  onDelete: (campus: Campus) => void;
}

export function CampusTable({
  data,
  loading,
  pagination,
  onChange,
  onEdit,
  onDelete,
}: CampusTableProps) {
  const columns: TableProps<Campus>["columns"] = [
    { title: "Mã", dataIndex: "code" },
    { title: "Tên cơ sở", dataIndex: "name" },
    {
      title: "Tên (EN)",
      dataIndex: "nameEn",
      render: (nameEn: string | null) => nameEn || "—",
    },
    {
      title: "Khu vực",
      dataIndex: "region",
      render: (region: string | null) => region || "—",
    },
    {
      title: "Trạng thái",
      dataIndex: "active",
      render: (active: boolean) =>
        active ? <Tag color="green">Đang bật</Tag> : <Tag>Tắt</Tag>,
    },
    { title: "Thứ tự", dataIndex: "sortOrder" },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: Campus) => (
        <Can permissions={["community.campus.manage"]}>
          <Space>
            <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(record)}>
              Sửa
            </Button>
            <Button icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record)}>
              Xoá
            </Button>
          </Space>
        </Can>
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
